import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

export const paperFormRoutes = Router();
paperFormRoutes.use(requireAuth);

paperFormRoutes.post('/:appointmentId/paper-form', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const data = req.body;
    const userId = (req as any).user?.userId;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId }
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Update appointment scalar data
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        poNumber: data.poNumber || appointment.poNumber,
        notes: data.notes || appointment.notes,
        // we can add other fields as needed
      }
    });

    // We also need to save the openings as Opening records
    // Clear existing openings and re-create them based on the paper form
    await prisma.opening.deleteMany({
      where: { appointmentId }
    });

    if (data.openings && Array.isArray(data.openings)) {
      const validOpenings = data.openings.filter((o: any) => o.qty > 0 || o.model);
      if (validOpenings.length > 0) {
        await prisma.opening.createMany({
          data: validOpenings.map((o: any, index: number) => ({
            appointmentId,
            openingNumber: parseInt(o.windowNumber) || (index + 1),
            quantity: parseInt(o.qty) || 1,
            productCategory: o.model || '',
            seriesModel: o.model || '',
            width: parseFloat(o.width) || null,
            height: parseFloat(o.height) || null,
            interiorColor: o.intColor || '',
            exteriorColor: o.extColor || '',
            gridPattern: o.gridPattern || (o.gridFull ? 'Full' : ''),
            gridStyle: o.gridStyle || '',
            glassPackage: o.glassOption || '',
            exteriorSurface: o.typeExt || '',
            foamEnhanced: !!o.foamEnhanced,
            nailFin: !!o.nailFin,
            temperedGlass: o.tempFull ? 'full' : (o.tempS || o.tempU ? 'half' : null),
            obscureGlass: o.typeFill ? 'full' : (o.typeHalf ? 'half' : null),
            hinge: o.hinge || '',
            sillRepair: !!o.sill,
            exteriorType: o.typeExt || '',
            trimType: o.typeInt || '',
            removalType: o.rmvInst || '',
            // Map other fields back to Opening as best as we can
          }))
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving paper form:', error);
    res.status(500).json({ error: 'Failed to save paper form', detail: error.message });
  }
});
