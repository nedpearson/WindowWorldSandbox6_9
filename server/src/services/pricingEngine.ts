import { prisma } from '../index.js';
import { calculateProposalTotals } from './pricingService.js';
import { applyOpeningDefaults } from '../routes/openings.js';
import { evaluateAllRules } from './btrRulesEngine.js';

export async function recalculatePricing(appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId },
    include: { 
      openings: true, 
      lineItems: true,
      quoteGroups: { include: { openings: true } },
      combinedQuotes: { include: { quoteGroups: true } }
    }
  });
  
  if (!appointment) return null;

  // Canonical Pricing Calculation — uses published PricingVersion with items[]
  const version = await prisma.pricingVersion.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    include: { items: true }
  });

  if (version) {
    // Use raw DB openings (NOT applyOpeningDefaults) for pricing
    // so we don't charge removal/flashing for openings that have null fields.
    // applyOpeningDefaults is for frontend display only.
    const { lineItems, missingRules } = calculateProposalTotals(appointment.openings, version);

    // Clear existing auto-generated line items
    await prisma.quoteLineItem.deleteMany({
      where: { 
        appointmentId: appointment.id,
        category: { in: ['product', 'option', 'labor'] }
      }
    });

    // Insert new line items
    if (lineItems.length > 0) {
      await prisma.quoteLineItem.createMany({
        data: lineItems.map((li: any, index: number) => ({
          appointmentId: appointment.id,
          openingNumber: li.openingNumber || null,
          label: li.label,
          category: li.category,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          totalPrice: li.totalPrice,
          needsVerification: li.needsVerification,
          sortOrder: index,
          notes: li.explanation
        }))
      });
    }

    // Update openings' aggregate totalPrices for backward compatibility
    for (const opening of appointment.openings) {
      const openingItems = lineItems.filter((li: any) => li.openingNumber === opening.openingNumber);
      const totalPrice = openingItems.reduce((sum: number, li: any) => sum + li.totalPrice, 0);
      const needsVerification = openingItems.some((li: any) => li.needsVerification);
      
      await prisma.opening.update({
        where: { id: opening.id },
        data: { totalPrice, needsVerification, pricingStatus: 'auto' }
      });
      opening.totalPrice = totalPrice;
      opening.needsVerification = needsVerification;
    }

    // Save missingRules as AuditorIssues so Review page can flag them
    // First clear existing pricing-related issues for this appointment
    await prisma.auditorIssue.deleteMany({
      where: {
        appointmentId: appointment.id,
        category: 'Pricing',
        auditorSource: 'pricing_engine',
        resolved: false,
      }
    });

    // Create new issues for any missing catalog prices
    if (missingRules.length > 0) {
      await prisma.auditorIssue.createMany({
        data: missingRules.map((rule: any) => ({
          appointmentId: appointment.id,
          userId: appointment.userId,
          severity: 'Warning',
          category: 'Pricing',
          auditorSource: 'pricing_engine',
          description: rule.description,
          correctiveAction: `Add a catalog price for "${rule.label}" in Pricing Admin → Options. Fallback price is being used.`,
          blocksProduction: false,
          resolved: false,
        }))
      });
    }

    // ── BTR 2026 Rules Evaluation ──
    // Evaluate all active BTR rules against each opening and create AuditorIssues
    // for violations (blockers, warnings). These appear on the Review page.
    try {
      // Clear existing BTR rule issues
      await prisma.auditorIssue.deleteMany({
        where: {
          appointmentId: appointment.id,
          auditorSource: 'btr_rules_engine',
          resolved: false,
        }
      });

      const btrIssues: any[] = [];
      for (const opening of appointment.openings) {
        const ruleResults = evaluateAllRules(opening as any);
        for (const result of ruleResults) {
          if (!result.passes && result.message) {
            btrIssues.push({
              appointmentId: appointment.id,
              userId: appointment.userId,
              severity: result.severity === 'blocker' ? 'Error' : 'Warning',
              category: 'BTR Rules',
              auditorSource: 'btr_rules_engine',
              description: `Opening #${(opening as any).openingNumber}: ${result.message}`,
              correctiveAction: result.suggestedAction || `Review BTR 2026 Pricing Guidelines p.${result.sourcePage} (${result.sourceSection})`,
              blocksProduction: result.severity === 'blocker',
              resolved: false,
            });
          }
        }
      }

      if (btrIssues.length > 0) {
        await prisma.auditorIssue.createMany({ data: btrIssues });
      }
    } catch (btrError) {
      // BTR rules evaluation is non-blocking — log but don't fail pricing
      console.warn('[BTR Rules] Evaluation error (non-blocking):', btrError);
    }
  }

  const openingsSubtotal = appointment.openings.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  const manualLineItemsTotal = appointment.lineItems
    .filter((li: any) => !['product', 'option', 'labor'].includes(li.category))
    .reduce((sum, li) => sum + (Number(li.totalPrice) || 0), 0);
  const subtotal = openingsSubtotal + manualLineItemsTotal;
  const discount = Number(appointment.discount) || 0;
  const adminFee = 150; // Hardcoded administrative fee
  const discountedSubtotal = subtotal - discount;
  // Window World is tax-exempt — no sales tax
  const taxAmount = 0;
  const totalAmount = discountedSubtotal + adminFee;
  const depositAmount = totalAmount / 2; // Always 50% deposit
  const balanceDue = totalAmount - depositAmount;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { subtotal, taxAmount, taxRate: 0, totalAmount, balanceDue, adminFee, depositAmount, pricingVersionId: version?.id },
    include: {
      customer: true,
      openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
      lineItems: true,
      formSketches: {
        include: {
          markers: true
        }
      }
    }
  });

  // ── Recalculate Quote Groups ──
  for (const group of appointment.quoteGroups || []) {
    const groupOpenings = group.openings.map((qgo: any) => 
      updated.openings.find((o: any) => o.id === qgo.openingId)
    ).filter(Boolean);

    const groupSubtotal = groupOpenings.reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0);
    // Applying same logic: total = subtotal - discount
    // Here we can use a group specific discount if we add it in future, but for now just subtotal
    const groupTotal = groupSubtotal - (Number(group.discount) || 0);

    await prisma.quoteGroup.update({
      where: { id: group.id },
      data: { subtotal: groupSubtotal, total: groupTotal, pricingStatus: 'auto' }
    });
  }

  // ── Recalculate Combined Quotes ──
  // Deduplicate openings
  for (const combined of appointment.combinedQuotes || []) {
    const groupIds = combined.quoteGroups.map((cqg: any) => cqg.quoteGroupId);
    const groups = appointment.quoteGroups.filter((qg: any) => groupIds.includes(qg.id));
    
    const uniqueOpeningIds = new Set<string>();
    for (const g of groups) {
      for (const qgo of g.openings) {
        uniqueOpeningIds.add(qgo.openingId);
      }
    }

    const cqOpenings = Array.from(uniqueOpeningIds).map(id => 
      updated.openings.find((o: any) => o.id === id)
    ).filter(Boolean);

    const cqSubtotal = cqOpenings.reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0);
    const cqTotal = cqSubtotal - (Number(combined.discount) || 0);

    await prisma.combinedQuote.update({
      where: { id: combined.id },
      data: { subtotal: cqSubtotal, total: cqTotal, pricingStatus: 'auto' }
    });
  }

  // Apply sensible defaults to openings for frontend display (NOT for pricing)
  (updated as any).openings = updated.openings.map(applyOpeningDefaults);

  return updated;
}
