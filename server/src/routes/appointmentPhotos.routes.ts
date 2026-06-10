import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { uploadFile, deleteFile, BUCKETS } from '../services/storageService.js';
import crypto from 'crypto';

const router = Router();

// GET /api/appointments/:id/photos
router.get('/:id/photos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;

    // Verify access
    const appt = await prisma.appointment.findFirst({
      where: { 
        id,
        ...(requestingUser.companyId && { companyId: requestingUser.companyId })
      }
    });

    if (!appt) {
      res.status(404).json({ error: 'Appointment not found or access denied' });
      return;
    }

    const photos = await prisma.appointmentPhoto.findMany({
      where: { appointmentId: id as string },
      orderBy: { createdAt: 'desc' }
    });

    res.json(photos);
  } catch (error) {
    console.error('[AppointmentPhotos] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment photos' });
  }
});

// POST /api/appointments/:id/photos
router.post('/:id/photos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoType, description, fileData, fileName } = req.body;
    const requestingUser = (req as any).user;

    if (!fileData) {
      res.status(400).json({ error: 'Missing fileData (base64 string)' });
      return;
    }

    const appt = await prisma.appointment.findFirst({
      where: { 
        id,
        ...(requestingUser.companyId && { companyId: requestingUser.companyId })
      }
    });

    if (!appt) {
      res.status(404).json({ error: 'Appointment not found or access denied' });
      return;
    }

    // Determine mime type and generate path
    const isPng = fileData.startsWith('data:image/png');
    const extension = isPng ? 'png' : 'jpg';
    const cleanFileName = (fileName || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileUuid = crypto.randomUUID();
    const bucket = BUCKETS.OPENING_PHOTOS;
    const storagePath = `${appt.companyId || 'default'}/${appt.id}/${cleanFileName}_${fileUuid}.${extension}`;

    // Strip prefix from base64
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');

    // Upload to Supabase Storage
    const { path, error } = await uploadFile(bucket, storagePath, base64Data, isPng ? 'image/png' : 'image/jpeg');

    if (error || !path) {
      throw new Error('Upload to storage failed');
    }

    const { getSignedUrl } = await import('../services/storageService.js');
    const publicUrl = await getSignedUrl(bucket, path);

    // Save to database
    const newPhoto = await prisma.appointmentPhoto.create({
      data: {
        appointmentId: appt.id,
        companyId: appt.companyId,
        customerId: appt.customerId,
        photoUrl: publicUrl || '',
        storagePath: storagePath,
        photoType: photoType || 'general',
        description: description || null,
        uploadedBy: requestingUser.name || requestingUser.email
      }
    });

    res.json(newPhoto);
  } catch (error) {
    console.error('[AppointmentPhotos] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// DELETE /api/appointments/:id/photos/:photoId
router.delete('/:id/photos/:photoId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, photoId } = req.params;
    const requestingUser = (req as any).user;

    const photo = await prisma.appointmentPhoto.findFirst({
      where: { 
        id: photoId, 
        appointmentId: id,
        ...(requestingUser.companyId && { companyId: requestingUser.companyId })
      }
    });

    if (!photo) {
      res.status(404).json({ error: 'Photo not found or access denied' });
      return;
    }

    // Delete from Supabase Storage
    if (photo.storagePath) {
      await deleteFile(BUCKETS.OPENING_PHOTOS, photo.storagePath);
    }

    // Delete from DB
    await prisma.appointmentPhoto.delete({
      where: { id: photo.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[AppointmentPhotos] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
