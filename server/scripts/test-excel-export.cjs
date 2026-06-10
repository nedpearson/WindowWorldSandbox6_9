const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const APPT_ID = 'cmpmxq7qd000eqy01x072lt04';
const OUT_FILE = 'C:/Users/nedpe/Desktop/test_generated_contract.xlsx';

// Copy mapping functions from exports.ts
function mapProductCategoryToModel(category, seriesModel) {
  if (category === 'double_hung') return '3001';
  if (category === 'single_hung') return '3002'; // wait, in counting it was 3002 = slider2? Let's check model mapping
  if (category === 'slider') return '3002';
  if (category === 'picture') return '3004';
  if (category === 'casement') return '3005';
  if (category === 'bay') return '3006'; // wait, bow or double casement?
  return category || '';
}

function mapGlassPackage(pkg) {
  if (!pkg) return 'SolarZone';
  return pkg;
}

function mapRemovalType(rem) {
  if (!rem) return 'ALUM';
  return rem.toUpperCase();
}

// Mock of helper services
async function getLatestClientSketchBuffer(appointmentId, companyId) {
  const existing = await prisma.sketchExport.findFirst({
    where: { appointmentId, companyId, sourceHash: 'client_upload' },
    orderBy: { createdAt: 'desc' },
  });
  if (!existing) return null;

  if (existing.storagePath) {
    let resolvedPath = existing.storagePath;
    if (!fs.existsSync(resolvedPath)) {
      const filename = path.basename(existing.storagePath);
      // __dirname is server/scripts. We want server/data/sketches or data/sketches under repo root
      const LOCAL_SKETCH_DIR = path.resolve(__dirname, '../../data/sketches');
      const fallbackLocalPath = path.join(LOCAL_SKETCH_DIR, filename);
      if (fs.existsSync(fallbackLocalPath)) {
        resolvedPath = fallbackLocalPath;
      }
    }

    if (fs.existsSync(resolvedPath)) {
      return fs.readFileSync(resolvedPath);
    }
  }
  return null;
}

async function run() {
  try {
    console.log(`Fetching appointment ${APPT_ID}...`);
    const appt = await prisma.appointment.findFirst({
      where: { id: APPT_ID },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        user: true,
      }
    });

    if (!appt) {
      console.error('Appointment not found!');
      return;
    }

    const { normalizeSketchForDocumentExport } = await import('../dist/services/printSafeSketchRenderer.js');
    const sketch = await prisma.formSketch.findFirst({
      where: { appointmentId: APPT_ID },
      include: {
        markers: {
          include: {
            links: {
              include: {
                opening: true
              }
            }
          }
        }
      }
    });

    const { activeMarkers, openings: normalizedOpenings } = normalizeSketchForDocumentExport(appt, sketch, appt.openings);

    const openings = normalizedOpenings.map(o => ({
      qty: 1,
      model: mapProductCategoryToModel(o.productCategory, o.seriesModel),
      vinylColor: (o.interiorColor === 'White' || !o.interiorColor) ? 'WH' : 'BG',
      intColor: o.interiorColor || undefined,
      extColor: o.exteriorColor || undefined,
      width: o.width ?? undefined,
      height: o.height ?? undefined,
      windowNumber: o.openingNumber ?? undefined,
      glassOption: mapGlassPackage(o.glassPackage),
      foamEnhanced: o.foamEnhanced ? 'Y' : undefined,
      gridStyle: o.gridStyle || undefined,
      gridPattern: o.gridPattern || undefined,
      obscureFull: o.obscureGlass === 'full' ? 'FULL' : o.obscureGlass === 'half' ? 'BSO' : undefined,
      temperedFull: o.temperedGlass === 'full' ? 'FULL' : o.temperedGlass === 'half' ? 'BSO' : undefined,
      fullScreen: o.screenOption === 'Full' ? 'Y' : undefined,
      typeRemoved: mapRemovalType(o.removalType),
      typeInstall: o.installType || undefined,
      sillRepair: o.sillRepair ? 'Y' : undefined,
    }));

    const subtotal = normalizedOpenings.filter(o => (o.totalPrice || 0) > 0).reduce((s, o) => s + ((o.totalPrice) || 0), 0);
    const totalAmount = subtotal;
    const depositAmount = appt.depositAmount || 0;
    const balanceDue = totalAmount - depositAmount;

    // --- SKETCH RESOLUTION ---
    // Instead of using client sketch, force the server sketchRenderer to run
    let sketchBuffer = null;
    console.log('Forcing server sketchRenderer...');
    const { generateSketchImage } = await import('./src/services/sketchRenderer.js');
    sketchBuffer = await generateSketchImage(APPT_ID, 'all');
    console.log(`Rendered fallback sketch buffer, size = ${sketchBuffer ? sketchBuffer.length : 0}`);

    const exportData = {
      customer: {
        firstName: appt.customer.firstName,
        lastName: appt.customer.lastName,
        email: appt.customer.email || undefined,
        address: appt.jobAddress || appt.customer.address || '',
        city: appt.jobCity || appt.customer.city || '',
        state: appt.jobState || appt.customer.state || 'LA',
        zip: appt.jobZip || appt.customer.zip || '',
        phone: appt.customer.phone || '',
        phoneSecondary: undefined,
      },
      openings,
      estimatorName: appt.user?.name || undefined,
      completeJob: 'Y',
      orderDate: appt.appointmentDate || new Date(),
      notes: appt.notes || undefined,
      sketchImageBuffer: sketchBuffer || undefined,
      contractSketchImageBuffer: sketchBuffer || undefined,
      pricing: {
        totalListPrice: subtotal,
        totalAmount,
        depositAmount,
        balanceDue,
      },
    };

    console.log('Generating workbook using generateFilledWorkbook...');
    const { generateFilledWorkbook } = await import('../dist/workbookEngine.js');
    const workbook = await generateFilledWorkbook(exportData);

    console.log(`Writing workbook to ${OUT_FILE}...`);
    await workbook.xlsx.writeFile(OUT_FILE);
    console.log('Workbook written successfully!');

  } catch (err) {
    console.error('Error during test export:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
