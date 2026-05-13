const { supabaseAdmin } = require('./src/config/supabase');

async function check() {
  const appNo = 'APP-2026-00002';
  
  const { data: assessments } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('application_no', appNo);
    
  if (!assessments || assessments.length === 0) {
    console.log('No assessments found');
    process.exit();
  }
  
  const assId = assessments[0].id;
  console.log(`Assessment ID: ${assId}`);
  
  const { data: txs } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('assessment_id', assId);
    
  console.log('Transactions for this assessment:', JSON.stringify(txs, null, 2));
  
  process.exit();
}

check();
