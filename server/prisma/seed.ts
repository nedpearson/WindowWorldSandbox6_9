import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// SEED CONFIGURATION
// ═══════════════════════════════════════════════════════════
//
// DEMO ENVIRONMENT:
//   npx prisma db seed
//   → Creates DEMO company + demo users + rich sample data
//   → All demo records are tagged with companyId = DEMO_COMPANY_ID
//
// PRODUCTION ENVIRONMENT:
//   Do NOT run seed.ts against production.
//   Instead:
//     1. Run prisma migrate deploy
//     2. Use /api/auth registration or direct DB insert to create
//        your real company row with a production companyId
//     3. Create real users linked to that company
//     4. Pricing tables below ARE intentionally global (no companyId)
//        because Window World uses shared pricing across all stores.
//        If you need per-company pricing override, add companyId to
//        PricingVersion and filter accordingly.
//
// WARNING: seed.ts deletes Ned's appointments on each run (line ~60).
// NEVER run this script against a live production database.
// ═══════════════════════════════════════════════════════════

// ── DEMO COMPANY CONSTANT ──
// If you change this, also update any hard-coded references in tests.
const DEMO_COMPANY_SLUG = 'window-world-demo';

async function main() {
  console.log('🌱 Seeding Window World Assistant (Demo)...');

  // ── Upsert Demo Company ──
  const demoCompany = await prisma.company.upsert({
    where: { tenantId: DEMO_COMPANY_SLUG },
    update: { name: 'Window World Demo' },
    create: {
      name: 'Window World Demo',
      tenantId: DEMO_COMPANY_SLUG,
    },
  });

  console.log(`   Demo company ID: ${demoCompany.id}`);

  // ── Users ──
  const nedPw = await bcrypt.hash('1Pearson2', 10);
  const demoPw = await bcrypt.hash('demo123', 10);

  // ── Ned gets his own SEPARATE company from the demo company ──
  // This ensures demo users cannot see Ned's real data and Ned's
  // admin view is not polluted with demo appointments.
  const nedCompany = await prisma.company.upsert({
    where: { tenantId: 'window-world-admin' },
    update: { name: 'Window World (Admin)' },
    create: {
      name: 'Window World (Admin)',
      tenantId: 'window-world-admin',
    },
  });

  const ned = await prisma.user.upsert({
    where: { email: 'nedpearson@gmail.com' },
    update: { password: nedPw, role: 'admin', name: 'Ned Pearson', companyId: nedCompany.id },
    create: {
      email: 'nedpearson@gmail.com',
      name: 'Ned Pearson',
      role: 'admin',
      password: nedPw,
      companyId: nedCompany.id,
    },
  });

  // Demo rep is scoped to the demo company only — completely isolated from Ned
  const demoRep = await prisma.user.upsert({
    where: { email: 'demo@windowworld.com' },
    update: { password: demoPw, name: 'Demo Sales Rep', role: 'sales_rep', companyId: demoCompany.id },
    create: {
      email: 'demo@windowworld.com',
      name: 'Demo Sales Rep',
      role: 'sales_rep',
      password: demoPw,
      companyId: demoCompany.id,
    },
  });

  // ── DO NOT Clean Up Existing Data ──
  // Removed destructive deleteMany call that was clearing Ned's appointments.

  // ── Customers (scoped to demo company) ──
  const customers = [
    { firstName: 'James', lastName: 'Robertson', email: 'jrobertson@email.com', phone: '225-555-0101', address: '1420 Oak Valley Dr', city: 'Baton Rouge', state: 'LA', zip: '70810', companyId: demoCompany.id },
    { firstName: 'Sarah', lastName: 'Mitchell', email: 'smitchell@email.com', phone: '225-555-0202', address: '8732 Bluebonnet Blvd', city: 'Baton Rouge', state: 'LA', zip: '70810', companyId: demoCompany.id },
    { firstName: 'Robert', lastName: 'Thibodeaux', email: 'rthibodeaux@email.com', phone: '337-555-0303', address: '205 Magnolia St', city: 'Lafayette', state: 'LA', zip: '70501', companyId: demoCompany.id },
    { firstName: 'Maria', lastName: 'Guidry', email: 'mguidry@email.com', phone: '985-555-0404', address: '1100 Canal St', city: 'Houma', state: 'LA', zip: '70360', preLead1978: true, companyId: demoCompany.id },
    { firstName: 'David', lastName: 'Landry', email: 'dlandry@email.com', phone: '225-555-0505', address: '3421 Perkins Rd', city: 'Baton Rouge', state: 'LA', zip: '70808', companyId: demoCompany.id },
    { firstName: 'Emily', lastName: 'Chen', email: 'echen@email.com', phone: '504-555-0606', address: '101 St Charles Ave', city: 'New Orleans', state: 'LA', zip: '70130', companyId: demoCompany.id },
    { firstName: 'Michael', lastName: 'Williams', email: 'mwilliams@email.com', phone: '985-555-0707', address: '500 Corporate Dr', city: 'Houma', state: 'LA', zip: '70360', companyId: demoCompany.id },
    { firstName: 'Jessica', lastName: 'Brown', email: 'jbrown@email.com', phone: '337-555-0808', address: '1000 W Pinhook Rd', city: 'Lafayette', state: 'LA', zip: '70503', companyId: demoCompany.id },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }

  // ── Appointments (scoped to demo company) ──
  const now = new Date();
  const appointmentData = [
    { customerId: createdCustomers[0].id, userId: demoRep.id, companyId: demoCompany.id, status: 'in_progress', appointmentDate: now, jobAddress: '1420 Oak Valley Dr', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70810', projectType: 'replacement', notes: 'Full house window replacement - 12 openings' },
    { customerId: createdCustomers[1].id, userId: demoRep.id, companyId: demoCompany.id, status: 'draft', appointmentDate: new Date(now.getTime() + 86400000), jobAddress: '8732 Bluebonnet Blvd', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70810', projectType: 'replacement' },
    { customerId: createdCustomers[2].id, userId: demoRep.id, companyId: demoCompany.id, status: 'quoted', appointmentDate: new Date(now.getTime() - 86400000), jobAddress: '205 Magnolia St', jobCity: 'Lafayette', jobState: 'LA', jobZip: '70501', projectType: 'replacement', subtotal: 8500, taxRate: 0.0945, taxAmount: 803.25, totalAmount: 9303.25, depositAmount: 3000, balanceDue: 6303.25 },
    { customerId: createdCustomers[3].id, userId: demoRep.id, companyId: demoCompany.id, status: 'sold', appointmentDate: new Date(now.getTime() - 172800000), jobAddress: '1100 Canal St', jobCity: 'Houma', jobState: 'LA', jobZip: '70360', projectType: 'replacement', subtotal: 12400, taxRate: 0.0945, taxAmount: 1171.80, totalAmount: 13571.80, depositAmount: 5000, balanceDue: 8571.80 },
    { customerId: createdCustomers[4].id, userId: demoRep.id, companyId: demoCompany.id, status: 'needs_remeasure', appointmentDate: new Date(now.getTime() - 259200000), jobAddress: '3421 Perkins Rd', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70808', projectType: 'replacement', notes: 'Kitchen bay window needs remeasure' },
    { customerId: createdCustomers[5].id, userId: demoRep.id, companyId: demoCompany.id, status: 'in_progress', appointmentDate: new Date(now.getTime() + 172800000), jobAddress: '101 St Charles Ave', jobCity: 'New Orleans', jobState: 'LA', jobZip: '70130', projectType: 'replacement', notes: 'Historic district, needs special approval' },
    { customerId: createdCustomers[6].id, userId: demoRep.id, companyId: demoCompany.id, status: 'sold', appointmentDate: new Date(now.getTime() - 500000000), jobAddress: '500 Corporate Dr', jobCity: 'Houma', jobState: 'LA', jobZip: '70360', projectType: 'new_construction', subtotal: 25000, taxRate: 0.0945, taxAmount: 2362.50, totalAmount: 27362.50, depositAmount: 10000, balanceDue: 17362.50 },
    { customerId: createdCustomers[7].id, userId: demoRep.id, companyId: demoCompany.id, status: 'draft', appointmentDate: new Date(now.getTime() + 300000000), jobAddress: '1000 W Pinhook Rd', jobCity: 'Lafayette', jobState: 'LA', jobZip: '70503', projectType: 'replacement' },
  ];

  const createdAppts = [];
  for (const a of appointmentData) {
    const appt = await prisma.appointment.create({ data: a });
    createdAppts.push(appt);
  }

  // ── Openings for appointment 1 (Robertson) ──
  const openingsData = [
    { appointmentId: createdAppts[0].id, openingNumber: 1, roomLocation: 'Living Room - Front', elevation: 'front', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'Colonial', gridPattern: '2x2', glassPackage: 'SolarZone', basePrice: 450, totalPrice: 520 },
    { appointmentId: createdAppts[0].id, openingNumber: 2, roomLocation: 'Living Room - Front', elevation: 'front', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'Colonial', gridPattern: '2x2', glassPackage: 'SolarZone', basePrice: 450, totalPrice: 520 },
    { appointmentId: createdAppts[0].id, openingNumber: 3, roomLocation: 'Kitchen', elevation: 'rear', width: 48, height: 36, productCategory: 'slider', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'Almond', glassPackage: 'SolarZone', basePrice: 380, totalPrice: 430 },
    { appointmentId: createdAppts[0].id, openingNumber: 4, roomLocation: 'Master Bedroom', elevation: 'left', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '6000 Series', interiorColor: 'White', exteriorColor: 'Clay', gridStyle: 'Prairie', gridPattern: '3x1', glassPackage: 'SolarZone Elite', argon: true, foamEnhanced: true, basePrice: 650, totalPrice: 780 },
    { appointmentId: createdAppts[0].id, openingNumber: 5, roomLocation: 'Master Bath', elevation: 'left', width: 24, height: 36, productCategory: 'awning', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'Clay', obscureGlass: 'full', glassPackage: 'SolarZone', basePrice: 320, totalPrice: 370 },
    { appointmentId: createdAppts[0].id, openingNumber: 6, roomLocation: 'Dining Room', elevation: 'front', width: 72, height: 48, productCategory: 'picture', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', temperedGlass: 'full', basePrice: 520, totalPrice: 600 },
    { appointmentId: createdAppts[0].id, openingNumber: 7, roomLocation: 'Foyer', elevation: 'front', width: 24, height: 24, productCategory: 'circle_top', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', radius: 12, basePrice: 380, totalPrice: 420, specialtyNotes: 'Above front door' },
    { appointmentId: createdAppts[0].id, openingNumber: 8, roomLocation: 'Bedroom 2', elevation: 'right', width: 30, height: 54, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', basePrice: 420, totalPrice: 470 },
    { appointmentId: createdAppts[0].id, openingNumber: 9, roomLocation: 'Bedroom 3', elevation: 'right', width: 30, height: 54, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', basePrice: 420, totalPrice: 470 },
    { appointmentId: createdAppts[0].id, openingNumber: 10, roomLocation: 'Back Patio', elevation: 'rear', width: 72, height: 80, productCategory: 'patio_door', seriesModel: '6000 Series', interiorColor: 'White', exteriorColor: 'Clay', glassPackage: 'SolarZone Elite', argon: true, temperedGlass: 'full', screenOption: 'Retractable', basePrice: 1800, totalPrice: 2100 },
  ];

  for (const o of openingsData) {
    const unitedInches = o.width + o.height;
    await prisma.opening.create({ data: { ...o, unitedInches } });
  }

  // ── Pricing Tables (Obsolete, removed from schema) ──

  // ── Pricing Version (Published) ──
  // Uses the ned user as publisher — in production replace with a real admin ID.
  const pv = await prisma.pricingVersion.upsert({
    where: { id: 'seed-pricing-v1' },
    update: {},
    create: {
      id: 'seed-pricing-v1',
      name: 'Window World 2026 Standard',
      status: 'published',
      publishedAt: new Date(),
      publishedBy: ned.id,
      notes: 'Initial seed pricing - verify against current price sheets',
    },
  });

  // Clear existing items for this version so we can cleanly re-seed
  await prisma.pricingVersionItem.deleteMany({
    where: { pricingVersionId: pv.id }
  });

  const pvItems = [
    // Products - Double Hung, Slider, Picture, Casement, Awning
    { category: 'product', productCategory: 'double_hung', label: '4000 DH Fusion Weld (3001)', unitedInchesMin: 0, unitedInchesMax: 200, price: 385, priceType: 'flat', seriesModel: '4000' },
    { category: 'product', productCategory: 'double_hung', label: '4000 DH Foam Enhanced (3001-FE)', unitedInchesMin: 0, unitedInchesMax: 200, price: 410, priceType: 'flat', seriesModel: '4000' },
    { category: 'product', productCategory: 'slider', label: '2 Lite Slider (3002)', unitedInchesMin: 0, unitedInchesMax: 200, price: 449, priceType: 'flat' },
    { category: 'product', productCategory: 'slider', label: '3 Lite Slider (3003)', unitedInchesMin: 0, unitedInchesMax: 200, price: 610, priceType: 'flat' },
    { category: 'product', productCategory: 'picture', label: 'Picture Window (3004)', unitedInchesMin: 0, unitedInchesMax: 200, price: 449, priceType: 'flat' },
    { category: 'product', productCategory: 'casement', label: 'Casement (0971)', unitedInchesMin: 0, unitedInchesMax: 200, price: 529, priceType: 'flat' },
    { category: 'product', productCategory: 'casement', label: 'Double Casement (0972)', unitedInchesMin: 0, unitedInchesMax: 200, price: 1018, priceType: 'flat' },
    { category: 'product', productCategory: 'awning', label: 'Awning (0951)', unitedInchesMin: 0, unitedInchesMax: 200, price: 529, priceType: 'flat' },
    { category: 'product', productCategory: 'patio_door', label: 'Patio Door 6ft', unitedInchesMin: 0, unitedInchesMax: 200, price: 1299, priceType: 'flat' },
    // Options
    { category: 'option', label: 'Colonial Grids', price: 45, priceType: 'flat' },
    { category: 'option', label: 'Prairie Grids', price: 45, priceType: 'flat' },
    { category: 'option', label: 'Diamond Grids', price: 45, priceType: 'flat' },
    { category: 'option', label: 'Tempered Glass', price: 7, priceType: 'flat' },
    { category: 'option', label: 'Obscure Glass', price: 30, priceType: 'flat' },
    { category: 'option', label: 'Foam Enhanced Frame', price: 15, priceType: 'flat' },
    { category: 'option', label: 'Argon Gas Fill', price: 21, priceType: 'flat' },
    { category: 'option', label: 'Full Screen', price: 22, priceType: 'flat' },
    { category: 'option', label: 'Nail Fin', price: 10, priceType: 'flat' },
    { category: 'option', label: 'Color Upgrade - Exterior', price: 250, priceType: 'flat' },
    { category: 'option', label: 'Beige / Clay Color', price: 52, priceType: 'flat' },
    { category: 'option', label: 'Wood Grain - Inside', price: 90, priceType: 'flat' },
    { category: 'option', label: 'SolarZone Low-E Glass', price: 90, priceType: 'flat' },
    { category: 'option', label: 'SolarZone Elite Low-E Glass', price: 110, priceType: 'flat' },
    // Labor
    { category: 'labor', label: 'Full Tearout Installation', price: 85, priceType: 'flat' },
    { category: 'labor', label: 'Insert Installation', price: 65, priceType: 'flat' },
    { category: 'labor', label: 'Sill Repair', price: 45, priceType: 'flat' },
    { category: 'labor', label: 'Trim Package - Interior/Exterior', price: 75, priceType: 'flat' },
    { category: 'labor', label: '2nd Floor Additional', price: 30, priceType: 'flat' },
    { category: 'labor', label: 'Lead Paint Containment', price: 125, priceType: 'flat' },
    // Specialty
    { category: 'specialty', productCategory: 'circle_top', label: 'Circle Top ≤48 UI', unitedInchesMin: 0, unitedInchesMax: 48, price: 350, priceType: 'flat', needsVerification: true },
    { category: 'specialty', productCategory: 'eyebrow', label: 'Eyebrow ≤60 UI', unitedInchesMin: 0, unitedInchesMax: 60, price: 380, priceType: 'flat', needsVerification: true },
  ];

  for (let i = 0; i < pvItems.length; i++) {
    await prisma.pricingVersionItem.create({
      data: { ...pvItems[i], pricingVersionId: pv.id, sortOrder: i, confidence: 0.85 },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   Demo Company:  ${demoCompany.name} (id=${demoCompany.id})`);
  console.log(`   Admin Company: ${nedCompany.name}    (id=${nedCompany.id})`);
  console.log(`   Ned (Admin):   nedpearson@gmail.com / 1Pearson2  → companyId: ${nedCompany.id} (ISOLATED from demo)`);
  console.log(`   Demo Rep:      demo@windowworld.com / demo123    → companyId: ${demoCompany.id}`);
  console.log(`   Customers:     8 demo customers (all tagged companyId: ${demoCompany.id})`);
  console.log(`   Appointments:  8 demo appointments (all tagged companyId: ${demoCompany.id})`);
  console.log('   Pricing:       Global (no companyId) — shared across all franchises');

}

main().catch(console.error).finally(() => prisma.$disconnect());
