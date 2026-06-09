const { createClient } = require('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const newRecord = {
    site_date: '26. 5. 28',
    sale_date: '',
    sticker: 'Swapmart0528-24',
    model_name: 'S22 Ultra 512G',
    imei: '351338912074951',
    color: 'GREEN',
    is_sold: false,
    stock_location: 'Shop',
    battery_pct: '₩297,700',
    seller_name: '',
    notes: '',
    selling_price: 0,
    market_price: 0,
    purchase_cost_krw: 0
  };

  console.log('Inserting record...');
  const { data, error } = await supabase.from('sheets_inventory').insert([newRecord]).select();
  if (error) {
    console.error('Insert Failed! Error details:', error);
  } else {
    console.log('Insert Succeeded! Result:', data);
  }
}

run();
