/**
 * AI Visualizer Service
 * Generates upgrade previews on customer house photos using Gemini's image generation.
 * Falls back to a controlled SVG-overlay approach when AI is unavailable.
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

let genAi: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (err) {
  console.warn('AI Visualizer: Gemini not configured, using overlay fallback.', err);
}

// ── Product option catalogs ──────────────────────────────────────────
export const VISUALIZER_CATALOG = {
  windowFrameColors: [
    { id: 'white', label: 'White', hex: '#ffffff' },
    { id: 'almond', label: 'Almond', hex: '#f5e6d3' },
    { id: 'clay', label: 'Clay', hex: '#c4a882' },
    { id: 'tan', label: 'Tan', hex: '#d2b48c' },
    { id: 'black', label: 'Black', hex: '#2d2d2d' },
    { id: 'bronze', label: 'Bronze', hex: '#4a3f35' },
  ],
  gridPatterns: [
    { id: 'none', label: 'No Grids' },
    { id: 'colonial', label: 'Colonial' },
    { id: 'prairie', label: 'Prairie' },
    { id: 'perimeter', label: 'Perimeter' },
    { id: 'diamond', label: 'Diamond' },
    { id: 'craftsman', label: 'Craftsman' },
    { id: 'farmhouse', label: 'Farmhouse' },
    { id: 'contoured', label: 'Contoured' },
    { id: 'flat', label: 'Flat' },
  ],
  gridProfiles: [
    { id: 'flat', label: 'Flat' },
    { id: 'contoured', label: 'Contoured' },
    { id: 'sdl', label: 'SDL (Simulated Divided Lite)' },
    { id: 'gbg', label: 'GBG (Grids Between Glass)' },
  ],
  gridPlacements: [
    { id: 'both', label: 'Both Sashes' },
    { id: 'top_only', label: 'Top Sash Only' },
    { id: 'bottom_only', label: 'Bottom Sash Only' },
  ],
  glassPackages: [
    { id: 'clear', label: 'Clear Glass' },
    { id: 'low_e', label: 'Low-E Glass' },
    { id: 'solarzone_le', label: 'SolarZone Low-E' },
    { id: 'solarzone_lee', label: 'SolarZone Elite (LEE)' },
    { id: 'tempered', label: 'Tempered Glass' },
    { id: 'obscure', label: 'Obscure / Privacy' },
    { id: 'tinted', label: 'Tinted Glass' },
  ],
  windowStyles: [
    { id: 'double_hung', label: 'Double Hung' },
    { id: 'single_hung', label: 'Single Hung' },
    { id: 'slider', label: 'Sliding' },
    { id: 'casement', label: 'Casement' },
    { id: 'awning', label: 'Awning' },
    { id: 'picture', label: 'Picture' },
    { id: 'bay', label: 'Bay' },
    { id: 'bow', label: 'Bow' },
    { id: 'garden', label: 'Garden' },
  ],
  specialtyShapes: [
    { id: 'arch', label: 'Arch' },
    { id: 'eyebrow', label: 'Eyebrow' },
    { id: 'half_round', label: 'Half Round' },
    { id: 'quarter_round', label: 'Quarter Round' },
    { id: 'circle', label: 'Circle' },
    { id: 'oval', label: 'Oval' },
    { id: 'octagon', label: 'Octagon' },
    { id: 'hexagon', label: 'Hexagon' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'trapezoid', label: 'Trapezoid' },
    { id: 'extended_half_round', label: 'Extended Half Round' },
    { id: 'rake', label: 'Rake Head' },
    { id: 'gothic_arch', label: 'Gothic Arch' },
  ],
  doorStyles: [
    { id: 'entry', label: 'Entry Door' },
    { id: 'patio_sliding', label: 'Sliding Patio Door' },
    { id: 'patio_french', label: 'French Patio Door' },
    { id: 'storm', label: 'Storm Door' },
  ],
  doorColors: [
    { id: 'white', label: 'Pristine White', hex: '#eee' },
    { id: 'black', label: 'Onyx Black', hex: '#222' },
    { id: 'red', label: 'Classic Red', hex: '#8a1a1a' },
    { id: 'woodgrain', label: 'Cherry Wood', hex: '#6a3a2a' },
    { id: 'bronze', label: 'Bronze', hex: '#4a3f35' },
  ],
  doorGlassOptions: [
    { id: 'full_lite', label: 'Full Lite' },
    { id: 'three_quarter_lite', label: '3/4 Lite' },
    { id: 'half_lite', label: 'Half Lite' },
    { id: 'quarter_lite', label: '1/4 Lite' },
    { id: 'no_glass', label: 'No Glass' },
  ],
  sidingColors: [
    { id: 'white', label: 'White', hex: '#f0f0f0' },
    { id: 'navy', label: 'Midnight Navy', hex: '#1a2a3a' },
    { id: 'gray', label: 'Pewter Gray', hex: '#8a959e' },
    { id: 'beige', label: 'Tuscan Clay', hex: '#c4b5a3' },
    { id: 'sage', label: 'Sage Green', hex: '#7a8a7a' },
    { id: 'blue', label: 'Coastal Blue', hex: '#4a6a8a' },
    { id: 'red', label: 'Barn Red', hex: '#6a2a2a' },
  ],
  sidingProfiles: [
    { id: 'traditional_lap', label: 'Traditional Lap' },
    { id: 'dutch_lap', label: 'Dutch Lap' },
    { id: 'board_batten', label: 'Board & Batten' },
    { id: 'shake', label: 'Shake / Shingle' },
    { id: 'vertical', label: 'Vertical Siding' },
  ],
  trimColors: [
    { id: 'white', label: 'White', hex: '#ffffff' },
    { id: 'black', label: 'Black', hex: '#2d2d2d' },
    { id: 'almond', label: 'Almond', hex: '#f5e6d3' },
    { id: 'bronze', label: 'Bronze', hex: '#4a3f35' },
  ],
  shutterColors: [
    { id: 'none', label: 'No Shutters', hex: 'transparent' },
    { id: 'black', label: 'Black', hex: '#111' },
    { id: 'navy', label: 'Navy', hex: '#1a2a4a' },
    { id: 'green', label: 'Forest Green', hex: '#2a4a2a' },
    { id: 'red', label: 'Burgundy', hex: '#5a1a1a' },
  ],
  screenOptions: [
    { id: 'none', label: 'No Screen' },
    { id: 'half', label: 'Half Screen' },
    { id: 'full', label: 'Full Screen' },
    { id: 'bettervue', label: 'BetterVue' },
  ],
  photoTypes: [
    { id: 'front_exterior', label: 'Front Exterior' },
    { id: 'rear_exterior', label: 'Rear Exterior' },
    { id: 'left_exterior', label: 'Left Side Exterior' },
    { id: 'right_exterior', label: 'Right Side Exterior' },
    { id: 'interior_window', label: 'Interior Window' },
    { id: 'door', label: 'Door' },
    { id: 'siding_detail', label: 'Siding Detail' },
    { id: 'specialty_window', label: 'Specialty Window' },
    { id: 'other', label: 'Other' },
  ],
};

export type VisualizerOptions = {
  category: 'windows' | 'doors' | 'siding' | 'trim' | 'full_package';
  windowFrameColor?: string;
  windowStyle?: string;
  gridPattern?: string;
  gridProfile?: string;
  gridPlacement?: string;
  glassPackage?: string;
  specialtyShape?: string;
  doorStyle?: string;
  doorColor?: string;
  doorGlass?: string;
  sidingColor?: string;
  sidingProfile?: string;
  trimColor?: string;
  shutterColor?: string;
  screenOption?: string;
  photoType?: string;
};

// ── Build AI prompt from selections (exported for gateway routing) ────
export function buildVisualizerPrompt(options: VisualizerOptions): string {
  const parts: string[] = [];

  parts.push('Edit the uploaded customer home photo. CRITICAL RULES: Preserve the exact house structure, camera angle, perspective, roof, landscaping, driveway, sky, and background. Make the result photorealistic and suitable for a customer-facing sales proposal. Do NOT invent a different house. Only modify the specified elements:');

  if (options.category === 'windows' || options.category === 'full_package') {
    const color = VISUALIZER_CATALOG.windowFrameColors.find(c => c.id === options.windowFrameColor)?.label || 'White';
    const grid = VISUALIZER_CATALOG.gridPatterns.find(g => g.id === options.gridPattern)?.label || 'No Grids';
    parts.push(`WINDOWS: Replace all visible windows with new replacement windows. Frame color: ${color}. Grid pattern: ${grid}. Keep all window openings in the same locations and proportions.`);
  }

  if (options.category === 'doors' || options.category === 'full_package') {
    if (options.doorColor) {
      const dColor = VISUALIZER_CATALOG.doorColors.find(c => c.id === options.doorColor)?.label || '';
      const dGlass = VISUALIZER_CATALOG.doorGlassOptions.find(g => g.id === options.doorGlass)?.label || '';
      parts.push(`DOOR: Replace the front/entry door with a ${dColor} door${dGlass ? ` with ${dGlass}` : ''}. Keep the door in the same location.`);
    }
  }

  if (options.category === 'siding' || options.category === 'full_package') {
    if (options.sidingColor) {
      const sColor = VISUALIZER_CATALOG.sidingColors.find(c => c.id === options.sidingColor)?.label || '';
      const sProfile = VISUALIZER_CATALOG.sidingProfiles.find(p => p.id === options.sidingProfile)?.label || '';
      parts.push(`SIDING: Change the visible siding to ${sColor}${sProfile ? ` with ${sProfile} profile` : ''}. Keep the house shape identical.`);
    }
  }

  if (options.category === 'trim' || options.category === 'full_package') {
    if (options.trimColor) {
      const tColor = VISUALIZER_CATALOG.trimColors.find(c => c.id === options.trimColor)?.label || '';
      parts.push(`TRIM: Change all visible trim and fascia to ${tColor}.`);
    }
    if (options.shutterColor && options.shutterColor !== 'none') {
      const shColor = VISUALIZER_CATALOG.shutterColors.find(c => c.id === options.shutterColor)?.label || '';
      parts.push(`SHUTTERS: Add or change shutters to ${shColor}.`);
    }
  }

  return parts.join('\n\n');
}

// ── Generate preview using Gemini Imagen ─────────────────────────────
export async function generateVisualizerPreview(
  imageBase64: string,
  options: VisualizerOptions
): Promise<{ status: 'success' | 'fallback' | 'error'; generatedImageBase64?: string; prompt?: string; error?: string }> {
  const prompt = buildVisualizerPrompt(options);

  if (!genAi) {
    return { status: 'fallback', prompt, error: 'Gemini not configured. Set GEMINI_API_KEY environment variable.' };
  }

  try {
    // Use Gemini's image generation with edit capability
    const response = await genAi.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    });

    // Extract generated image from response
    const candidate = (response as any).candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return {
            status: 'success',
            generatedImageBase64: part.inlineData.data,
            prompt,
          };
        }
      }
    }

    return { status: 'error', prompt, error: 'No image generated in response' };
  } catch (err: any) {
    console.error('AI Visualizer generation error:', err);
    return { status: 'error', prompt, error: err.message || 'Generation failed' };
  }
}

// ── Save generated image to disk ─────────────────────────────────────
export function saveVisualizerImage(
  appointmentId: string,
  imageBase64: string,
  suffix: string = 'preview'
): string {
  const dir = path.resolve(__dirname2, '../../../data/visualizer');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${appointmentId}_${suffix}_${Date.now()}.png`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(imageBase64, 'base64');
  fs.writeFileSync(filepath, buffer);
  return filepath;
}
