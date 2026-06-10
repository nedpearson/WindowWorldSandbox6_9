import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const voiceRoutes = Router();
voiceRoutes.use(requireAuth);

// Create voice session — userId MUST come from JWT, not request body
voiceRoutes.post('/sessions', async (req: any, res) => {
  try {
    const userId = req.user!.userId;  // always from JWT
    const { appointmentId, status } = req.body;
    const session = await prisma.voiceSession.create({
      data: {
        userId,                        // JWT-authenticated, not client-supplied
        appointmentId: appointmentId ?? null,
        status: status ?? 'recording',
      },
    });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create voice session', details: err.message });
  }
});

// Get session with transcripts and entities
voiceRoutes.get('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.voiceSession.findUnique({
      where: { id: req.params.id },
      include: { transcripts: true, entities: { orderBy: { openingNumber: 'asc' } } }
    });
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get all sessions for an appointment (for source tracking)
voiceRoutes.get('/sessions/appointment/:appointmentId', async (req, res) => {
  try {
    const sessions = await prisma.voiceSession.findMany({
      where: { appointmentId: req.params.appointmentId },
      include: { transcripts: true, entities: { orderBy: { openingNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (err) {
    res.json([]);
  }
});

// Save transcript — whitelist fields, do not pass req.body directly
voiceRoutes.post('/transcripts', async (req, res) => {
  try {
    const { voiceSessionId, rawText, provider, confidence } = req.body;
    if (!voiceSessionId || !rawText) {
      return res.status(400).json({ error: 'voiceSessionId and rawText are required' });
    }
    const transcript = await prisma.voiceTranscript.create({
      data: {
        voiceSessionId,
        rawText,
        provider: provider ?? 'web_speech',
        confidence: typeof confidence === 'number' ? confidence : 0.85,
      },
    });
    res.status(201).json(transcript);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Parse transcript into entities (server-side NLP)
voiceRoutes.post('/parse', async (req, res) => {
  try {
    const { voiceSessionId, text } = req.body;
    const entities = parseVoiceText(text);
    const created = [];
    for (const e of entities) {
      const entity = await prisma.voiceExtractedEntity.create({
        data: { voiceSessionId, ...e }
      });
      created.push(entity);
    }
    await prisma.voiceSession.update({ where: { id: voiceSessionId }, data: { status: 'parsed' } });
    res.json({ entities: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Parse failed', details: err.message });
  }
});

// Apply entities to appointment
voiceRoutes.post('/apply/:sessionId', async (req, res) => {
  try {
    const session = await prisma.voiceSession.findUnique({
      where: { id: req.params.sessionId },
      include: { entities: { where: { status: 'accepted' } } }
    });
    if (!session || !session.appointmentId) return res.status(400).json({ error: 'No appointment linked' });

    console.log(`[Voice Apply] Session ${session.id} — ${session.entities.length} accepted entities`);

    // Field type definitions for Opening model
    const BOOL_FIELDS = new Set(['foamEnhanced', 'sillRepair', 'nailFin', 'oriel', 'horizontalRR', 'argon', 'needsVerification']);
    const FLOAT_FIELDS = new Set(['width', 'height', 'unitedInches', 'basePrice', 'optionsPrice', 'laborPrice', 'totalPrice', 'radius', 'customRadius', 'legHeight']);
    const INT_FIELDS = new Set(['floorNumber', 'quantity', 'openingNumber']);
    const STRING_FIELDS = new Set([
      'roomLocation', 'elevation', 'productCategory', 'productModel', 'seriesModel',
      'interiorColor', 'exteriorColor', 'gridStyle', 'gridPattern', 'glassPackage',
      'temperedGlass', 'obscureGlass', 'lowEPackage', 'screenOption', 'hinge',
      'exteriorType', 'trimType', 'trimNotes', 'removalType', 'installType',
      'installNotes', 'customerNotes', 'installerNotes', 'specialtyNotes', 'pricingStatus'
    ]);
    const ALL_OPENING_FIELDS = new Set([...BOOL_FIELDS, ...FLOAT_FIELDS, ...INT_FIELDS, ...STRING_FIELDS]);

    // Cast a value to the correct type for the Opening schema
    function castField(fieldName: string, rawValue: string): any {
      if (BOOL_FIELDS.has(fieldName)) return rawValue === 'true' || rawValue === '1' || rawValue === 'yes';
      if (FLOAT_FIELDS.has(fieldName)) return parseFloat(rawValue) || 0;
      if (INT_FIELDS.has(fieldName)) return parseInt(rawValue) || 1;
      return rawValue; // string
    }

    // Group entities by type
    const customerFields: Record<string, string> = {};
    const openingMap: Record<number, Record<string, any>> = {};

    for (const e of session.entities) {
      if (e.entityType === 'customer') {
        customerFields[e.fieldName] = e.fieldValue;
      } else if (e.entityType === 'opening' || e.entityType === 'measurement' || e.entityType === 'option') {
        const num = e.openingNumber || 1;
        if (!openingMap[num]) openingMap[num] = {};
        // Only include valid Opening fields, properly typed
        if (ALL_OPENING_FIELDS.has(e.fieldName)) {
          openingMap[num][e.fieldName] = castField(e.fieldName, e.fieldValue);
        } else {
          console.log(`[Voice Apply] Skipping unknown field: ${e.fieldName} = ${e.fieldValue}`);
        }
      }
    }

    // Apply customer fields
    let appliedCustomer = 0;
    if (Object.keys(customerFields).length > 0) {
      const appt = await prisma.appointment.findUnique({ where: { id: session.appointmentId } });
      if (appt) {
        try {
          await prisma.customer.update({ where: { id: appt.customerId }, data: customerFields });
          appliedCustomer = Object.keys(customerFields).length;
          console.log(`[Voice Apply] Updated customer ${appt.customerId}: ${JSON.stringify(customerFields)}`);
        } catch (ce: any) {
          console.error(`[Voice Apply] Customer update failed:`, ce.message);
        }
      }
    }

    // Apply opening fields
    const appliedOpenings: { openingNumber: number; action: string; fields: string[] }[] = [];
    for (const [numStr, fields] of Object.entries(openingMap)) {
      const num = Number(numStr);
      const width = fields.width ?? 0;
      const height = fields.height ?? 0;
      // Always compute unitedInches if we have dimensions
      if (fields.width || fields.height) {
        fields.unitedInches = (fields.width || 0) + (fields.height || 0);
      }

      try {
        const existing = await prisma.opening.findFirst({
          where: { appointmentId: session.appointmentId, openingNumber: num }
        });
        if (existing) {
          // Merge: use new values for provided fields, keep existing for others
          const mergedWidth = fields.width ?? existing.width ?? 0;
          const mergedHeight = fields.height ?? existing.height ?? 0;
          if (fields.width || fields.height) {
            fields.unitedInches = mergedWidth + mergedHeight;
          }
          await prisma.opening.update({ where: { id: existing.id }, data: fields });
          appliedOpenings.push({ openingNumber: num, action: 'updated', fields: Object.keys(fields) });
          console.log(`[Voice Apply] Updated opening #${num}: ${JSON.stringify(fields)}`);
        } else {
          await prisma.opening.create({
            data: {
              appointmentId: session.appointmentId,
              openingNumber: num,
              quantity: 1,
              ...fields
            }
          });
          appliedOpenings.push({ openingNumber: num, action: 'created', fields: Object.keys(fields) });
          console.log(`[Voice Apply] Created opening #${num}: ${JSON.stringify(fields)}`);
        }
      } catch (oe: any) {
        console.error(`[Voice Apply] Opening #${num} failed:`, oe.message);
        appliedOpenings.push({ openingNumber: num, action: 'error', fields: [oe.message] });
      }
    }

    await prisma.voiceSession.update({ where: { id: session.id }, data: { status: 'applied' } });
    res.json({
      success: true,
      appliedCustomerFields: appliedCustomer,
      appliedOpenings: appliedOpenings.filter(o => o.action !== 'error').length,
      details: appliedOpenings
    });
  } catch (err: any) {
    console.error(`[Voice Apply] Fatal error:`, err.message);
    res.status(500).json({ error: 'Apply failed', details: err.message });
  }
});

// Update entity status — whitelist: only allow status and fieldValue changes, not userId/sessionId overrides
voiceRoutes.put('/entities/:id', async (req, res) => {
  try {
    const { status, fieldValue, fieldName, confidence } = req.body;
    const entity = await prisma.voiceExtractedEntity.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(fieldValue !== undefined && { fieldValue }),
        ...(fieldName !== undefined && { fieldName }),
        ...(confidence !== undefined && { confidence }),
      },
    });
    res.json(entity);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Accept all entities in a session
voiceRoutes.post('/sessions/:id/accept-all', async (req, res) => {
  try {
    await prisma.voiceExtractedEntity.updateMany({
      where: { voiceSessionId: req.params.id, status: 'pending' },
      data: { status: 'accepted' }
    });
    await prisma.voiceSession.update({ where: { id: req.params.id }, data: { status: 'reviewed' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Voice text parser (enhanced for natural speech) ──────
function parseVoiceText(text: string) {
  const entities: any[] = [];
  const lower = text.toLowerCase();

  // Customer name
  const nameMatch = lower.match(/customer(?:\s+is)?\s+(\w+)\s+(\w+)/);
  if (nameMatch) {
    entities.push({ entityType: 'customer', fieldName: 'firstName', fieldValue: cap(nameMatch[1]), confidence: 0.9, status: 'pending' });
    entities.push({ entityType: 'customer', fieldName: 'lastName', fieldValue: cap(nameMatch[2]), confidence: 0.9, status: 'pending' });
  }

  // Address
  const addrMatch = lower.match(/(?:at|address)\s+([\d]+\s+[\w\s]+(?:street|st|drive|dr|road|rd|avenue|ave|boulevard|blvd|lane|ln|court|ct|way|circle|place|pl))/i);
  if (addrMatch) {
    entities.push({ entityType: 'customer', fieldName: 'address', fieldValue: cap(addrMatch[1]), confidence: 0.8, status: 'pending' });
  }

  // Pre-scan for "W by H" or "W x H" dimension pairs anywhere
  const dimFrac = /(\d+(?:\s+\d+\/\d+)?)\s*(?:by|x|×|,)\s*(\d+(?:\s+\d+\/\d+)?)/gi;
  const dimMatches: { width: number; height: number; index: number }[] = [];
  let dm;
  while ((dm = dimFrac.exec(lower)) !== null) {
    dimMatches.push({ width: evalFrac(dm[1]), height: evalFrac(dm[2]), index: dm.index });
  }

  // Parse "window N" or "opening N" blocks
  const openingPattern = /(?:(?:front|rear|back|left|right|garage)\s+)?(?:window|opening|door)\s+(?:number\s+)?(\w+)\s+(?:is\s+)?(?:a\s+)?([\s\S]*?)(?=(?:(?:front|rear|back|left|right|garage)\s+)?(?:window|opening|door)\s+(?:number\s+)?\w+|$)/gi;
  let match;
  const parsedOpenings = new Set<number>();
  while ((match = openingPattern.exec(lower)) !== null) {
    const num = wordToNum(match[1]);
    const details = match[2];
    if (!num || num > 50) continue;
    parsedOpenings.add(num);

    const elevMatch = match[0].match(/^(front|rear|back|left|right|garage)/);
    if (elevMatch) {
      entities.push({ entityType: 'opening', fieldName: 'elevation', fieldValue: elevMatch[1] === 'back' ? 'rear' : elevMatch[1], openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    for (const [keyword, value] of Object.entries(PRODUCTS)) {
      if (details.includes(keyword)) {
        entities.push({ entityType: 'opening', fieldName: 'productCategory', fieldValue: value, openingNumber: num, confidence: 0.9, status: 'pending' });
        break;
      }
    }

    // Dimensions: "35 3/8 by 59 7/8" or "35 x 60"
    const detailDim = details.match(/(\d+(?:\s+\d+\/\d+)?)\s*(?:by|x|×|,)\s*(\d+(?:\s+\d+\/\d+)?)/);
    if (detailDim) {
      entities.push({ entityType: 'measurement', fieldName: 'width', fieldValue: String(evalFrac(detailDim[1])), openingNumber: num, confidence: 0.9, status: 'pending' });
      entities.push({ entityType: 'measurement', fieldName: 'height', fieldValue: String(evalFrac(detailDim[2])), openingNumber: num, confidence: 0.9, status: 'pending' });
    }

    for (const [keyword, value] of Object.entries(ROOMS)) {
      if (details.includes(keyword)) {
        entities.push({ entityType: 'opening', fieldName: 'roomLocation', fieldValue: value, openingNumber: num, confidence: 0.85, status: 'pending' });
        break;
      }
    }

    if (details.match(/(?:second|2nd)\s*floor|upstairs/)) {
      entities.push({ entityType: 'opening', fieldName: 'floorNumber', fieldValue: '2', openingNumber: num, confidence: 0.9, status: 'pending' });
    }

    const colors = ['white', 'almond', 'clay', 'bronze', 'black', 'beige', 'tan'];
    for (const c of colors) {
      if (details.includes(c + ' interior')) entities.push({ entityType: 'option', fieldName: 'interiorColor', fieldValue: cap(c), openingNumber: num, confidence: 0.85, status: 'pending' });
      if (details.includes(c + ' exterior')) entities.push({ entityType: 'option', fieldName: 'exteriorColor', fieldValue: cap(c), openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    for (const [k, v] of Object.entries({ colonial: 'Colonial', prairie: 'Prairie', diamond: 'Diamond', perimeter: 'Perimeter' })) {
      if (details.includes(k)) entities.push({ entityType: 'option', fieldName: 'gridStyle', fieldValue: v, openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    if (details.includes('tempered')) entities.push({ entityType: 'option', fieldName: 'temperedGlass', fieldValue: 'full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('obscure')) entities.push({ entityType: 'option', fieldName: 'obscureGlass', fieldValue: 'full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('full screen')) entities.push({ entityType: 'option', fieldName: 'screenOption', fieldValue: 'Full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('foam')) entities.push({ entityType: 'option', fieldName: 'foamEnhanced', fieldValue: 'true', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('ladder')) entities.push({ entityType: 'opening', fieldName: 'installNotes', fieldValue: 'Ladder required', openingNumber: num, confidence: 0.8, status: 'pending' });
    if (details.includes('remove') && (details.includes('aluminum') || details.includes('vinyl'))) entities.push({ entityType: 'opening', fieldName: 'removalType', fieldValue: 'full_tearout', openingNumber: num, confidence: 0.8, status: 'pending' });
  }

  // Fallback: dims found but no "window N" pattern
  if (parsedOpenings.size === 0 && dimMatches.length > 0) {
    dimMatches.forEach((dm, idx) => {
      const num = idx + 1;
      entities.push({ entityType: 'measurement', fieldName: 'width', fieldValue: String(dm.width), openingNumber: num, confidence: 0.85, status: 'pending' });
      entities.push({ entityType: 'measurement', fieldName: 'height', fieldValue: String(dm.height), openingNumber: num, confidence: 0.85, status: 'pending' });
    });
  }

  // Fallback: room + product without "window N"
  if (parsedOpenings.size === 0) {
    const roomProd = /(living room|kitchen|bedroom|master bedroom|bathroom|master bath|dining room|foyer|garage|den|office)\s+(double hung|picture|slider|casement|patio door|sliding door|awning)/gi;
    let rm;
    let n = 1;
    while ((rm = roomProd.exec(lower)) !== null) {
      entities.push({ entityType: 'opening', fieldName: 'roomLocation', fieldValue: cap(rm[1]), openingNumber: n, confidence: 0.75, status: 'pending' });
      entities.push({ entityType: 'opening', fieldName: 'productCategory', fieldValue: PRODUCTS[rm[2].toLowerCase()] || rm[2], openingNumber: n, confidence: 0.8, status: 'pending' });
      n++;
    }
  }

  return entities;
}

const PRODUCTS: Record<string, string> = {
  'double hung': 'double_hung', 'single hung': 'single_hung', 'picture': 'picture', 'slider': 'slider',
  'casement': 'casement', 'awning': 'awning', 'patio door': 'patio_door', 'sliding door': 'patio_door',
  'circle top': 'circle_top', 'eyebrow': 'eyebrow', 'quarter arch': 'quarter_arch', 'bay': 'bay', 'bow': 'bow',
};

const ROOMS: Record<string, string> = {
  'master bedroom': 'Master Bedroom', 'master bath': 'Master Bath', 'living room': 'Living Room',
  'dining room': 'Dining Room', 'front bedroom': 'Front Bedroom', 'back bedroom': 'Back Bedroom',
  'kitchen': 'Kitchen', 'bedroom': 'Bedroom', 'bathroom': 'Bathroom', 'foyer': 'Foyer',
  'garage': 'Garage', 'laundry': 'Laundry', 'den': 'Den', 'office': 'Office', 'hallway': 'Hallway',
};

function evalFrac(s: string): number {
  const parts = s.trim().split(/\s+/);
  let total = 0;
  for (const p of parts) {
    if (p.includes('/')) { const [n, d] = p.split('/'); total += parseInt(n) / parseInt(d); }
    else total += parseFloat(p) || 0;
  }
  return Math.round(total * 1000) / 1000;
}

function wordToNum(w: string): number | null {
  const nums: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, first: 1, second: 2, third: 3,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    '11': 11, '12': 12, '13': 13, '14': 14, '15': 15, '16': 16, '17': 17, '18': 18, '19': 19, '20': 20,
  };
  return nums[w.toLowerCase()] ?? null;
}

function cap(s: string): string { return s.replace(/\b\w/g, c => c.toUpperCase()); }


