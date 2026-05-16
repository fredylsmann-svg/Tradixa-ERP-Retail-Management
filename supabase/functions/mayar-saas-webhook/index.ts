// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: any) => {
  try {
    const payload = await req.json()
    console.log('[Tradixa SaaS Webhook] Payload received:', JSON.stringify(payload))

    // === Parse Mayar webhook payload ===
    // Mayar sends: { event: "payment.received", data: { status, productDescription, ... } }
    const eventData = payload.data || payload
    const status = eventData.status || eventData.transactionStatus || payload.status
    const description = eventData.productDescription || eventData.description || payload.description || ''

    console.log('[Tradixa SaaS Webhook] Parsed — status:', status, '| description:', description)

    // Proceed only if payment is successful
    if (status === 'SUCCESS' || status === 'PAID' || status === 'settlement' || status === 'COMPLETED') {
      
      // Parse description: "SaaS Upgrade | Store: {store_id} | Plan: {plan_id} | Cycle: {billingCycle}"
      if (description && description.includes('SaaS Upgrade')) {
        const storeMatch = description.match(/Store:\s*([a-zA-Z0-9-]+)/)
        const planMatch = description.match(/Plan:\s*([a-zA-Z0-9-]+)/)
        const cycleMatch = description.match(/Cycle:\s*([a-zA-Z]+)/)

        if (storeMatch && planMatch) {
          const storeId = storeMatch[1]
          const planId = planMatch[1]
          const billingCycle = cycleMatch ? cycleMatch[1] : 'monthly'

          console.log(`[Tradixa SaaS Webhook] Processing — Store: ${storeId}, Plan: ${planId}, Cycle: ${billingCycle}`)

          // Initialize Supabase with Service Role to bypass RLS
          const supabaseUrl = Deno.env.get('SUPABASE_URL')
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing')
          
          const supabase = createClient(supabaseUrl, supabaseKey)

          // Calculate expiry date based on billing cycle
          const now = new Date()
          const expiresAt = new Date(now)
          if (billingCycle === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1)
          }

          // 1. Update store plan with full subscription details
          const { error: storeError } = await supabase
            .from('stores')
            .update({
              plan: planId,
              has_used_trial: false,   // false = sudah berbayar, bukan trial
              plan_started_at: now.toISOString(),
              plan_expires_at: expiresAt.toISOString(),
            })
            .eq('id', storeId)

          if (storeError) {
            console.error('[Tradixa SaaS Webhook] Failed to update store:', storeError)
            throw storeError
          }

          // 2. Update pending subscription record to active
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              notes: `mayar_confirmed|cycle:${billingCycle}|txn:${eventData.transactionId || eventData.id || 'unknown'}`,
            })
            .eq('store_id', storeId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)

          if (subError) {
            console.error('[Tradixa SaaS Webhook] Subscription record update failed (non-fatal):', subError)
          }

          console.log(`[Tradixa SaaS Webhook] ✅ Store ${storeId} upgraded to ${planId} (${billingCycle}). Expires: ${expiresAt.toISOString()}`)
        } else {
          console.log('[Tradixa SaaS Webhook] Could not parse Store/Plan from description:', description)
        }
      } else {
        console.log('[Tradixa SaaS Webhook] Not a SaaS Upgrade event, skipping. Description:', description)
      }
    } else {
      console.log('[Tradixa SaaS Webhook] Payment not successful, status:', status)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error: any) {
    console.error('[Tradixa SaaS Webhook] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
