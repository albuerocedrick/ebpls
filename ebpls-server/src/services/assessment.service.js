// =================================================================
// File: src/services/assessment.service.js
// Purpose: Fee calculation engine and assessment persistence.
// Policy:  Calculation logic must be idempotent and consistent with
//          the LGU's Revenue Code.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { createError }   = require('../middlewares/error.middleware');
const { ERROR_CODES, AUDIT_ACTIONS } = require('../utils/constants');
const { logAction }     = require('./audit.service');

/**
 * Auto-calculates all applicable fees based on business financial data.
 */
const calculateFees = async (applicationNo) => {
  // 1. Fetch application activities (Gross Sales / Capitalization)
  const { data: activities, error: actError } = await supabaseAdmin
    .from('application_activities')
    .select(`
      capitalization,
      gross_sales_prev_year,
      business_activities (name)
    `)
    .eq('application_no', applicationNo);

  if (actError || !activities) {
    throw createError('Failed to fetch business activities for calculation.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 2. Aggregate totals
  const totalGrossSales = activities.reduce((sum, act) => sum + Number(act.gross_sales_prev_year || 0), 0);
  const totalCapital = activities.reduce((sum, act) => sum + Number(act.capitalization || 0), 0);

  // 3. Fetch active fee types
  const { data: feeTypes, error: feeError } = await supabaseAdmin
    .from('fee_types')
    .select('*')
    .eq('is_active', true);

  if (feeError) {
    throw createError('Failed to fetch fee types.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  const results = [];
  
  // Phase 1: Calculate Fixed and Gross-based fees
  for (const fee of feeTypes) {
    if (fee.computation_basis === 'Percentage') continue; // Skip for now

    let amount = 0;
    if (fee.computation_basis === 'Fixed') {
      // Logic: Use fixed_amount if exists, otherwise fallback to placeholder
      amount = Number(fee.fixed_amount || 500); 
    } else if (fee.computation_basis === 'Gross_Sales') {
      // Placeholder: 2% of gross sales or capitalization (whichever is applicable)
      // In production, this would use a complex bracket/tier schedule.
      const base = totalGrossSales > 0 ? totalGrossSales : totalCapital;
      amount = base * 0.02; 
    }

    results.push({
      fee_type_id: fee.id,
      name: fee.name,
      amount: Math.round(amount * 100) / 100
    });
  }

  // Phase 2: Calculate Percentage-based fees (e.g. Fire Safety)
  for (const fee of feeTypes) {
    if (fee.computation_basis !== 'Percentage') continue;

    const referenceFee = results.find(r => r.fee_type_id === fee.percentage_of_id);
    const refAmount = referenceFee ? referenceFee.amount : 0;
    const amount = refAmount * (Number(fee.percentage_value) / 100);

    results.push({
      fee_type_id: fee.id,
      name: fee.name,
      amount: Math.round(amount * 100) / 100
    });
  }

  const totalAmount = results.reduce((sum, item) => sum + item.amount, 0);

  return {
    lineItems: results,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

/**
 * Saves a finalized assessment to the database.
 */
const createAssessment = async (applicationNo, assessedByUserId, calculatedData) => {
  // 1. Create primary assessment record
  const { data: assessment, error: assError } = await supabaseAdmin
    .from('assessments')
    .insert({
      application_no: applicationNo,
      total_amount: calculatedData.totalAmount,
      assessed_by: assessedByUserId
    })
    .select()
    .single();

  if (assError) {
    console.error('[assessment.service] createAssessment failed:', assError.message);
    throw createError('Failed to save assessment.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // 2. Create line items
  const lineItemsPayload = calculatedData.lineItems.map(item => ({
    assessment_id: assessment.id,
    fee_type_id: item.fee_type_id,
    amount: item.amount,
    is_override: false
  }));

  const { error: lineError } = await supabaseAdmin
    .from('assessment_line_items')
    .insert(lineItemsPayload);

  if (lineError) {
    // Cleanup parent record if items fail
    await supabaseAdmin.from('assessments').delete().eq('id', assessment.id);
    throw createError('Failed to save assessment line items.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  return assessment;
};

/**
 * Manually overrides a fee amount and recalculates dependencies.
 */
const overrideLineItem = async (lineItemId, newAmount, reason, officerUserId) => {
  // 1. Fetch current item for audit and context
  const { data: currentItem, error: fetchError } = await supabaseAdmin
    .from('assessment_line_items')
    .select('*, assessments(application_no)')
    .eq('id', lineItemId)
    .single();

  if (fetchError || !currentItem) {
    throw createError('Line item not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const assessmentId = currentItem.assessment_id;

  // 2. Update the target line item
  const { error: updateError } = await supabaseAdmin
    .from('assessment_line_items')
    .update({
      amount: newAmount,
      is_override: true,
      override_reason: reason
    })
    .eq('id', lineItemId);

  if (updateError) throw createError('Failed to update line item.', 500, ERROR_CODES.INTERNAL_ERROR);

  // 3. Special Logic: Recalculate Fire Safety if Mayor's Permit (ID=1) was changed
  if (currentItem.fee_type_id === 1) {
    // Fire Safety (ID=8) is 10% of Mayor's Permit
    const fireSafetyAmount = Math.round((newAmount * 0.10) * 100) / 100;
    await supabaseAdmin
      .from('assessment_line_items')
      .update({ amount: fireSafetyAmount })
      .eq('assessment_id', assessmentId)
      .eq('fee_type_id', 8);
  }

  // 4. Recalculate total assessment amount
  const { data: allItems } = await supabaseAdmin
    .from('assessment_line_items')
    .select('amount')
    .eq('assessment_id', assessmentId);

  const newTotal = allItems.reduce((sum, item) => sum + Number(item.amount), 0);
  
  const { data: updatedAssessment } = await supabaseAdmin
    .from('assessments')
    .update({ total_amount: newTotal })
    .eq('id', assessmentId)
    .select()
    .single();

  // 5. Audit Logging
  await logAction({
    userId: officerUserId,
    action: AUDIT_ACTIONS.FEE_OVERRIDE,
    entityType: 'assessment_line_items',
    entityId: lineItemId,
    oldValue: { amount: currentItem.amount },
    newValue: { amount: newAmount, reason }
  });

  return updatedAssessment;
};

module.exports = {
  calculateFees,
  createAssessment,
  overrideLineItem
};