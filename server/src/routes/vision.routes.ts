import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

/**
 * Vision — read a tape-measure value from a photo (Gemini vision).
 * Fixes the previously-missing POST /api/vision/tape-read that the field app
 * (apps/web/src/utils/tapePhotoReader.ts) calls. The client already falls back
 * to manual entry on any non-OK response, so this route is safe to add.
 *
 * Mount in server/src/index.ts:
 *   import { visionRoutes } from './routes/vision.routes.js';
 *   app.use('/api/vision', visionRoutes);
 *
 * Requires env GEMINI_API_KEY (same key photoMeasurementAnalysis.service.ts uses).
 */

export const visionRoutes = Router();
visionRoutes.use(requireAuth);

interface TapeResult {
  detectedText: string;
  confidence: number;
  candidates: string[];
  source: 'vision_api' | 'manual_required';
}

const MANUAL: TapeResult = { detectedText: '', confidence: 0, candidates: [], source: 'manual_required' };

visionRoutes.post('/tape-read', async (req, res) => {
  try {
    const { photoDataUrl, measurementType } = req.body as { photoDataUrl?: string; measurementType?: string };
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey || !photoDataUrl || !photoDataUrl.startsWith('data:image')) {
      return res.json(MANUAL);
    }

    const mimeMatch = photoDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');

    const prompt =
      `You are reading a measuring tape in this photo for a window ${measurementType || 'measurement'}. ` +
      `Identify the exact measurement the tape is indicating. ` +
      `Respond with STRICT JSON only, no prose: ` +
      `{"reading":"<value e.g. 35 3/8 or 35.5 or 71 1/2>","confidence":<number 0..1>,"candidates":["<other plausible readings>"]}. ` +
      `If no tape or measurement is clearly visible, use "reading":"" and "confidence":0.`;

    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
        }),
      },
    );

    if (!gRes.ok) return res.json(MANUAL);
    const data: any = await gRes.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json(MANUAL);

    const parsed = JSON.parse(jsonMatch[0]);
    const reading = String(parsed.reading ?? '').trim();
    const confidence = Number(parsed.confidence) || 0;
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates.map((c: any) => String(c)) : [];

    if (!reading) return res.json(MANUAL);
    return res.json({ detectedText: reading, confidence, candidates, source: 'vision_api' } as TapeResult);
  } catch (err) {
    console.debug('[vision/tape-read] failed, falling back to manual', err);
    return res.json(MANUAL);
  }
});
