const { createClient } = require('c:/Users/ASUS/Documents/GitHub/phoneswitchhub/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';
// Let's use the service_role key if we can find it, or query pg_policies using supabase.rpc or a direct query?
// Wait, we don't have direct DB access or service_role key, but we can try running a query.
// Let's see if we can query pg_policies. But pg_policies is a system table, anon key might not have permission.
// Let's write a script that tries to retrieve it.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT * FROM pg_policies WHERE tablename = 'sheets_inventory';" });
  if (error) {
    console.error('RPC Error:', error);
    // If execute_sql RPC doesn't exist, we'll try querying RLS using standard select if possible.
  } else {
    console.log('Policies:', data);
  }
}

run();
