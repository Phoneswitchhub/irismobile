const { createClient } = require('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Query information_schema using an RPC or a system table view
  // Wait, system tables can be queried via standard Select if we go through supabase.rpc or check if we can query it?
  // Let's see: usually, anon key cannot select pg_catalog or information_schema directly unless exposed.
  // But we can test inserting a record with battery_pct = '100' and purchase_cost_krw = 297700 to see if it succeeds.
  // If it succeeds with 100/297700 but fails with '₩297,700' / 0, it means it is a type or validation error!
  
  const test1 = {
    site_date: '26. 5. 28',
    sale_date: null,
    sticker: 'Swapmart0528-24',
    model_name: 'S22 Ultra 512G',
    imei: '351338912074951',
    color: 'GREEN',
    is_sold: false,
    stock_location: 'Shop',
    battery_pct: '100',
    seller_name: null,
    notes: '',
    selling_price: 0,
    market_price: 0,
    purchase_cost_krw: 297700
  };

  console.log('Inserting with proper types...');
  const { data, error } = await supabase.from('sheets_inventory').insert([test1]).select();
  if (error) {
    console.error('Insert Failed! Error details:', error);
  } else {
    console.log('Insert Succeeded! Result:', data);
    // Cleanup if successful
    await supabase.from('sheets_inventory').delete().eq('imei', '351338912074951');
  }
}

run();
