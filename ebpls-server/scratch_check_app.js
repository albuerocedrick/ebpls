const { supabaseAdmin } = require('./src/config/supabase');

async function checkApp() {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('application_no, status')
    .eq('application_no', 'APP-2026-00011')
    .single();
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('App found:', data);
  }
}

checkApp();
