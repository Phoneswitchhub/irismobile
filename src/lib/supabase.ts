import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkruzdmtfyibtpfdutty.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
