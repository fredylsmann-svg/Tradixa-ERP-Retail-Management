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
    const { store_id, api_key } = await req.json()

    // If api_key is provided directly (for testing before save), use it
    // Otherwise, look it up from the store
    let mayarApiKey = api_key?.trim()

    if (!mayarApiKey && store_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl!, supabaseKey!)

      const { data: store } = await supabase
        .from('stores')
        .select('mayar_api_key')
        .eq('id', store_id)
        .single()

      mayarApiKey = store?.mayar_api_key?.trim()
    }

    if (!mayarApiKey) {
      throw new Error('API Key tidak ditemukan. Silakan masukkan API Key Mayar terlebih dahulu.')
    }

    // Test the API Key by calling account balance endpoint (docs: /hl/v1/balance)
    const testResponse = await fetch('https://api.mayar.id/hl/v1/balance', {
      headers: {
        'Authorization': `Bearer ${mayarApiKey}`
      }
    })

    const contentType = testResponse.headers.get('content-type') || ''
    
    if (testResponse.ok && contentType.includes('application/json')) {
      const data = await testResponse.json()
      return new Response(
        JSON.stringify({ 
          success: true, 
          balance: data.data?.balance || 0,
          message: 'API Key valid dan terhubung!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      const errorText = contentType.includes('application/json') 
        ? JSON.stringify(await testResponse.json())
        : await testResponse.text()
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Mayar menolak API Key (Status ${testResponse.status}). Pastikan API Key benar, memiliki scope "Read & Write", dan KYC sudah terverifikasi.`,
          detail: errorText.slice(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
