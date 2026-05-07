import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://yurickvpwbomqwjvffle.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmlja3Zwd2JvbXF3anZmZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjkxMTUsImV4cCI6MjA5MjUwNTExNX0.6LyxBxzgkKHYvrt_lDNmUzWJalOISkxO8XnXwA4102s'
)
async function check() {
  const { data: users, error } = await supabase
    .from('users')
    .select('email, role, store_id, current_store_id')
    .in('email', ['dev@tradixa.com', 'fredyismann@gmail.com'])
  console.log('Users:', JSON.stringify(users, null, 2))

  const { data: prs } = await supabase.from('purchase_requisitions').select('id, store_id, pr_number')
  console.log('PRs:', JSON.stringify(prs, null, 2))
  
  const { data: pos } = await supabase.from('purchase_orders').select('id, store_id, po_number')
  console.log('POs:', JSON.stringify(pos, null, 2))
}
check()
