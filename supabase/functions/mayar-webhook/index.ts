// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SaaS plan prices — must match planConfig.js
const SAAS_PRICES: Record<number, { plan: string; cycle: string }> = {
  1000: { plan: 'pro', cycle: 'monthly' },         // Pro monthly (sandbox)
  10000: { plan: 'pro', cycle: 'yearly' },          // Pro yearly (sandbox)
  15000: { plan: 'pro', cycle: 'monthly' },         // Pro monthly (testing Rp 15.000)
  150000: { plan: 'pro', cycle: 'yearly' },         // Pro yearly (testing Rp 150.000)
  149000: { plan: 'pro', cycle: 'monthly' },        // Pro monthly (production)
  1490000: { plan: 'pro', cycle: 'yearly' },        // Pro yearly (production)
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
    const paymentDescription = String(payload.data?.productDescription || payload.data?.description || '')
    const isSaaSPayment = paymentDescription.toLowerCase().includes('saas upgrade')
    const isPaymentSuccess = dataStatus === 'SUCCESS' || dataStatus === 'PAID' || dataStatus === 'COMPLETED' || dataStatus === 'SETTLEMENT'

    if (isSaaSPayment && isPaymentSuccess) {
      // Parse store_id, plan, and cycle directly from description
      const storeMatch = paymentDescription.match(/Store:\s*([a-zA-Z0-9-]+)/)
      const planMatch = paymentDescription.match(/Plan:\s*([a-zA-Z0-9-]+)/)
      const cycleMatch = paymentDescription.match(/Cycle:\s*([a-zA-Z]+)/)

      // Determine store ID: prefer description parsing, fallback to user email lookup
      let targetStoreId = storeMatch ? storeMatch[1] : null
      const planId = planMatch ? planMatch[1] : (SAAS_PRICES[amount]?.plan || 'pro')
      const billingCycle = cycleMatch ? cycleMatch[1] : (SAAS_PRICES[amount]?.cycle || 'monthly')

      // Fallback: find store by email if description parsing failed
      if (!targetStoreId && customerEmail) {
        const { data: user } = await supabase
          .from('users')
          .select('store_id, current_store_id')
          .eq('email', customerEmail)
          .single()
        targetStoreId = user?.current_store_id || user?.store_id
      }

      if (targetStoreId) {
        // Calculate subscription dates
        const now = new Date()
        const expiresAt = new Date(now)
        if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        // Upgrade the store plan with dates!
        const { error: updateError } = await supabase
          .from('stores')
          .update({ 
            plan: planId,
            has_used_trial: false,
            plan_started_at: now.toISOString(),
            plan_expires_at: expiresAt.toISOString()
          })
          .eq('id', targetStoreId)

        if (updateError) {
          throw new Error(`Failed to upgrade store: ${updateError.message}`)
        }

        // Update pending subscription to active, or insert new one
        const { data: pendingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('store_id', targetStoreId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (pendingSub) {
          await supabase.from('subscriptions').update({
            status: 'active',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            notes: `mayar_confirmed|cycle:${billingCycle}|txn:${payload.data?.transactionId || productId}`,
          }).eq('id', pendingSub.id)
        } else {
          await supabase.from('subscriptions').insert({
            store_id: targetStoreId,
            plan: planId,
            status: 'active',
            payment_method: 'mayar',
            amount: amount,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            notes: `mayar_confirmed|cycle:${billingCycle}|txn:${payload.data?.transactionId || productId}`,
          })
        }

        console.log(`[Tradixa Webhook] ✅ SaaS Upgrade: Store ${targetStoreId} → ${planId} (${billingCycle}). Expires: ${expiresAt.toISOString()}`)

        return new Response(JSON.stringify({ 
          received: true, 
          type: 'saas_upgrade_ok', 
          plan: planId,
          store_id: targetStoreId 
        }), { 
          headers: { 'Content-Type': 'application/json' }, 
          status: 200 
        })
      }
    }

    // ─── 2. INVOICE / RECEIVABLE LOGIC ───
    if (eventName === 'payment.received') {
      const paymentId = productId

      // Find the receivable by payment_gateway_id
      const { data: receivablesList } = await supabase
        .from('receivables')
        .select('*')
        .eq('payment_gateway_id', paymentId)
        .limit(1)
      
      const receivable = receivablesList && receivablesList.length > 0 ? receivablesList[0] : null

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
        const { data: bankList } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('store_id', receivable.store_id)
          .limit(1)
        
        const bank = bankList && bankList.length > 0 ? bankList[0] : null

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
        const { data: salesG } = await supabase
          .from('sales_transactions')
          .select('*')
          .eq('payment_gateway_id', paymentId)
          .limit(1)

        let salesTx = salesG && salesG.length > 0 ? salesG[0] : null;

        // Fallback 2: Check by parsing invoice number from descriptions
        if (!salesTx) {
          const descText = String(payload.data?.productDescription || payload.data?.description || '');
          const invoiceMatch = descText.match(/INV-\d+/);
          const invoiceNumber = invoiceMatch ? invoiceMatch[0] : null;

          if (invoiceNumber) {
            const { data: salesInv } = await supabase
              .from('sales_transactions')
              .select('*')
              .eq('invoice_number', invoiceNumber)
              .limit(1)
            salesTx = salesInv && salesInv.length > 0 ? salesInv[0] : null;
          }
        }

        // Fallback 3: Check by pending QRIS transaction with exact matching amount
        if (!salesTx) {
          const { data: salesByAmount } = await supabase
            .from('sales_transactions')
            .select('*')
            .eq('payment_status', 'Pending')
            .eq('payment_method', 'QRIS')
            .eq('total', amount)
            .order('created_at', { ascending: false })
            .limit(1)
          salesTx = salesByAmount && salesByAmount.length > 0 ? salesByAmount[0] : null;
        }

        if (salesTx) {
          await supabase
            .from('sales_transactions')
            .update({
              payment_status: 'Paid',
              paid_amount: salesTx.total
            })
            .eq('id', salesTx.id)

          // Find bank and create bank transaction
          const { data: bankList } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('store_id', salesTx.store_id)
            .limit(1)

          const bank = bankList && bankList.length > 0 ? bankList[0] : null

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
