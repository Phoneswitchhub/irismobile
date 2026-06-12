const { createClient } = require('@supabase/supabase-js');

const url = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const key = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const client = createClient(url, key);

async function testColumn(col) {
  const payload = {};
  payload[col] = '100';
  payload['imei'] = 'test_' + Date.now();
  payload['model_name'] = 'test';
  
  const { error } = await client
    .from('sheets_inventory')
    .insert(payload);
    
  if (error) {
    console.log(`Testing column '${col}':`, error.message);
  } else {
    console.log(`Testing column '${col}': SUCCESS!`);
  }
}

async function run() {
  await testColumn('battery');
  await testColumn('battery_pct');
}
run();
