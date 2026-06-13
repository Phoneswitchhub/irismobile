const { createClient } = require('@supabase/supabase-js');

const url = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const key = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const client = createClient(url, key);

async function run() {
  const { data, error } = await client
    .from('contracts')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching contracts:', error.message);
  } else {
    console.log('Contracts columns:', Object.keys(data[0] || {}));
    console.log('Sample contract:', data[0]);
  }
}
run();
