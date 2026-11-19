const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');

async function issueBusinessPermit(applicationNo, issuer) {
  const { data, error } = await supabaseAdmin.rpc('issue_business_permit', { p_application_no: applicationNo, p_issuer: issuer });
  if (error) throw createError('Unable to load or issue the business permit.', 500);
  return data;
}

module.exports = { issueBusinessPermit };
