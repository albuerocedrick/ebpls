require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: apps, error: appsErr } = await supabase
    .from('applications')
    .select('application_no, status, type_id, business_id')
    .order('application_no', { ascending: false })
    .limit(3);

  if (appsErr) {
    console.error('Error fetching applications:', appsErr);
    return;
  }
  
  console.log('Recent Applications:', JSON.stringify(apps, null, 2));

  if (apps.length > 0) {
    const latestApp = apps[0];
    const { data: docs, error: docsErr } = await supabase
      .from('doc_verifications')
      .select('requirement_id, status, file_path')
      .eq('application_no', latestApp.application_no);
      
    if (docsErr) {
      console.error('Error fetching doc_verifications:', docsErr);
      return;
    }
    console.log(`\nDoc Verifications for App ${latestApp.application_no}:`, JSON.stringify(docs, null, 2));
  }
}

check();
