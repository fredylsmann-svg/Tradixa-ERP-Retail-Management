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
    let formattedPhone = customer_phone ? customer_phone.replace(/[^0-9]/g, '') : '6281000000000';
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }
    // Mayar requires minimum 10 characters for mobile field
    if (formattedPhone.length < 10) {
      formattedPhone = '6281000000000'; // Use default if too short
    }

    console.log(`[Mayar Request] Creating link for ${customer_name} - Rp ${amount}`);

    // 3a. Create Payment Link
    const mayarResponse = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mayarApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: customer_name || 'Customer Tradixa',
        email: customer_email || 'customer@tradixa.com',
        mobile: formattedPhone,
        amount: Math.round(Number(amount)),
        description: description || `Pembayaran Invoice ${receivable_id}`,
        redirectUrl: 'https://tradixa.vercel.app/',
      })
    })

    const contentType = mayarResponse.headers.get('content-type') || ''
    let mayarData
    
    if (contentType.includes('application/json')) {
      mayarData = await mayarResponse.json()
    } else {
      const textError = await mayarResponse.text()
      throw new Error(`Mayar API tidak mengembalikan JSON. Status: ${mayarResponse.status}. Pesan: ${textError.slice(0, 100)}...`)
    }

    console.log(`[Mayar Response] Status: ${mayarResponse.status}`, mayarData);

    if (!mayarResponse.ok) {
      throw new Error(`Mayar Error (${mayarResponse.status}): ${mayarData.message || JSON.stringify(mayarData)}`)
    }

    const paymentLink = mayarData.data?.link || mayarData.link
    const paymentId = mayarData.data?.id || mayarData.id

    // 3b. Generate Real QRIS Image from Mayar
    let qrisImageUrl = null
    try {
      const qrisResponse = await fetch('https://api.mayar.id/hl/v1/qrcode/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mayarApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount))
        })
      })

      if (qrisResponse.ok) {
        const qrisData = await qrisResponse.json()
        qrisImageUrl = qrisData.data?.url || null
        console.log(`[Mayar QRIS] QR Image URL: ${qrisImageUrl}`)
      } else {
        console.log(`[Mayar QRIS] Failed to generate QRIS: ${qrisResponse.status}`)
      }
    } catch (qrisErr) {
      console.log(`[Mayar QRIS] Error (non-fatal): ${qrisErr.message}`)
    }

    // 4. Save the generated link to Supabase
    if (receivable_id && !store_id) {
      await supabase.from('receivables')
        .update({ 
          payment_link: paymentLink,
          payment_gateway_id: paymentId
        })
        .eq('id', receivable_id)
    }

    return new Response(
      JSON.stringify({ success: true, link: paymentLink, id: paymentId, qris_image: qrisImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
