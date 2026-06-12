const { createClient } = require('@supabase/supabase-js');

const url = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const key = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

const client = createClient(url, key);

async function check() {
  const tables = ['products', 'orders'];
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*');
    if (error) {
      console.log(`Table '${t}' error:`, error.message);
    } else {
      console.log(`Table '${t}' count: ${data.length}`);
      if (data.length > 0) {
        console.log(`Sample row from '${t}':`, data[0]);
      }
    }
  }
}
check();
