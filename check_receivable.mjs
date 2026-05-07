import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data } = await supabase.from('receivables').select('id, payment_gateway_id').not('payment_gateway_id', 'is', null).order('created_at', { ascending: false }).limit(2);
console.log(JSON.stringify(data, null, 2));
