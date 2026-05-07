// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  const url = new URL(req.url)
  const targetId = url.searchParams.get('id')
  const type = url.searchParams.get('type') || 'campaign'
  const redirectUrl = url.searchParams.get('url') || 'https://tradixasystems.com'

  if (targetId) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update clicked_count di database
    await supabase.rpc('increment_marketing_stat', { 
      target_id: targetId, 
      stat_type: 'click',
      entity_type: type
    })
  }

  // Redirect ke tujuan asli
  return Response.redirect(redirectUrl, 302)
})
