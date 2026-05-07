import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { data, error } = await supabase.from('receivables').select('id, payment_gateway_id').not('payment_gateway_id', 'is', null).order('created_at', { ascending: false }).limit(2);
console.log(data || error);
