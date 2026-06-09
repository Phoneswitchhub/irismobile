const { createClient } = require('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('sheets_inventory').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data found in sheets_inventory');
  }
}

run();
