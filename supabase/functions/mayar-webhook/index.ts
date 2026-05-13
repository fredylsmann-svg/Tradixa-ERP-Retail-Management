// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SaaS plan prices — must match planConfig.js
const SAAS_PRICES: Record<number, { plan: string; days: number }> = {
  1000: { plan: 'pro', days: 30 },         // Pro monthly (sandbox)
  10000: { plan: 'pro', days: 365 },       // Pro yearly (sandbox)
  1500: { plan: 'enterprise', days: 30 },  // Enterprise monthly (sandbox)
  15000: { plan: 'enterprise', days: 365 },// Enterprise yearly (sandbox)
  149000: { plan: 'pro', days: 30 },       // Pro monthly (production)
  1490000: { plan: 'pro', days: 365 },     // Pro yearly (production)
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let payload = {}
    try {
      if (req.method === 'POST') {
        payload = await req.json()
      }
    } catch (e) {
      // Ignored for testing endpoints that might send empty bodies
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract key fields from Mayar payload
    const productId = payload.data?.productId || payload.data?.id || ''
    const dataStatus = String(payload.data?.status || '').toUpperCase()
    const amount = Number(payload.data?.amount || 0)
    const customerEmail = payload.data?.customerEmail || ''
    const eventName = String(payload.event || '')

    // ─── 1. SaaS UPGRADE CHECK ───
    // Identify SaaS payments by description or amount matching
    const paymentDescription = String(payload.data?.productDescription || payload.data?.description || '').toLowerCase()
    const isSaaSPayment = paymentDescription.includes('saas upgrade') || (SAAS_PRICES[amount] && paymentDescription.includes('tradixa'))
    const matched = SAAS_PRICES[amount]
    const matchedPlan = matched?.plan

    if (isSaaSPayment && matchedPlan && customerEmail && (dataStatus === 'SUCCESS' || dataStatus === 'PAID' || dataStatus === 'COMPLETED' || dataStatus === 'SETTLEMENT')) {
      // Find the user by email to get their store_id
      const { data: user } = await supabase
        .from('users')
        .select('store_id, current_store_id')
        .eq('email', customerEmail)
        .single()

      const targetStoreId = user?.current_store_id || user?.store_id;

      if (targetStoreId) {
        // Calculate subscription dates
        const durationDays = matched?.days || 30
        const now = new Date()
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

        // Upgrade the store plan with dates!
        const { error: updateError } = await supabase
          .from('stores')
          .update({ 
            plan: matchedPlan,
            has_used_trial: false,
            plan_started_at: now.toISOString(),
            plan_expires_at: expiresAt.toISOString()
          })
          .eq('id', targetStoreId)

        if (updateError) {
          throw new Error(`Failed to upgrade store: ${updateError.message}`)
        }

        // Save to subscriptions for billing history
        await supabase.from('subscriptions').insert({
          store_id: targetStoreId,
          plan: matchedPlan,
          status: 'active',
          payment_method: 'mayar',
          amount: amount,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          notes: `productId:${productId}|email:${customerEmail}|days:${durationDays}`,
        })

        return new Response(JSON.stringify({ 
          received: true, 
          type: 'saas_upgrade_ok', 
          plan: matchedPlan,
          store_id: targetStoreId 
        }), { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        })
      }
    }

    // ─── 2. INVOICE / RECEIVABLE LOGIC (existing, unchanged) ───
    if (eventName === 'payment.received') {
      const paymentId = productId

      // Find the receivable by payment_gateway_id
      const { data: receivable, error: recError } = await supabase
        .from('receivables')
        .select('*')
        .eq('payment_gateway_id', paymentId)
        .single()

      if (receivable) {
        // Update Receivable to Paid
        await supabase
          .from('receivables')
          .update({
            status: 'Paid',
            paid_amount: receivable.amount,
            remaining_amount: 0
          })
          .eq('id', receivable.id)

        // Find standard Bank/Kas Account to record it
        const { data: bank } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('store_id', receivable.store_id)
          .limit(1)
          .single()

        // Create Bank Transaction
        const newBalance = (bank?.balance || 0) + Number(amount)
        if (bank) {
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', bank.id)

          await supabase
            .from('bank_transactions')
            .insert({
              store_id: receivable.store_id,
              bank_account_id: bank.id,
              bank_name: bank.bank_name,
              transaction_type: 'Credit',
              amount: Number(amount),
              description: `Pelunasan Piutang (Mayar) - ${receivable.id}`,
              reference: paymentId,
              balance_after: newBalance,
              status: 'Approved',
              payment_proof_url: receivable.payment_link || 'Mayar Auto-Verified'
            })
        }
      } else {
        // Fallback: Check if it's a direct Sales Transaction
        const invoiceMatch = payload.data?.productDescription?.match(/INV-\d+/);
        const invoiceNumber = invoiceMatch ? invoiceMatch[0] : null;

        if (invoiceNumber) {
          const { data: salesTx } = await supabase
            .from('sales_transactions')
            .select('*')
            .eq('invoice_number', invoiceNumber)
            .single()

          if (salesTx) {
            await supabase
              .from('sales_transactions')
              .update({
                payment_status: 'Paid',
                paid_amount: salesTx.total
              })
              .eq('id', salesTx.id)

            // Find bank and create bank transaction
            const { data: bank } = await supabase
              .from('bank_accounts')
              .select('*')
              .eq('store_id', salesTx.store_id)
              .limit(1)
              .single()

            if (bank) {
              const newBalance = (bank?.balance || 0) + Number(amount)
              await supabase
                .from('bank_accounts')
                .update({ balance: newBalance })
                .eq('id', bank.id)

              await supabase
                .from('bank_transactions')
                .insert({
                  store_id: salesTx.store_id,
                  bank_account_id: bank.id,
                  bank_name: bank.bank_name,
                  transaction_type: 'Credit',
                  amount: Number(amount),
                  description: `Pembayaran Penjualan QRIS/VA (Mayar) - ${salesTx.invoice_number}`,
                  reference: paymentId,
                  balance_after: newBalance,
                  status: 'Approved',
                  payment_proof_url: salesTx.payment_proof_url || 'Mayar Auto-Verified'
                })
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { 'Content-Type': 'application/json' }, 
      status: 200 
    })
  } catch (error: any) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('customers').insert({ name: 'WEBHOOK_ERROR', email: error.message?.substring(0, 50), phone: error.stack?.substring(0, 50) })
    } catch(e) {}
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
