const { createClient } = require('@supabase/supabase-js');

const url = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const key = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const client = createClient(url, key);

async function run() {
  const { data, error } = await client
    .from('profiles')
    .select('id, name, phone, role, created_at');
    
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles:');
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
