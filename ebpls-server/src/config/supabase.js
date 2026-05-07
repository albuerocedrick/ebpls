const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// ASSUMPTION: We are using the Service Role Key in the backend to bypass RLS
// for administrative actions (e.g. system audit logging). 
// For user-specific actions, we should extract the JWT from the request and forward it, 
// or rely on standard backend logic and explicit RLS bypass when needed.
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

module.exports = {
  supabaseAdmin,
};
