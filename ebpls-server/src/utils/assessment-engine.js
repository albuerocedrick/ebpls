const { createError } = require('../middlewares/error.middleware');
const money = value => Math.round(value * 100) / 100;
const normalized = value => String(value || '').trim().toLowerCase();

function number(value, label, minimum = 0) {
  const result = Number(value);
  if (value === null || value === undefined || !Number.isFinite(result) || result < minimum) throw createError(`Invalid ${label} configuration.`, 422);
  return result;
}

function scheduleFee(activity, items, rules) {
  const name = normalized(activity.name);
  let matches = items.filter(item => normalized(item.activity_match) === name);
  if (!matches.length) matches = items.filter(item => item.activity_match && normalized(item.activity_match).includes(name));
  if (!matches.length) {
    const fallback = rules.find(rule => rule.rule_code === 'DEFAULT_FEE');
    if (!fallback) throw createError('Configure the Revenue Code default permit fee.', 422);
    return { amount: number(fallback.value, 'default permit fee'), explanation: `${activity.name}: Revenue Code DEFAULT_FEE` };
  }
  const tiered = matches.some(item => item.tier_min !== null || item.tier_max !== null || item.tier_unit);
  let selected;
  if (tiered) {
    const count = number(activity.metric_count, `${activity.name} metric count`, 1);
    if (!Number.isInteger(count)) throw createError(`${activity.name} requires a whole-number metric count.`, 422);
    selected = matches.find(item => (item.tier_min === null || count >= Number(item.tier_min)) && (item.tier_max === null || count <= Number(item.tier_max)));
    if (!selected) throw createError(`No configured fee tier matches ${activity.name} (${count}).`, 422);
  } else selected = matches[0];
  return { amount: selected.is_exempt ? 0 : number(selected.amount, 'scheduled fee'), explanation: `${activity.name}: ${selected.business_type}${selected.tier_label ? ` / ${selected.tier_label}` : ''}` };
}

/** Pure calculation; all inputs come from one database snapshot. */
function computeAssessment(source) {
  if (!source?.application) throw createError('Application not found.', 404);
  const zone = source.zone;
  if (!zone || !zone.is_active || !source.barangay_active) throw createError('Assign the business to an active barangay and location zone before approval.', 422);
  const multiplier = number(zone.fee_multiplier, 'zone multiplier', 0.0001);
  const capitalFloor = number(zone.min_capital_floor, 'zone capital floor');
  if (!source.activities?.length) throw createError('Declare at least one business activity before assessment.', 422);
  const totalCapital = money(source.activities.reduce((sum, a) => sum + number(a.capitalization, 'declared capital'), 0));
  const totalGrossSales = money(source.activities.reduce((sum, a) => sum + number(a.gross_sales_prev_year, 'declared gross sales'), 0));
  const warnings = [];
  if (totalCapital < capitalFloor) warnings.push(`Declared capital is below the zone's recommended floor of PHP ${capitalFloor.toFixed(2)}. The declaration has not been changed.`);
  const feeTypes = source.fee_types || [];
  if (!feeTypes.length) throw createError('Configure active fee types before assessment.', 422);
  const items = new Map();
  const visiting = new Set();
  function calculate(fee) {
    if (items.has(fee.id)) return items.get(fee.id);
    if (visiting.has(fee.id)) throw createError('Circular percentage fee dependencies. Update the fee configuration.', 422);
    visiting.add(fee.id);
    let base, amount, computation;
    const isTax = fee.name === 'Business Tax';
    if (fee.computation_basis === 'Percentage') {
      const reference = feeTypes.find(item => item.id === fee.percentage_of_id);
      if (!reference) throw createError(`Configure the reference fee for ${fee.name}.`, 422);
      const referenceItem = calculate(reference);
      const rate = number(fee.percentage_value, `${fee.name} rate`);
      base = amount = money(referenceItem.amount * rate);
      computation = `${rate * 100}% of ${reference.name}; no second zone multiplier`;
    } else if (fee.name === "Mayor's Permit Fee") {
      const scheduled = source.activities.map(activity => scheduleFee(activity, source.fee_schedule || [], source.rules || []));
      base = money(scheduled.reduce((sum, item) => sum + item.amount, 0));
      amount = money(base * multiplier);
      computation = `${scheduled.map(item => item.explanation).join('; ')}. PHP ${base.toFixed(2)} × ${multiplier}`;
    } else if (fee.computation_basis === 'Fixed') {
      base = number(fee.fixed_amount, `${fee.name} fixed amount`);
      amount = money(base * (isTax ? 1 : multiplier));
      computation = isTax ? 'Configured fixed business tax' : `Configured PHP ${base.toFixed(2)} × zone ${multiplier}`;
    } else if (fee.computation_basis === 'Gross_Sales') {
      const basis = totalGrossSales > 0 ? totalGrossSales : totalCapital;
      const rate = fee.percentage_value == null ? 0.02 : number(fee.percentage_value, `${fee.name} rate`);
      if (fee.percentage_value == null) warnings.push(`${fee.name} uses the existing 2% fallback; confirm the rate against the approved Revenue Code.`);
      base = money(basis * rate);
      amount = money(base * (isTax ? 1 : multiplier));
      computation = `PHP ${basis.toFixed(2)} ${totalGrossSales > 0 ? 'gross sales' : 'capital'} × ${rate * 100}%${isTax ? '; no zone multiplier on business tax' : ` × zone ${multiplier}`}`;
    } else throw createError(`Unsupported computation basis for ${fee.name}.`, 422);
    visiting.delete(fee.id);
    const item = { fee_type_id: fee.id, name: fee.name, amount: money(amount), base_amount: money(amount), unzoned_amount: money(base), is_business_tax: isTax, computation };
    items.set(fee.id, item);
    return item;
  }
  const lineItems = feeTypes.map(calculate);
  return { lineItems, totalAmount: money(lineItems.reduce((sum, item) => sum + item.amount, 0)),
    context: { zone, total_capital: totalCapital, total_gross_sales: totalGrossSales, capital_below_floor: totalCapital < capitalFloor, warnings, version: 3 }, source };
}

module.exports = { computeAssessment, money };
