// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_PRICES = {
  pro: { monthly: 149000, yearly: 1490000 },
  enterprise: { monthly: 499000, yearly: 4990000 },
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { store_id, plan_id, billingCycle, customer_name, customer_email, redirect_url } = await req.json()
    
    const mayarApiKey = Deno.env.get('MAYAR_API_KEY')
    if (!mayarApiKey) {
      throw new Error('Sistem belum dikonfigurasi dengan Mayar Master API Key.')
    }

    if (!store_id || !plan_id || !billingCycle) {
      throw new Error('Missing required fields: store_id, plan_id, or billingCycle.')
    }

    const prices = PLAN_PRICES[plan_id as keyof typeof PLAN_PRICES];
    if (!prices) {
      throw new Error('Invalid plan_id')
    }

    const amount = prices[billingCycle as keyof typeof prices];
    if (!amount) {
      throw new Error('Invalid billing cycle')
    }

    const description = `SaaS Upgrade | Store: ${store_id} | Plan: ${plan_id} | Cycle: ${billingCycle}`;

    // Create payment link using Mayar API
    const mayarResponse = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mayarApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: customer_name || 'Tradixa User',
        email: customer_email || 'user@tradixa.com',
        mobile: '6280000000000',
        amount: amount,
        description: description,
        redirectUrl: redirect_url || 'https://tradixa.com',
      })
    })

    const mayarData = await mayarResponse.json()
    if (!mayarResponse.ok) {
      throw new Error(`Mayar API Error: ${JSON.stringify(mayarData)}`)
    }

    const paymentLink = mayarData.data?.link || mayarData.link
    // Extract the Mayar product/transaction ID so webhook can look it up later
    const mayarProductId = mayarData.data?.id || mayarData.id || null

    // Save the pending subscription to the database so the webhook can find it
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && supabaseKey && mayarProductId) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('subscriptions').insert({
        store_id: store_id,
        plan: plan_id,
        status: 'pending',
        payment_method: 'mayar',
        amount: amount,
        notes: `mayar_product_id:${mayarProductId}|cycle:${billingCycle}`,
      })
    }
    
    return new Response(
      JSON.stringify({ success: true, link: paymentLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
