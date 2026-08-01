/**
 * Client-Side Dedicated Court Fee Calculator Service (CLF Reference Parity Engine)
 * Performs real-time court fee calculations and generates itemized breakdowns.
 */

export const calculateCourtFeeClient = (rule, suitValueInput, advocateFeePctOverride = null) => {
  if (!rule) {
    return null;
  }

  const suitValue = Math.max(0, Number(suitValueInput) || 0);
  let courtFee = 0;
  let formulaExplanation = '';
  let matchedSlab = null;

  const ruleType = rule.ruleType;
  const calculationMode = rule.calculationMode || 'MARGINAL_CUMULATIVE';

  if (ruleType === 'FIXED') {
    courtFee = Number(rule.fixedAmount || 0);
    formulaExplanation = `Fixed Court Fee of ₹${courtFee.toLocaleString('en-IN')} as per state notification.`;
  } else if (ruleType === 'PERCENTAGE') {
    const rate = Number(rule.percentageRate || 0);
    courtFee = (suitValue * rate) / 100;
    formulaExplanation = `Ad-valorem ${rate}% on suit value ₹${suitValue.toLocaleString('en-IN')} = ₹${courtFee.toLocaleString('en-IN')}`;

    const minFee = Number(rule.minFee || 0);
    const maxFee = Number(rule.maxFee || 0);

    if (minFee > 0 && courtFee < minFee) {
      courtFee = minFee;
      formulaExplanation += ` (capped at Minimum Fee ₹${minFee.toLocaleString('en-IN')})`;
    } else if (maxFee > 0 && courtFee > maxFee) {
      courtFee = maxFee;
      formulaExplanation += ` (capped at Maximum Fee ₹${maxFee.toLocaleString('en-IN')})`;
    }
  } else if (ruleType === 'SLAB') {
    const slabs = [...(rule.slabs || [])].sort((a, b) => Number(a.fromAmount) - Number(b.fromAmount));

    if (slabs.length > 0) {
      for (const slab of slabs) {
        const from = Number(slab.fromAmount);
        const to = slab.toAmount !== null && slab.toAmount !== undefined && slab.toAmount !== '' 
          ? Number(slab.toAmount) 
          : Infinity;

        if (suitValue >= from && suitValue <= to) {
          matchedSlab = slab;
          break;
        }
      }

      if (!matchedSlab) {
        matchedSlab = slabs[slabs.length - 1];
      }

      const feeVal = Number(matchedSlab.feeValue || 0);
      const baseFee = Number(matchedSlab.minFee || 0);
      const slabFrom = Number(matchedSlab.fromAmount || 0);
      const slabTo = matchedSlab.toAmount !== null && matchedSlab.toAmount !== undefined && matchedSlab.toAmount !== '' 
        ? Number(matchedSlab.toAmount) 
        : null;
      const rangeStr = slabTo !== null
        ? `₹${slabFrom.toLocaleString('en-IN')} – ₹${slabTo.toLocaleString('en-IN')}`
        : `Above ₹${slabFrom.toLocaleString('en-IN')}`;

      if (calculationMode === 'MARGINAL_CUMULATIVE') {
        if (matchedSlab.feeType === 'PERCENTAGE') {
          const threshold = slabFrom > 0 ? slabFrom - 1 : 0;
          const excessAmount = Math.max(0, suitValue - threshold);
          const marginalFee = (excessAmount * feeVal) / 100;
          courtFee = baseFee + marginalFee;

          if (baseFee > 0) {
            formulaExplanation = `CLF Cumulative Schedule (${rangeStr}): Base Fee ₹${baseFee.toLocaleString('en-IN')} + ${feeVal}% on excess ₹${excessAmount.toLocaleString('en-IN')} = ₹${courtFee.toLocaleString('en-IN')}`;
          } else {
            formulaExplanation = `CLF Schedule (${rangeStr}): ${feeVal}% on ₹${suitValue.toLocaleString('en-IN')} = ₹${courtFee.toLocaleString('en-IN')}`;
          }
        } else {
          courtFee = baseFee + feeVal;
          formulaExplanation = `CLF Schedule (${rangeStr}): Fixed Tier Fee ₹${courtFee.toLocaleString('en-IN')}`;
        }
      } else {
        if (matchedSlab.feeType === 'PERCENTAGE') {
          courtFee = (suitValue * feeVal) / 100;
          formulaExplanation = `Slab Tier (${rangeStr}): ${feeVal}% on ₹${suitValue.toLocaleString('en-IN')} = ₹${courtFee.toLocaleString('en-IN')}`;
        } else {
          courtFee = feeVal;
          formulaExplanation = `Slab Tier (${rangeStr}): Fixed Fee ₹${courtFee.toLocaleString('en-IN')}`;
        }

        if (baseFee > 0 && courtFee < baseFee) {
          courtFee = baseFee;
          formulaExplanation += ` (capped at Slab Min Fee ₹${baseFee.toLocaleString('en-IN')})`;
        }
      }

      const ruleMaxFee = Number(rule.maxFee || 0);
      if (ruleMaxFee > 0 && courtFee > ruleMaxFee) {
        courtFee = ruleMaxFee;
        formulaExplanation += ` (capped at Maximum Court Fee ₹${ruleMaxFee.toLocaleString('en-IN')})`;
      }
    }
  }

  // Calculate separate additional charges
  const processFee = Math.max(0, Number(rule.processFee || 0));
  const filingFee = Math.max(0, Number(rule.filingFee || 0));
  const miscCharges = Math.max(0, Number(rule.miscCharges || 0));
  const totalAdditionalCharges = processFee + filingFee + miscCharges;

  // Advocate Fee calculation
  const advocateFeePct = advocateFeePctOverride !== null && advocateFeePctOverride !== undefined
    ? Number(advocateFeePctOverride)
    : Number(rule.defaultAdvocateFeePct || 10);

  const advocateFee = (suitValue * advocateFeePct) / 100;
  const totalAmount = courtFee + advocateFee + totalAdditionalCharges;

  return {
    suitValue,
    courtFee: Math.round(courtFee * 100) / 100,
    advocateFeePct,
    advocateFee: Math.round(advocateFee * 100) / 100,
    processFee,
    filingFee,
    miscCharges,
    totalAdditionalCharges,
    totalAmount: Math.round(totalAmount * 100) / 100,
    ruleType,
    calculationMode,
    stateCode: rule.stateCode,
    stateName: rule.stateName,
    actDetails: {
      actName: rule.actName || 'State Court Fees Act',
      actVersion: rule.actVersion || '—',
      notificationNo: rule.notificationNo || '—',
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo || 'Present',
    },
    formulaExplanation,
    notes: rule.notes || '',
    matchedSlab,
  };
};

export default {
  calculateCourtFeeClient,
};
