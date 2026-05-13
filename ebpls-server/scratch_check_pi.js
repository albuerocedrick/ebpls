const { supabaseAdmin } = require('./src/config/supabase');

async function check() {
  const piId = 'pi_Cwm51Bn7SuPmysXr27s8msip';
  
  console.log(`Checking transactions for PI: ${piId}`);
  
  const { data: txs, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('paymongo_payment_intent_id', piId);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Count:', txs.length);
    console.log('Transactions:', JSON.stringify(txs, null, 2));
  }
  
  process.exit();
}

check();
