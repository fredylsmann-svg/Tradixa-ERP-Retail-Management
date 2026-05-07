import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('customers')
    .select('email, phone')
    .eq('name', 'WEBHOOK_ERROR')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log(data, error)
}
check()
