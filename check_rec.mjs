import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { data, error } = await supabase.from('receivables').select('*').limit(1);
console.log(Object.keys(data?.[0] || {}));
