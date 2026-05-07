import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yurickvpwbomqwjvffle.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmlja3Zwd2JvbXF3anZmZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjkxMTUsImV4cCI6MjA5MjUwNTExNX0.6LyxBxzgkKHYvrt_lDNmUzWJalOISkxO8XnXwA4102s'
)

async function check() {
  // Check subscriptions table
  const { data: subs, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('=== SUBSCRIPTIONS ===')
  console.log(JSON.stringify(subs, null, 2))
  console.log('Error:', subErr)

  // Check stores table for plan status
  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .select('id, store_name, plan, plan_expires_at')
    .limit(5)
  console.log('\n=== STORES ===')
  console.log(JSON.stringify(stores, null, 2))
  console.log('Error:', storeErr)
}
check()
