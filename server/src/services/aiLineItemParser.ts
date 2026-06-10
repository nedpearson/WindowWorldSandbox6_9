import { callAI } from './aiGateway.js';

const ADD_ON_PRICING: Record<string, number> = {
  "Remove Storm Window": 10,
  "Window Removal": 60,
  "Remove Steel Window": 70,
  "Remove Aluminum In Stucco": 90,
  "Install Mullion for multi-unit": 30,
  "Structural Mullion for multi-unit": 90,
  "Standard Cutback": 50,
  "Wood Casing Cutback": 80,
  "Install Exterior Capping": 125,
  "Install Vinyl Int/Ext Trim": 40,
  "Special Shape Trim": 40,
  "Header Flashing": 12,
  "2nd Story Charge": 10,
  "Bay Window Finish & Trim": 300,
  "Repair Sill OR Jamb": 25, // Per foot
  "J-Channel": 40,
  "Clear Story": 150, // Default fallback
  "Maintenance Agreement": 199, // Default fallback
};

export interface ParsedLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export interface AIParseResult {
  lineItems: ParsedLineItem[];
  openingUpdates: {
    openingNumbers: number[] | 'all';
    updates: any;
  }[];
}

export async function parseLineItemsFromText(text: string, userId: string, companyId: string): Promise<AIParseResult> {
  const allowedItemsList = Object.entries(ADD_ON_PRICING)
    .map(([name, price]) => `- ${name}: $${price}`)
    .join('\n');

  const prompt = `
You are an intelligent order processing assistant for a window installation company.
The user has provided a natural language request to modify their quote or project.

You can do TWO things:
1. Add manual line items (e.g., extra charges, custom services).
2. Modify properties of specific windows (openings).

For example, if the user says "add 2 cutbacks on window 6 and 7 and make them all half screen":
- Cutbacks and screens are intrinsic properties of windows. You should update the openings.

Opening Properties you can update:
- \`screenOption\`: "Full Screen" or "Half Screen" or "No Screen"
- \`cutbackRequired\`: true or false
- \`cutbackType\`: "standard" or "wood_trim_cutback"
- \`glassPackage\`: "Clear", "SolarZone", "SolarZone Elite", etc.
- \`foamEnhanced\`: true or false
- \`argon\`: true or false
- \`temperedGlass\`: "none", "half", "full"

Approved Add-on Fees (for manual line items):
${allowedItemsList}

User Input: "${text}"

Return ONLY a valid JSON object with the following structure:
{
  "lineItems": [
    { "label": "Window Removal", "quantity": 5, "unitPrice": 60, "category": "addon" }
  ],
  "openingUpdates": [
    {
      "openingNumbers": [6, 7], // array of numbers, or the string "all"
      "updates": {
        "cutbackRequired": true
      }
    },
    {
      "openingNumbers": "all",
      "updates": {
        "screenOption": "Half Screen"
      }
    }
  ]
}

Only add items to "lineItems" if they are truly manual add-ons that cannot be represented by updating opening properties. Cutbacks, screens, grids, etc. should modify openings.
Output ONLY the JSON object. Do not include markdown formatting like \`\`\`json.
`;

  try {
    const aiResponse = await callAI({
      feature: 'line_item_parsing',
      input: prompt,
      userId,
      companyId,
      bypassCache: true
    } as any);

    const cleanJson = (aiResponse.rawText || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      lineItems: Array.isArray(parsed?.lineItems) ? parsed.lineItems.map((item: any) => ({
        label: String(item.label || 'Custom Item'),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        category: 'addon'
      })) : [],
      openingUpdates: Array.isArray(parsed?.openingUpdates) ? parsed.openingUpdates : []
    };
  } catch (err) {
    console.error('[aiLineItemParser] Failed to parse line items:', err);
    throw new Error('Failed to parse line items from AI');
  }
}
