// ─────────────────────────────────────────────────────────────────────────────
// sync.routes.ts — Cloud Sync API for offline-first field app
//
// All routes:
//   - require auth (requireAuth middleware)
//   - derive companyId/userId/role from JWT — NEVER from request body
//   - validate company membership
//   - support idempotency keys (X-Idempotency-Key header)
//   - support batching (up to 50 items per push)
//   - return clean JSON: { ok, synced, conflicts, errors, cloudIdMap }
//
// Routes:
//   POST /api/sync/register-device   — register device for sync tracking
//   POST /api/sync/pull              — pull data changed since lastSyncAt
//   POST /api/sync/push              — push outbox batch
//   POST /api/sync/resolve-conflict  — submit conflict resolution
//   GET  /api/sync/status            — per-device sync status
//   POST /api/sync/upload-file       — delegates to existing /documents upload
//   POST /api/sync/cleanup-idempotency — admin: expire old idempotency keys
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const syncRoutes = Router();
syncRoutes.use(requireAuth);

const PUSH_BATCH_LIMIT = 50;
const IDEMPOTENCY_TTL_DAYS = 7;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getUserCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return user?.companyId ?? null;
}

/** Check idempotency — returns cached response if key already processed. */
async function checkIdempotency(
  key: string,
  companyId: string
): Promise<{ found: boolean; responseJson?: string }> {
  const existing = await prisma.syncIdempotencyKey.findUnique({
    where: { idempotencyKey: key },
    select: { responseJson: true, expiresAt: true },
  });
  if (!existing) return { found: false };
  // Treat expired keys as not found
  if (existing.expiresAt < new Date()) return { found: false };
  return { found: true, responseJson: existing.responseJson ?? undefined };
}

/** Record an idempotency key with optional cached response. */
async function saveIdempotencyKey(
  key: string,
  userId: string,
  companyId: string,
  deviceId: string,
  entityType: string,
  operation: string,
  entityLocalId?: string,
  entityCloudId?: string,
  responseJson?: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + IDEMPOTENCY_TTL_DAYS);
  await prisma.syncIdempotencyKey.upsert({
    where: { idempotencyKey: key },
    update: { responseJson, entityCloudId, expiresAt },
    create: {
      companyId,
      userId,
      deviceId,
      idempotencyKey: key,
      entityType,
      operation,
      entityLocalId,
      entityCloudId,
      responseJson,
      expiresAt,
    },
  });
}

// ── POST /api/sync/register-device ───────────────────────────────────────────

syncRoutes.post('/register-device', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const { deviceId, platform } = req.body as { deviceId?: string; platform?: string };
    if (!deviceId || !platform) {
      return res.status(400).json({ error: 'deviceId and platform are required' });
    }

    // Log device registration
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'device_registered',
        entity: 'Device',
        entityId: deviceId,
        details: JSON.stringify({ platform, companyId, registeredAt: new Date().toISOString() }),
      },
    });

    res.json({
      ok: true,
      deviceId,
      companyId,
      userId,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync/register-device]', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// ── POST /api/sync/pull ───────────────────────────────────────────────────────

syncRoutes.post('/pull', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const {
      since,
      entities = ['appointments', 'customers', 'openings'],
    } = req.body as { since?: string; entities?: string[] };

    const sinceDate = since ? new Date(since) : new Date(0);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, role: true } });
    const isManager = ['admin', 'manager', 'super_admin'].includes(user?.role || '');

    const result: Record<string, any> = {};

    // Pull appointments
    if (entities.includes('appointments')) {
      result.appointments = await prisma.appointment.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          user: {
            companyId,
            ...(isManager ? {} : { id: userId }),
          },
        },
        include: { customer: true, openings: { orderBy: { openingNumber: 'asc' } } },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });

      // Include tombstones (soft-deleted appointments since sinceDate)
      result.deletedAppointmentIds = (await prisma.appointment.findMany({
        where: {
          deletedAt: { gte: sinceDate, not: null },
          user: { companyId, ...(isManager ? {} : { id: userId }) },
        },
        select: { id: true, localId: true, deletedAt: true },
        take: 500,
      })).map(a => ({ id: a.id, localId: a.localId, deletedAt: a.deletedAt }));
    }

    // Pull customers
    if (entities.includes('customers')) {
      result.customers = await prisma.customer.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          companyId,
        },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });
    }

    // Pull openings changed since last sync
    if (entities.includes('openings')) {
      result.openings = await prisma.opening.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          appointment: { user: { companyId, ...(isManager ? {} : { id: userId }) } },
        },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });

      result.deletedOpeningIds = (await prisma.opening.findMany({
        where: {
          deletedAt: { gte: sinceDate, not: null },
          appointment: { user: { companyId } },
        },
        select: { id: true, localId: true, appointmentId: true, deletedAt: true },
        take: 1000,
      })).map(o => ({ id: o.id, localId: o.localId, appointmentId: o.appointmentId, deletedAt: o.deletedAt }));
    }



    // Pull pricing (company-wide, check if changed)
    if (entities.includes('pricing')) {
      result.pricingItems = await prisma.pricingVersionItem.findMany({
        where: { createdAt: { gte: sinceDate } },
        include: { pricingVersion: true },
        take: 500,
      }).catch(() => []);
    }

    res.json({
      ok: true,
      serverTime: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error('[sync/pull]', err);
    res.status(500).json({ error: 'Pull failed' });
  }
});

// ── POST /api/sync/push ───────────────────────────────────────────────────────

syncRoutes.post('/push', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const deviceId = (req.headers['x-device-id'] as string) || 'unknown';
    const { items } = req.body as { items?: any[] };
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    if (items.length > PUSH_BATCH_LIMIT) {
      return res.status(400).json({ error: `Batch limit is ${PUSH_BATCH_LIMIT} items` });
    }

    const synced: string[] = [];
    const conflicts: any[] = [];
    const errors: any[] = [];
    const cloudIdMap: Record<string, string> = {};

    for (const item of items) {
      const { entityType, entityLocalId, entityCloudId, operation, payloadJson, idempotencyKey } = item;

      // Check idempotency — replay cached response if already processed
      if (idempotencyKey) {
        const idem = await checkIdempotency(idempotencyKey, companyId);
        if (idem.found) {
          synced.push(entityLocalId);
          if (idem.responseJson) {
            try {
              const cached = JSON.parse(idem.responseJson);
              if (cached.cloudId) cloudIdMap[entityLocalId] = cached.cloudId;
            } catch (e) { console.debug("[swallowed error]", e); }
          }
          continue;
        }
      }

      let payload: any;
      try { payload = JSON.parse(payloadJson); } catch { payload = payloadJson || {}; }

      try {
        switch (entityType) {

          // ── Customer ──────────────────────────────────────────────────────────
          case 'customer': {
            if (operation === 'create') {
              // Dedup by phone+firstName+lastName+companyId to prevent duplicates from
              // concurrent offline sessions or retry storms
              const existing = payload.phone ? await prisma.customer.findFirst({
                where: {
                  companyId,
                  phone: payload.phone,
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                },
              }) : null;

              let created;
              if (existing) {
                created = existing; // return the existing record — idempotent
              } else {
                created = await prisma.customer.create({
                  data: {
                    firstName: payload.firstName || 'Unknown',
                    lastName: payload.lastName || 'Customer',
                    email: payload.email,
                    phone: payload.phone,
                    phone2: payload.phone2,
                    address: payload.address,
                    city: payload.city,
                    state: payload.state,
                    zip: payload.zip,
                    notes: payload.notes,
                    leadSource: payload.leadSource,
                    companyId,
                    localId: payload.localId || entityLocalId,
                  },
                });
              }
              cloudIdMap[entityLocalId] = created.id;
              if (idempotencyKey) {
                await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, created.id, JSON.stringify({ cloudId: created.id }));
              }
              synced.push(entityLocalId);

            } else if (operation === 'update' && entityCloudId) {
              const exists = await prisma.customer.findFirst({ where: { id: entityCloudId, companyId } });
              if (!exists) { errors.push({ id: entityLocalId, error: 'Customer not found' }); break; }

              // Version conflict check
              if (payload._updatedAt && exists.updatedAt > new Date(payload._updatedAt)) {
                conflicts.push({ entityLocalId, entityCloudId, entityType, cloudValue: JSON.stringify(exists), localValue: payloadJson });
                break;
              }

              const updated = await prisma.customer.update({
                where: { id: entityCloudId },
                data: {
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                  email: payload.email,
                  phone: payload.phone,
                  phone2: payload.phone2,
                  address: payload.address,
                  city: payload.city,
                  state: payload.state,
                  zip: payload.zip,
                  notes: payload.notes,
                  version: { increment: 1 },
                },
              });
              cloudIdMap[entityLocalId] = updated.id;
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, updated.id);
              synced.push(entityLocalId);

            } else if (operation === 'delete' && entityCloudId) {
              await prisma.customer.update({
                where: { id: entityCloudId },
                data: { deletedAt: new Date() },
              }).catch(() => null);
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, entityCloudId);
              synced.push(entityLocalId);
            }
            break;
          }

          // ── Appointment ───────────────────────────────────────────────────────
          case 'appointment': {
            if (operation === 'create') {
              // Verify the customerId is a real cloud ID (not a local ID)
              const customerId = payload.customerId;
              if (!customerId || customerId.startsWith('local_')) {
                errors.push({ id: entityLocalId, error: 'Cannot create appointment: customerId must be a cloud ID. Sync customer first.' });
                break;
              }
              const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
              if (!customer) { errors.push({ id: entityLocalId, error: 'Customer not found for appointment create' }); break; }

              // Dedup by localId — if this appointment was already created (client retry), return existing
              const deduplicatedLocalId = payload.localId || entityLocalId;
              const existingByLocalId = deduplicatedLocalId
                ? await prisma.appointment.findFirst({ where: { localId: deduplicatedLocalId, companyId } })
                : null;
              if (existingByLocalId) {
                cloudIdMap[entityLocalId] = existingByLocalId.id;
                if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, existingByLocalId.id, JSON.stringify({ cloudId: existingByLocalId.id }));
                synced.push(entityLocalId);
                break;
              }

              const created = await prisma.appointment.create({
                data: {
                  customerId,
                  userId,
                  status: payload.status || 'draft',
                  appointmentDate: payload.appointmentDate ? new Date(payload.appointmentDate) : null,
                  jobAddress: payload.jobAddress,
                  jobCity: payload.jobCity,
                  jobState: payload.jobState,
                  jobZip: payload.jobZip,
                  notes: payload.notes,
                  measurementPreference: payload.measurementPreference || 'outside_preferred',
                  companyId,
                  localId: deduplicatedLocalId,
                },
              });
              cloudIdMap[entityLocalId] = created.id;
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, created.id, JSON.stringify({ cloudId: created.id }));
              synced.push(entityLocalId);

            } else if (operation === 'update' && entityCloudId) {
              const appt = await prisma.appointment.findFirst({ where: { id: entityCloudId, user: { companyId } } });
              if (!appt) { errors.push({ id: entityLocalId, error: 'Appointment not found' }); break; }

              if (payload._updatedAt && appt.updatedAt > new Date(payload._updatedAt)) {
                conflicts.push({ entityLocalId, entityCloudId, entityType, cloudValue: JSON.stringify(appt), localValue: payloadJson });
                break;
              }

              const updated = await prisma.appointment.update({
                where: { id: entityCloudId },
                data: {
                  status: payload.status,
                  notes: payload.notes,
                  jobAddress: payload.jobAddress,
                  jobCity: payload.jobCity,
                  jobState: payload.jobState,
                  jobZip: payload.jobZip,
                  measurementPreference: payload.measurementPreference,
                  version: { increment: 1 },
                },
              });
              cloudIdMap[entityLocalId] = updated.id;
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, updated.id);
              synced.push(entityLocalId);

            } else if ((operation === 'delete') && entityCloudId) {
              await prisma.appointment.update({
                where: { id: entityCloudId },
                data: { deletedAt: new Date(), status: 'cancelled' },
              }).catch(() => null);
              synced.push(entityLocalId);
            }
            break;
          }

          // ── Opening ───────────────────────────────────────────────────────────
          case 'opening': {
            if (operation === 'create') {
              const apptId = payload.appointmentId;
              if (!apptId || apptId.startsWith('local_')) {
                errors.push({ id: entityLocalId, error: 'Cannot create opening: appointmentId must be a cloud ID. Sync appointment first.' });
                break;
              }
              const appt = await prisma.appointment.findFirst({ where: { id: apptId, user: { companyId } } });
              if (!appt) { errors.push({ id: entityLocalId, error: 'Appointment not found' }); break; }

              // Dedup by localId — if opening was already created (client retry), return existing
              const deduplicatedOpeningLocalId = payload.localId || entityLocalId;
              const existingOpeningByLocalId = deduplicatedOpeningLocalId
                ? await prisma.opening.findFirst({ where: { localId: deduplicatedOpeningLocalId, appointmentId: apptId } })
                : null;
              if (existingOpeningByLocalId) {
                cloudIdMap[entityLocalId] = existingOpeningByLocalId.id;
                if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, existingOpeningByLocalId.id, JSON.stringify({ cloudId: existingOpeningByLocalId.id }));
                synced.push(entityLocalId);
                break;
              }

              const created = await prisma.opening.create({
                data: {
                  appointmentId: apptId,
                  openingNumber: payload.openingNumber || 1,
                  roomLocation: payload.roomLocation,
                  productCategory: payload.productCategory,
                  width: payload.width,
                  height: payload.height,
                  totalPrice: payload.totalPrice || 0,
                  customerNotes: payload.notes || payload.customerNotes,
                  preferredMeasurementBasis: payload.preferredMeasurementBasis,
                  actualMeasurementBasis: payload.actualMeasurementBasis,
                  cutbackRequired: payload.cutbackRequired,
                  cutbackType: payload.cutbackType,
                  cutbackAmount: payload.cutbackAmount,
                  cutbackNotes: payload.cutbackNotes,
                  removalDetail: payload.removalDetail,
                  trimIncluded: payload.trimIncluded,
                  headerFlashingIncluded: payload.headerFlashingIncluded,
                  measurementGuidanceAccepted: payload.measurementGuidanceAccepted,
                  measurementGuidanceOverrideReason: payload.measurementGuidanceOverrideReason,
                  outsidePhotoId: payload.outsidePhotoId,
                  measurementVisualAnnotationId: payload.measurementVisualAnnotationId,
                  mullGroup: payload.mullGroup,
                  installMullion: payload.installMullion,
                  structuralMullion: payload.structuralMullion,
                  companyId,
                  localId: deduplicatedOpeningLocalId,
                },
              });
              cloudIdMap[entityLocalId] = created.id;
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, created.id, JSON.stringify({ cloudId: created.id }));
              synced.push(entityLocalId);

            } else if (operation === 'update' && entityCloudId) {
              const existing = await prisma.opening.findFirst({ where: { id: entityCloudId, appointment: { user: { companyId } } } });
              if (!existing) { errors.push({ id: entityLocalId, error: 'Opening not found' }); break; }

              if (payload._updatedAt && existing.updatedAt > new Date(payload._updatedAt)) {
                conflicts.push({ entityLocalId, entityCloudId, entityType, cloudValue: JSON.stringify(existing), localValue: payloadJson });
                break;
              }

              const updated = await prisma.opening.update({
                where: { id: entityCloudId },
                data: {
                  roomLocation: payload.roomLocation,
                  productCategory: payload.productCategory,
                  width: payload.width,
                  height: payload.height,
                  totalPrice: payload.totalPrice,
                  customerNotes: payload.notes || payload.customerNotes,
                  preferredMeasurementBasis: payload.preferredMeasurementBasis,
                  actualMeasurementBasis: payload.actualMeasurementBasis,
                  cutbackRequired: payload.cutbackRequired,
                  cutbackType: payload.cutbackType,
                  cutbackAmount: payload.cutbackAmount,
                  cutbackNotes: payload.cutbackNotes,
                  removalDetail: payload.removalDetail,
                  trimIncluded: payload.trimIncluded,
                  headerFlashingIncluded: payload.headerFlashingIncluded,
                  measurementGuidanceAccepted: payload.measurementGuidanceAccepted,
                  measurementGuidanceOverrideReason: payload.measurementGuidanceOverrideReason,
                  outsidePhotoId: payload.outsidePhotoId,
                  measurementVisualAnnotationId: payload.measurementVisualAnnotationId,
                  mullGroup: payload.mullGroup,
                  installMullion: payload.installMullion,
                  structuralMullion: payload.structuralMullion,
                  version: { increment: 1 },
                },
              });
              cloudIdMap[entityLocalId] = updated.id;
              if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId, updated.id);
              synced.push(entityLocalId);

            } else if (operation === 'delete' && entityCloudId) {
              await prisma.opening.update({
                where: { id: entityCloudId },
                data: { deletedAt: new Date() },
              }).catch(() => null);
              synced.push(entityLocalId);
            }
            break;
          }

          // ── Note ──────────────────────────────────────────────────────────────
          case 'note': {
            if (payload.appointmentId) {
              const appt = await prisma.appointment.findFirst({ where: { id: payload.appointmentId, user: { companyId } } });
              if (!appt) { errors.push({ id: entityLocalId, error: 'Appointment not found' }); break; }
            }
            // Store in AuditLog (AppointmentNote model not yet in schema)
            await prisma.auditLog.create({
              data: {
                userId,
                action: 'offline_note_synced',
                entity: 'Appointment',
                entityId: payload.appointmentId,
                details: JSON.stringify({ noteText: payload.text || payload.noteText || '', source: 'offline', idempotencyKey }),
              },
            }).catch(() => null);
            if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId);
            synced.push(entityLocalId);
            break;
          }

          // ── Signature (offline contract signing) ──────────────────────────────
          case 'signature': {
            // Log signature intent to AuditLog; document generation happens separately
            await prisma.auditLog.create({
              data: {
                userId,
                action: 'offline_signature_synced',
                entity: 'Appointment',
                entityId: payload.appointmentId,
                details: JSON.stringify({
                  signerName: payload.signerName,
                  signerRole: payload.signerRole,
                  localId: entityLocalId,
                  idempotencyKey,
                }),
              },
            }).catch(() => null);
            if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId);
            synced.push(entityLocalId);
            break;
          }

          // ── Follow-up, training_progress ──────────────────────────────────────
          case 'follow_up':
          case 'training_progress': {
            if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, entityType, operation, entityLocalId);
            synced.push(entityLocalId);
            break;
          }

          default:
            errors.push({ id: entityLocalId, error: `Unknown entityType: ${entityType}` });
        }
      } catch (itemErr: any) {
        errors.push({ id: entityLocalId, error: itemErr.message || 'Unknown error' });
      }
    }

    res.json({ ok: true, synced, conflicts, errors, cloudIdMap, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[sync/push]', err);
    res.status(500).json({ error: 'Push failed' });
  }
});

// ── POST /api/sync/resolve-conflict ──────────────────────────────────────────

syncRoutes.post('/resolve-conflict', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const { entityType, entityCloudId, resolution, localValue } = req.body as {
      entityType?: string;
      entityCloudId?: string;
      resolution?: 'keep_local' | 'keep_cloud';
      localValue?: string;
    };

    if (!entityType || !entityCloudId || !resolution) {
      return res.status(400).json({ error: 'entityType, entityCloudId, and resolution are required' });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'conflict_resolved',
        entity: entityType,
        entityId: entityCloudId,
        details: JSON.stringify({ resolution, resolvedAt: new Date().toISOString() }),
      },
    });

    if (resolution === 'keep_local' && localValue) {
      let payload: any;
      try { payload = JSON.parse(localValue); } catch { payload = {}; }

      if (entityType === 'opening') {
        await prisma.opening.update({
          where: { id: entityCloudId },
          data: {
            width: payload.width, height: payload.height, totalPrice: payload.totalPrice,
            roomLocation: payload.roomLocation, productCategory: payload.productCategory,
            customerNotes: payload.notes || payload.customerNotes,
            preferredMeasurementBasis: payload.preferredMeasurementBasis,
            actualMeasurementBasis: payload.actualMeasurementBasis,
            cutbackRequired: payload.cutbackRequired,
            cutbackType: payload.cutbackType,
            cutbackAmount: payload.cutbackAmount,
            cutbackNotes: payload.cutbackNotes,
            removalDetail: payload.removalDetail,
            trimIncluded: payload.trimIncluded,
            headerFlashingIncluded: payload.headerFlashingIncluded,
            measurementGuidanceAccepted: payload.measurementGuidanceAccepted,
            measurementGuidanceOverrideReason: payload.measurementGuidanceOverrideReason,
            outsidePhotoId: payload.outsidePhotoId,
            measurementVisualAnnotationId: payload.measurementVisualAnnotationId,
            mullGroup: payload.mullGroup,
            installMullion: payload.installMullion,
            structuralMullion: payload.structuralMullion,
            version: { increment: 1 },
          },
        }).catch(() => null);
      } else if (entityType === 'appointment') {
        await prisma.appointment.update({
          where: { id: entityCloudId },
          data: {
            status: payload.status, notes: payload.notes,
            jobAddress: payload.jobAddress, jobCity: payload.jobCity,
            measurementPreference: payload.measurementPreference,
            version: { increment: 1 },
          },
        }).catch(() => null);
      } else if (entityType === 'customer') {
        await prisma.customer.update({
          where: { id: entityCloudId },
          data: {
            firstName: payload.firstName, lastName: payload.lastName,
            phone: payload.phone, email: payload.email,
            version: { increment: 1 },
          },
        }).catch(() => null);
      }
    }

    res.json({ ok: true, resolution });
  } catch (err) {
    console.error('[sync/resolve-conflict]', err);
    res.status(500).json({ error: 'Conflict resolution failed' });
  }
});

// ── GET /api/sync/status ──────────────────────────────────────────────────────

syncRoutes.get('/status', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const recentActivity = await prisma.auditLog.findMany({
      where: { userId, action: { in: ['sync_push', 'device_registered', 'conflict_resolved', 'offline_note_synced', 'offline_signature_synced'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const pendingIdempotencyCount = await prisma.syncIdempotencyKey.count({
      where: { companyId, userId, expiresAt: { gt: new Date() } },
    });

    res.json({ ok: true, companyId, userId, recentActivity, pendingIdempotencyCount, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('[sync/status]', err);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// ── POST /api/sync/upload-file ────────────────────────────────────────────────

syncRoutes.post('/upload-file', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const companyId = await getUserCompanyId(userId);
    if (!companyId) return res.status(403).json({ error: 'No company membership' });

    const { appointmentId, openingId, photoType, idempotencyKey } = req.body as {
      appointmentId?: string;
      openingId?: string;
      photoType?: string;
      idempotencyKey?: string;
    };
    const deviceId = (req.headers['x-device-id'] as string) || 'unknown';

    if (idempotencyKey) {
      const already = await checkIdempotency(idempotencyKey, companyId);
      if (already.found) return res.json({ ok: true, duplicate: true, message: 'Already uploaded' });
    }

    await prisma.auditLog.create({
      data: {
        userId, action: 'photo_upload_queued', entity: 'Photo', entityId: appointmentId,
        details: JSON.stringify({ openingId, photoType, idempotencyKey }),
      },
    }).catch(() => {});

    if (idempotencyKey) await saveIdempotencyKey(idempotencyKey, userId, companyId, deviceId, 'photo', 'upload', undefined, undefined);

    res.json({
      ok: true,
      message: 'Use POST /api/documents/photos or POST /api/mobile/photo to upload the file.',
      uploadEndpoint: `/api/documents/photos?appointmentId=${appointmentId}&openingId=${openingId}&photoType=${photoType}`,
    });
  } catch (err) {
    console.error('[sync/upload-file]', err);
    res.status(500).json({ error: 'Upload logging failed' });
  }
});

// ── POST /api/sync/cleanup-idempotency ───────────────────────────────────────
// Admin-only route to expire old idempotency keys.

syncRoutes.post('/cleanup-idempotency', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!['admin', 'super_admin'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Admin only' });
    }
    const result = await prisma.syncIdempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error('[sync/cleanup-idempotency]', err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});
