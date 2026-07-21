const { supabaseAdmin } = require('./src/config/supabase');

async function verify() {
  console.log('--- VERIFYING PHASE 1 MIGRATION ---');

  // Alternative column check via simple query select
  const { data: busData, error: busError } = await supabaseAdmin.from('businesses').select('is_renting').limit(1);
  if (busError) {
    console.error('❌ businesses.is_renting column error:', busError.message);
  } else {
    console.log('✅ businesses.is_renting column exists! Sample data:', busData);
  }

  // 2. Check requirement_types count and new columns
  const { data: reqTypes, error: reqError } = await supabaseAdmin
    .from('requirement_types')
    .select('name, applies_to_new, applies_to_renewal, is_conditional, condition_type, max_files, sort_order, is_active')
    .order('sort_order', { ascending: true });

  if (reqError) {
    console.error('❌ requirement_types error:', reqError.message);
  } else {
    console.log(`✅ requirement_types count: ${reqTypes.length}`);
    const active = reqTypes.filter(r => r.is_active);
    const inactive = reqTypes.filter(r => !r.is_active);
    console.log(`   Active: ${active.length}, Inactive (Retired): ${inactive.length}`);
    console.log('   Sample active requirement:', active[0]);
    console.log('   Sample retired requirement:', inactive[0]);
  }

  // 3. Check requirement_conditions count
  const { data: conditions, error: condError } = await supabaseAdmin
    .from('requirement_conditions')
    .select('id, match_value, requirement_types(name)');

  if (condError) {
    console.error('❌ requirement_conditions error:', condError.message);
  } else {
    console.log(`✅ requirement_conditions count: ${conditions.length}`);
    console.log('   Sample condition mapping:', conditions[0]);
  }

  // 4. Check new business activities
  const { data: activities, error: actError } = await supabaseAdmin
    .from('business_activities')
    .select('name, description, is_active');

  if (actError) {
    console.error('❌ business_activities error:', actError.message);
  } else {
    console.log(`✅ business_activities count: ${activities.length}`);
    const newActivities = ['Hotel / Hostel / Hometel', 'Piggery', 'Water Refilling Station'];
    const foundNew = activities.filter(a => newActivities.includes(a.name));
    console.log('   Found newly seeded activities:', foundNew.map(a => a.name));
  }
}

verify();
