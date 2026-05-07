// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { store_id, receivable_id, amount, customer_name, customer_email, customer_phone, description } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get store_id from payload, or lookup from receivables if not provided
    let finalStoreId = store_id;
    if (!finalStoreId && receivable_id) {
      const { data: receivable, error: recError } = await supabase
        .from('receivables')
        .select('store_id')
        .eq('id', receivable_id)
        .single()

      if (!recError && receivable) {
        finalStoreId = receivable.store_id
      }
    }

    if (!finalStoreId) {
      throw new Error('store_id atau receivable_id tidak valid.')
    }

    // 2. Get the Mayar API Key from the store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('mayar_api_key')
      .eq('id', finalStoreId)
      .single()

    if (storeError || !store) {
      throw new Error('Store tidak ditemukan atau database error.')
    }

    // STRICT MULTI-TENANCY: Only use the store's specific API key. No global fallback.
    const mayarApiKey = store.mayar_api_key?.trim()
    
    console.log(`[Mayar Debug] Using API Key for Store ${finalStoreId}: ****${mayarApiKey?.slice(-4)}`);

    if (!mayarApiKey) {
      throw new Error('Toko ini belum mengatur API Key Mayar di menu Company Settings. Pembayaran digital tidak dapat diproses.')
    }

    // 3. Call Mayar API to create payment link
    // Standardizing endpoint and phone number format (must start with 62)
    let formattedPhone = customer_phone ? customer_phone.replace(/[^0-9]/g, '') : '6280000000000';
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    console.log(`[Mayar Request] Creating link for ${customer_name} - Rp ${amount}`);

    const mayarResponse = await fetch('https://api.mayar.id/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mayarApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: customer_name || 'Customer Tradixa',
        email: customer_email || 'customer@tradixa.com',
        mobile: formattedPhone,
        amount: Math.round(Number(amount)), // Ensure integer
        description: description || `Pembayaran Invoice ${receivable_id}`,
      })
    })

    const mayarData = await mayarResponse.json()
    console.log(`[Mayar Response] Status: ${mayarResponse.status}`, mayarData);

    if (!mayarResponse.ok) {
      throw new Error(`Mayar Error (${mayarResponse.status}): ${mayarData.message || JSON.stringify(mayarData)}`)
    }

    // Usually Mayar returns the link in data.link or similar. Adjust based on exact Mayar API version
    const paymentLink = mayarData.data?.link || mayarData.link
    const paymentId = mayarData.data?.id || mayarData.id

    // 4. Save the generated link to Supabase
    if (receivable_id && !store_id) {
      // If store_id is NOT passed, it implies this is the old AR flow which expects receivable_id to be valid
      await supabase.from('receivables')
        .update({ 
          payment_link: paymentLink,
          payment_gateway_id: paymentId
        })
        .eq('id', receivable_id)
    }

    return new Response(
      JSON.stringify({ success: true, link: paymentLink, id: paymentId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
