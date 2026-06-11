const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('sheets_inventory')
      .select('*')
      .eq('is_sold', true)
      .eq('is_approved', true);
      
    if (error) throw error;
    
    console.log(`Total sold and approved: ${data.length}`);
    console.log("First 10 sold devices:");
    data.slice(0, 10).forEach(d => {
      console.log(`- Model: ${d.model_name}, Sticker: ${d.sticker}, Sale Date: "${d.sale_date}", Sale Type: ${d.sale_type}, Payment Status: ${d.payment_status}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
