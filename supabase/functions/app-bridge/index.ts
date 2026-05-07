import { S3Client } from "https://deno.land/x/s3_lite_client@0.6.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    console.log(`[App Bridge] Action: ${action}`)

    // --- HANDLER 1: R2 SIGNER (FIXED: bucketName inside getPresignedUrl) ---
    if (action === 'sign-r2') {
      const s3 = new S3Client({
        endPoint: Deno.env.get("R2_ENDPOINT")?.replace('https://', '') || "",
        region: "auto",
        accessKey: Deno.env.get("R2_ACCESS_KEY_ID") || "",
        secretKey: Deno.env.get("R2_SECRET_ACCESS_KEY") || "",
        useSSL: true,
      });

      // S3 Lite memerlukan bucketName di dalam opsi getPresignedUrl
      const folder = payload.folder || 'products';
      const uploadUrl = await s3.getPresignedUrl("PUT", `${folder}/${payload.filename}`, {
        expirySeconds: 60,
        bucketName: Deno.env.get("R2_BUCKET_NAME") || "tradixa-assets", 
      });
      
      return new Response(JSON.stringify({ 
        uploadUrl, 
        publicUrl: `${Deno.env.get("R2_PUBLIC_URL")}/${folder}/${payload.filename}` 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- HANDLER 2: CLOUDINARY SIGNER ---
    if (action === 'sign-cloudinary') {
      const timestamp = Math.round(new Date().getTime() / 1000)
      const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") || ""
      const params = `folder=${payload.folder}&timestamp=${timestamp}${apiSecret}`
      
      const msgUint8 = new TextEncoder().encode(params)
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
      const signature = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      return new Response(JSON.stringify({ signature, timestamp, apiKey: Deno.env.get("CLOUDINARY_API_KEY") }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- HANDLER 3: RESEND EMAIL ---
    if (action === 'send-email') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- HANDLER 4: GOOGLE VISION ---
    if (action === 'analyze-vision') {
      const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY")
      const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { status: 404, headers: corsHeaders })

  } catch (error: any) {
    console.error(`[App Bridge] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: `Server Error: ${error.message}` }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
