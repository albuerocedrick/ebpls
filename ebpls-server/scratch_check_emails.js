const { supabaseAdmin } = require('./src/config/supabase');

async function checkEmails() {
  const { data, error } = await supabaseAdmin
    .from('email_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching emails:', error.message);
    return;
  }

  console.log('Latest 5 Emails:');
  console.table(data.map(e => ({
    id: e.id,
    trigger: e.trigger_event,
    to: e.recipient_email,
    status: e.status,
    error: e.error_message,
    created: e.created_at
  })));
}

checkEmails();
