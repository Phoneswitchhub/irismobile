const { createClient } = require('@supabase/supabase-js');

const url = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const key = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const client = createClient(url, key);

async function check() {
  const { data, error } = await client
    .from('sheets_inventory')
    .select('stock_location');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log(`Total rows in sheets_inventory: ${data.length}`);
    const locations = {};
    data.forEach(d => {
      locations[d.stock_location] = (locations[d.stock_location] || 0) + 1;
    });
    console.log('Unique stock locations and counts:', locations);
  }
}
check();
