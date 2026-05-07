import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, store_name, plan')
    .limit(5)
  console.log(data, error)
}
check()
