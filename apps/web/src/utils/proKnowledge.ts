// ═══════════════════════════════════════════════════════════
// Pro Knowledge Engine — Instant expert talking points
// Makes the rep sound like a 20-year veteran to the
// homeowner. Context-aware explanations surface
// automatically based on the current opening/product.
// ═══════════════════════════════════════════════════════════

export interface KnowledgeCard {
  id: string;
  category: string;
  title: string;            // internal label
  talkTrack: string;        // what the rep says to the homeowner
  whyItMatters: string;     // benefit to the homeowner
  proTip?: string;          // advanced selling angle
  icon: string;
}

// ── Tempered Glass Rules ─────────────────────────────────
export const TEMPERED_KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'tempered-bathroom', category: 'Tempered Glass', icon: '🛡️',
    title: 'Bathroom Code Requirement',
    talkTrack: 'Building code requires tempered glass in any window within 60 inches of a water source — that includes bathtubs, showers, and hot tubs. Tempered glass is 4 times stronger than regular glass, and if it does break, it shatters into small, safe pebbles instead of dangerous shards.',
    whyItMatters: 'Protects your family from injury — especially important in wet, slippery areas where falls are common.',
    proTip: 'This isn\'t optional — your city inspector will check. We include it automatically so you never have to worry about failing inspection.',
  },
  {
    id: 'tempered-large-pane', category: 'Tempered Glass', icon: '📏',
    title: 'Large Pane Safety',
    talkTrack: 'Any glass pane larger than 9 square feet that sits within 18 inches of the floor must be tempered by code. This window qualifies because of its size.',
    whyItMatters: 'Large panes near the floor are a safety hazard — someone could walk into or fall against them. Tempered glass ensures safe breakage.',
  },
  {
    id: 'tempered-door', category: 'Tempered Glass', icon: '🚪',
    title: 'Door Glass Requirement',
    talkTrack: 'All glass in doors and sidelights within 24 inches of a door must be tempered. This is a universal building code requirement — no exceptions.',
    whyItMatters: 'Doors get slammed, kids run into them, heavy objects bump them. Tempered glass ensures safety in these high-impact areas.',
  },
];

// ── Energy Upgrades ──────────────────────────────────────
export const ENERGY_KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'energy-solarzone', category: 'Energy', icon: '☀️',
    title: 'SolarZone Low-E Glass',
    talkTrack: 'SolarZone glass has an invisible metallic coating that reflects heat. In summer, it keeps solar heat outside. In winter, it reflects your furnace heat back inside. It\'s like having a thermos for your house.',
    whyItMatters: 'Most homeowners see a 15-25% reduction in heating and cooling costs. On a $200/month energy bill, that\'s $30-50 back in your pocket every month.',
    proTip: 'SolarZone also blocks 84% of UV rays — your furniture, flooring, and curtains won\'t fade nearly as fast.',
  },
  {
    id: 'energy-argon', category: 'Energy', icon: '🌡️',
    title: 'Argon Gas Fill',
    talkTrack: 'Between the two panes of glass, we fill the space with argon gas instead of regular air. Argon is denser than air, so it\'s a much better insulator — it slows heat transfer between the inside and outside.',
    whyItMatters: 'Argon gas improves the window\'s insulation by about 30% compared to air. You\'ll notice fewer cold drafts near windows in winter.',
  },
  {
    id: 'energy-foam', category: 'Energy', icon: '🔇',
    title: 'Foam Enhanced Frame',
    talkTrack: 'We inject insulating foam into the hollow chambers of the vinyl frame. This eliminates the air pockets that let heat and cold transfer through the frame itself — not just the glass.',
    whyItMatters: 'Reduces outside noise by up to 50% and eliminates cold spots around the window frame. You\'ll feel the difference on cold mornings.',
    proTip: 'If the homeowner lives near a busy road, airport, or school — foam enhancement is the #1 upgrade they\'ll appreciate most.',
  },
];

// ── Specialty Windows ────────────────────────────────────
export const SPECIALTY_KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'spec-casement', category: 'Specialty', icon: '🪟',
    title: 'Casement Windows',
    talkTrack: 'Casement windows crank open like a door — the entire sash swings outward. This gives you 100% of the opening for ventilation, compared to about 50% with a double hung. They also seal tighter when closed because the sash presses against the frame.',
    whyItMatters: 'Best ventilation of any window style. Also the most energy-efficient operable window because of the compression seal.',
  },
  {
    id: 'spec-picture', category: 'Specialty', icon: '🖼️',
    title: 'Picture Windows',
    talkTrack: 'Picture windows don\'t open — they\'re fixed glass designed to maximize your view. Because there are no moving parts, they\'re the most energy-efficient and most affordable window per square foot.',
    whyItMatters: 'Maximum light, maximum view, maximum energy efficiency. Perfect for living rooms and any wall where you want an unobstructed view.',
  },
  {
    id: 'spec-slider', category: 'Specialty', icon: '↔️',
    title: 'Sliding Windows',
    talkTrack: 'Sliding windows are ideal for wide openings where you want ventilation but don\'t have room for a window that swings outward — like above a kitchen sink or along a walkway.',
    whyItMatters: 'No protruding sash means they work perfectly in tight spaces. Easy to operate with one hand.',
  },
  {
    id: 'spec-arch', category: 'Specialty', icon: '🏛️',
    title: 'Architectural Shapes',
    talkTrack: 'Arch tops, circle tops, and eyebrow windows add dramatic architectural character to your home. They\'re custom-manufactured to your exact specifications and are always the conversation piece when guests visit.',
    whyItMatters: 'Architectural windows significantly increase your home\'s curb appeal and resale value. They show that you invested in quality details.',
    proTip: 'These are fixed (non-opening) windows, so they\'re extremely energy efficient and require no maintenance.',
  },
];

// ── Financing ────────────────────────────────────────────
export const FINANCING_KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'fin-sameascash', category: 'Financing', icon: '💳',
    title: 'Same-as-Cash Financing',
    talkTrack: 'With our 12-month same-as-cash option, you can spread the payment over a full year with zero interest — as long as it\'s paid in full within 12 months. There\'s no penalty for paying early.',
    whyItMatters: 'You get your new windows installed now while the weather is good, and you have a full year to pay without any extra cost.',
    proTip: 'Frame this as "paying yourself back" — the energy savings from new windows start immediately and offset part of the monthly payment.',
  },
  {
    id: 'fin-lowmonthly', category: 'Financing', icon: '📊',
    title: 'Low Monthly Payment',
    talkTrack: 'If you prefer a lower monthly payment, we have extended plans up to 120 months. On a typical project, that can bring the payment down to just a few dollars a day — less than your daily coffee.',
    whyItMatters: 'New windows are an investment that pays you back through energy savings, increased home value, and zero maintenance costs.',
  },
  {
    id: 'fin-roi', category: 'Financing', icon: '📈',
    title: 'Return on Investment',
    talkTrack: 'New windows typically return 70-80% of their cost in home value at resale. But the real ROI is what you save every month on energy bills, plus eliminating painting and maintenance costs forever.',
    whyItMatters: 'Unlike a kitchen remodel where you\'re paying for aesthetics, windows pay for themselves through measurable energy savings.',
    proTip: 'Ask: "What do you spend on heating/cooling each month?" Then calculate the annual savings to show lifetime value.',
  },
];

// ── Context-aware card selection ─────────────────────────
export function getRelevantKnowledge(opening: any): KnowledgeCard[] {
  const cards: KnowledgeCard[] = [];
  const room = (opening.roomLocation || '').toLowerCase();
  const isBath = /bath|shower|powder|lavatory/i.test(room);

  // Tempered
  if (isBath) cards.push(TEMPERED_KNOWLEDGE[0]);
  if (opening.width > 0 && opening.height > 0 && (opening.width * opening.height) / 144 > 9) {
    cards.push(TEMPERED_KNOWLEDGE[1]);
  }
  if (opening.productCategory === 'patio_door') {
    cards.push(TEMPERED_KNOWLEDGE[2]);
  }

  // Energy
  if (opening.glassPackage === 'SolarZone' || opening.glassPackage === 'SolarZone Elite') {
    cards.push(ENERGY_KNOWLEDGE[0]);
  }
  if (opening.argon) cards.push(ENERGY_KNOWLEDGE[1]);
  if (opening.foamEnhanced) cards.push(ENERGY_KNOWLEDGE[2]);

  // Specialty
  const specMap: Record<string, KnowledgeCard> = {
    casement: SPECIALTY_KNOWLEDGE[0],
    picture: SPECIALTY_KNOWLEDGE[1],
    slider: SPECIALTY_KNOWLEDGE[2],
    eyebrow: SPECIALTY_KNOWLEDGE[3],
    circle_top: SPECIALTY_KNOWLEDGE[3],
    quarter_arch: SPECIALTY_KNOWLEDGE[3],
  };
  if (opening.productCategory && specMap[opening.productCategory]) {
    cards.push(specMap[opening.productCategory]);
  }

  return cards;
}

// ── Get financing cards ──────────────────────────────────
export function getFinancingKnowledge(): KnowledgeCard[] {
  return FINANCING_KNOWLEDGE;
}

// ── Get all knowledge for a full job ─────────────────────
export function getJobKnowledge(openings: any[]): KnowledgeCard[] {
  const seen = new Set<string>();
  const cards: KnowledgeCard[] = [];
  for (const o of openings) {
    for (const card of getRelevantKnowledge(o)) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        cards.push(card);
      }
    }
  }
  return cards;
}
