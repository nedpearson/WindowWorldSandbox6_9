import { calculateProposalTotals } from '../services/pricingService.js';
import { evaluateAllRules } from '../services/btrRulesEngine.js';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const productCategories = ['double_hung', 'slider', 'picture', 'casement', 'garden', 'custom_shape'];
const models = ['4000', '6000', 'L200', '03A0', '3000', '0900', 'S134'];
const exteriors = ['brick', 'siding', 'stucco'];

function generateSyntheticOpening(id: number) {
  const isSiding = Math.random() > 0.5;
  const isBrick = !isSiding && Math.random() > 0.5;
  
  return {
    id: `opt-${id}`,
    openingNumber: id,
    productCategory: randomChoice(productCategories),
    seriesModel: randomChoice(models),
    width: Math.floor(Math.random() * 80) + 10,
    height: Math.floor(Math.random() * 80) + 10,
    quantity: Math.floor(Math.random() * 3) + 1,
    exteriorSurface: isSiding ? 'vinyl_siding' : isBrick ? 'brick' : 'stucco',
    requiresTrimHeader: Math.random() > 0.8,
    temperedGlass: Math.random() > 0.8 ? 'full' : 'none',
    gridStyle: Math.random() > 0.5 ? 'Flat' : 'None',
    oriel: Math.random() > 0.9,
    clearStory: Math.random() > 0.95,
    tapcon: Math.random() > 0.9,
    foamEnhanced: Math.random() > 0.5,
    argon: Math.random() > 0.5,
    interiorColor: 'white',
    exteriorColor: 'white',
  };
}

async function run() {
  console.log('Starting 500-appointment QA simulation...');
  let totalOpenings = 0;
  let missingRulesCount = 0;
  let ruleViolations = 0;
  let crashes = 0;

  // Mock version for pricing
  const mockVersion = {
    items: [
      { category: 'product', productCategory: 'double_hung', seriesModel: '4000', price: 350, label: '4000 DH' },
      { category: 'product', productCategory: 'slider', seriesModel: 'L200', price: 300, label: 'L200 Slider' },
      { category: 'option', label: 'Tempered Glass', price: 40 },
      { category: 'option', label: 'Flat Grid', price: 30 },
    ]
  };

  for (let i = 0; i < 500; i++) {
    try {
      const openingsCount = Math.floor(Math.random() * 20) + 1;
      const openings = [];
      for (let j = 0; j < openingsCount; j++) {
        openings.push(generateSyntheticOpening(j + 1));
      }
      totalOpenings += openingsCount;

      // Run pricing
      const { missingRules } = calculateProposalTotals(openings as any, mockVersion);
      missingRulesCount += missingRules.length;

      // Run BTR validation
      for (const opening of openings) {
        const results = evaluateAllRules(opening as any);
        ruleViolations += results.filter(r => !r.passes).length;
      }
    } catch (err) {
      console.error(`Crash on appointment ${i}:`, err);
      crashes++;
    }
  }

  console.log('--- QA SIMULATION COMPLETE ---');
  console.log(`Appointments Simulated: 500`);
  console.log(`Total Openings Processed: ${totalOpenings}`);
  console.log(`Missing Pricing Fallbacks Hit: ${missingRulesCount}`);
  console.log(`BTR Rule Violations Caught: ${ruleViolations}`);
  console.log(`Crashes: ${crashes}`);
}

run().catch(console.error);
