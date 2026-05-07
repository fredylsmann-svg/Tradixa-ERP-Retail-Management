import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { data, error } = await supabase.rpc('get_schema');
// if no get_schema, just use information_schema
