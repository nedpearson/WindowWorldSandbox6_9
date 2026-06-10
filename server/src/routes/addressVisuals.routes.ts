import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { googlePropertyImageService } from '../services/googlePropertyImage.service.js';

export const addressVisualsRoutes = Router();
addressVisualsRoutes.use(requireAuth);

// GET /api/address-visuals/:appointmentId
addressVisualsRoutes.get('/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.appointmentId as string;
    let visuals = await prisma.addressVisuals.findUnique({
      where: { appointmentId }
    });
    
    // If none exists, create an empty one
    if (!visuals) {
      visuals = await prisma.addressVisuals.create({
        data: {
          appointmentId
        }
      });
    }

    res.json({ success: true, data: visuals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/address-visuals/:appointmentId
addressVisualsRoutes.put('/:appointmentId', async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.appointmentId as string;
    const { 
      provider, 
      selectedPrimaryView, 
      rotationDegrees, 
      confirmedFrontElevation, 
      frontElevationDirection,
      zoom,
      bearingDegrees,
      pitchDegrees
    } = req.body;

    const visuals = await prisma.addressVisuals.upsert({
      where: { appointmentId },
      update: {
        provider: provider ?? undefined,
        selectedPrimaryView: selectedPrimaryView ?? undefined,
        rotationDegrees: rotationDegrees ?? undefined,
        confirmedFrontElevation: confirmedFrontElevation ?? undefined,
        frontElevationDirection: frontElevationDirection ?? undefined,
        zoom: zoom ?? undefined,
        bearingDegrees: bearingDegrees ?? undefined,
        pitchDegrees: pitchDegrees ?? undefined,
      },
      create: {
        appointmentId,
        provider: provider || 'mapbox',
        selectedPrimaryView: selectedPrimaryView || 'map',
        rotationDegrees: rotationDegrees || 0,
        confirmedFrontElevation: confirmedFrontElevation || false,
        frontElevationDirection: frontElevationDirection || null,
        zoom: zoom || 18,
      }
    });

    res.json({ success: true, data: visuals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/address-visuals/:appointmentId/street-view
// Attempts to fetch the street view and save it as a cache proxy
addressVisualsRoutes.post('/:appointmentId/street-view', async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.appointmentId as string;
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }});
    if (!appointment || !appointment.jobAddress) {
      throw new Error('Appointment not found or has no address');
    }
    
    const fullAddress = [appointment.jobAddress, appointment.jobCity, appointment.jobState].filter(Boolean).join(', ');

    // Try to get a street view image specifically
    const svResult = await googlePropertyImageService.getBestPropertyImage(fullAddress);
    
    // We only want it if it's actually street view
    if (svResult.source !== 'street_view') {
      res.json({ success: false, available: false, error: 'Street view not available for this address' });
      return;
    }

    const normAddress = fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cacheRow = await prisma.propertyImageCache.create({
      data: {
        companyId: appointment.companyId || '',
        customerId: appointment.customerId || undefined,
        appointmentId: appointment.id,
        normalizedAddress: normAddress,
        formattedAddress: svResult.formattedAddress,
        lat: svResult.lat || undefined,
        lng: svResult.lng || undefined,
        source: svResult.source,
        imageUrl: svResult.imageUrl
      }
    });

    // Update the AddressVisuals with the snapshot id
    const visuals = await prisma.addressVisuals.upsert({
      where: { appointmentId },
      update: { streetViewSnapshotId: cacheRow.id },
      create: { appointmentId, streetViewSnapshotId: cacheRow.id }
    });

    res.json({ success: true, available: true, snapshotId: cacheRow.id, data: visuals });
  } catch (error: any) {
    console.warn(`[AddressVisuals] Street view failed:`, error.message);
    res.status(200).json({ success: false, available: false, error: error.message }); // 200 so UI doesn't blow up, just shows fallback
  }
});
