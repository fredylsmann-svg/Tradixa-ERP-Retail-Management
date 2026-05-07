import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://yurickvpwbomqwjvffle.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cmlja3Zwd2JvbXF3anZmZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjkxMTUsImV4cCI6MjA5MjUwNTExNX0.6LyxBxzgkKHYvrt_lDNmUzWJalOISkxO8XnXwA4102s'
)
const { data, error } = await supabase.from('users').select('*').eq('email', 'dev@tradixa.com')
console.log('Users:', JSON.stringify(data, null, 2), 'Error:', error)
