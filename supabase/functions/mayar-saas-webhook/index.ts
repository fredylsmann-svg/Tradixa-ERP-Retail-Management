import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: any) => {
  try {
    const payload = await req.json()
    console.log('Webhook payload received:', payload)

    // Example Mayar Webhook payload check (adjust based on actual Mayar webhook docs)
    // Some Mayar webhooks use "status", some use "status_code"
    const status = payload.status || payload.transaction_status || payload.data?.status
    const description = payload.description || payload.data?.description

    // Proceed if payment is successful
    if (status === 'SUCCESS' || status === 'PAID' || status === 'settlement' || status === 'COMPLETED') {
      
      // Parse description: "SaaS Upgrade | Store: {store_id} | Plan: {plan_id} | Cycle: {billingCycle}"
      if (description && description.includes('SaaS Upgrade')) {
        const storeMatch = description.match(/Store:\s*([a-zA-Z0-9-]+)/);
        const planMatch = description.match(/Plan:\s*([a-zA-Z0-9-]+)/);

        if (storeMatch && planMatch) {
          const storeId = storeMatch[1];
          const planId = planMatch[1];

          // Initialize Supabase with Service Role to bypass RLS
          const supabaseUrl = Deno.env.get('SUPABASE_URL')
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing')
          
          const supabase = createClient(supabaseUrl, supabaseKey)

          // Update store plan
          const { error } = await supabase
            .from('stores')
            .update({ plan: planId })
            .eq('id', storeId)

          if (error) {
            console.error('Failed to update store plan:', error)
            throw error
          }

          console.log(`Successfully upgraded store ${storeId} to plan ${planId}`)
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
