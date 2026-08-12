const { supabaseAdmin } = require('./ebpls-server/src/config/supabase');

async function test() {
  const { data: fees } = await supabaseAdmin.from('fee_types').select('*');
  console.log("Fee Types:", JSON.stringify(fees, null, 2));
}

test().catch(console.error);
