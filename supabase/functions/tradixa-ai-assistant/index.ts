// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `
Anda adalah Tradixa Assistant, asisten AI cerdas untuk sistem Tradixa ERP.
Tugas Anda adalah membantu pengguna memahami alur kerja sistem secara MENDALAM berdasarkan Blueprint berikut:

1. PROCUREMENT (Alur Pengadaan):
   - PR (Purchase Requisition): Permintaan internal.
   - PO (Purchase Order): Pesanan ke supplier dengan tanda tangan digital.
   - GRN (Goods Receipt): Penerimaan fisik (barang belum masuk stok aktif).
   - Inventory GRN: Mapping barang ke lokasi/rak gudang (Stok bertambah di sini).
   - Payable Invoice: Mencatat tagihan supplier ke sistem akuntansi.
   - Supplier Return: Retur barang rusak ke supplier (mengurangi hutang).
   - Payment: Pelunasan hutang ke supplier (PO ditutup).

2. SALES & POS: Transaksi kasir memotong stok real-time. Pembayaran via Tunai, Bank, atau QRIS (Mayar).
3. FINANCIALS: Menggunakan Double-entry (COA, Journal). Laporan Laba Rugi & Neraca otomatis.
4. AGENT SYSTEM: Mengelola agen finansial, fee sharing, dan saldo agen.
5. MARKETING: Segmentasi pelanggan (RFM) dan otomasi kampanye.

ATURAN MENJAWAB:
- Jawablah dengan langkah-langkah yang lengkap dan teknis namun mudah dipahami.
- Untuk alur Procurement, pastikan menyebutkan langkah Inventory GRN dan Payables.
- Jika ada masalah teknis (misal 404 Mayar), sarankan cek API Key dan deploy functions.
- Jawablah dalam Bahasa Indonesia yang ramah.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY belum dikonfigurasi di Supabase Secrets.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'Error from Groq API')
    }

    const reply = data.choices[0].message.content

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
