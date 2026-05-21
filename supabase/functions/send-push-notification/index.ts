// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleAuth } from "https://esm.sh/google-auth-library@9.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, body, store_id, target_user_id } = await req.json()

    if (!title || !body || !store_id) {
      throw new Error('Missing required fields: title, body, and store_id are required.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Service Role Key is not configured in environment variables.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Verify Gating: Check if the store's plan is premium
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('plan')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      throw new Error(`Failed to resolve store details: ${storeError?.message || 'Store not found'}`)
    }

    // Only allow Premium stores to send push notifications
    if (store.plan !== 'premium') {
      return new Response(
        JSON.stringify({ success: false, error: 'Push notifications are exclusive to the Premium Plan. Please upgrade.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // 2. Query FCM Tokens for the store (and optional target user)
    let query = supabase
      .from('user_push_subscriptions')
      .select('fcm_token, device_name')
      .eq('store_id', store_id)

    if (target_user_id) {
      query = query.eq('user_id', target_user_id)
    }

    const { data: subscriptions, error: subsError } = await query
    if (subsError) {
      throw new Error(`Failed to retrieve push subscriptions: ${subsError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No registered devices found for this target.', sentCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 3. Get Firebase Service Account credentials and initialize auth
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error('Firebase Service Account credentials are not configured in FIREBASE_SERVICE_ACCOUNT environment secret.')
    }

    const serviceAccount = JSON.parse(serviceAccountStr)
    const projectId = serviceAccount.project_id

    const auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })

    const client = await auth.getClient()
    const tokenResponse = await client.getAccessToken()
    const accessToken = tokenResponse.token

    if (!accessToken) {
      throw new Error('Failed to generate Firebase OAuth2 access token.')
    }

    // 4. Send FCM messages in parallel
    const sendPromises = subscriptions.map(async (sub) => {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
      const payload = {
        message: {
          token: sub.fcm_token,
          notification: {
            title: title,
            body: body,
          },
          webpush: {
            notification: {
              icon: '/icons/icon-192x192.png', // Default icon path
              badge: '/icons/icon-72x72.png',
              click_action: '/', // Clicking notification opens app root
            }
          }
        }
      }

      try {
        const res = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`FCM error for device ${sub.device_name}: ${errText}`)
          return { device: sub.device_name, success: false, error: errText }
        }

        return { device: sub.device_name, success: true }
      } catch (err: any) {
        console.error(`Failed to send to device ${sub.device_name}: ${err.message}`)
        return { device: sub.device_name, success: false, error: err.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const sentCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ success: true, sentCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
