import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yurickvpwbomqwjvffle.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmlja3Zwd2JvbXF3anZmZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjkxMTUsImV4cCI6MjA5MjUwNTExNX0.6LyxBxzgkKHYvrt_lDNmUzWJalOISkxO8XnXwA4102s'
)

async function check() {
  // Try to count stores using RPC or just a simple count
  const { count, error } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
  console.log('Store count:', count, 'Error:', error)
  
  // Check if RLS might be blocking - try subscriptions too
  const { count: subCount, error: subErr } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
  console.log('Subscription count:', subCount, 'Error:', subErr)
}
check()
