import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length) acc[key.trim()] = value.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('log_type', 'WebhookError')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error("Error:", error);
  else console.log("Logs:", JSON.stringify(data, null, 2));
}

run();
