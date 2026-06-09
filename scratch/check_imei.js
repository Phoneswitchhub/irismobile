const { createClient } = require('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('sheets_inventory')
    .select('*')
    .eq('imei', '351338912074951');

  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Matching records in DB:', data);
  }
}

run();
