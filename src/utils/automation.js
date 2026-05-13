import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { getEmailTemplate } from '@/utils/emailTemplates';

/**
 * TRADIXA - Automation Engine (Simulation)
 * 
 * Fungsi ini digunakan untuk mengeksekusi aturan automasi marketing
 * berdasarkan pemicu (trigger) tertentu.
 * 
 * @param {string} storeId - ID Toko
 * @param {string} trigger - Jenis pemicu (e.g. 'New Customer', 'Birthday')
 * @param {object} contextData - Data tambahan untuk konteks (e.g. data customer baru)
 */
export async function executeAutomation(storeId, trigger, contextData = {}) {
  try {
    console.log(`[Tradixa Automation] Checking rules for trigger: ${trigger}`);
    
    // 1. Ambil data toko untuk nama pengirim dan WhatsApp
    const store = await api.entities.Store.get(storeId);
    const storeName = store?.store_name || 'Tradixa Store';
    const storePhone = store?.phone || '';
    const ownerName = store?.owner_name || 'Admin';

    // --- EMAIL LIMIT CHECK (hitung langsung dari data campaign) ---
    const storePlan = store?.plan || 'free';
    const isTrial = storePlan === 'pro' && store?.has_used_trial;
    const isPaidPro = storePlan === 'pro' && !store?.has_used_trial;

    if (storePlan === 'free') {
      console.log(`[Tradixa Automation] Free plan — email automation disabled.`);
      return;
    }

    // Hitung total email terkirim dari tabel campaign (source of truth)
    const allCampaigns = await api.entities.MarketingCampaign.filter({ store_id: storeId });
    const totalEmailsSent = allCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);

    if (isTrial && totalEmailsSent >= 5) {
      console.log(`[Tradixa Automation] Trial email limit reached (${totalEmailsSent}/5). Skipping automation.`);
      return;
    }

    if (isPaidPro) {
      const now = new Date();
      const thisMonthEmails = allCampaigns
        .filter(c => {
          if (!c.created_date) return false;
          const d = new Date(c.created_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, c) => sum + (c.sent_count || 0), 0);
      if (thisMonthEmails >= 250) {
        console.log(`[Tradixa Automation] Monthly email limit reached (${thisMonthEmails}/250). Skipping automation.`);
        return;
      }
    }
    // -------------------------

    // 2. Ambil semua aturan aktif untuk trigger ini
    const activeRules = await api.entities.AutomationRule.filter({
      store_id: storeId,
      trigger: trigger,
      is_active: true
    });

    if (activeRules.length === 0) {
      console.log(`[Tradixa Automation] No active rules found for trigger: ${trigger}`);
      return;
    }

    for (const rule of activeRules) {
      // Ganti placeholder {{name}} dengan nama customer asli
      let message = rule.campaign_template?.message || 'Halo! Selamat bergabung di toko kami.';
      if (contextData.name) {
        message = message.replace(/{{name}}/g, contextData.name);
      }

      // 3. Kirim email melalui Resend via Supabase Edge Function
      if (contextData.email) {
        try {

          // Build WhatsApp Link
          const formatWA = (num) => {
            if (!num) return '';
            let clean = num.replace(/\D/g, '');
            if (clean.startsWith('0')) clean = '62' + clean.substring(1);
            return clean;
          };
          const waMessage = `Halo ${ownerName}, saya tertarik dengan promo nya, bolehkan minta detail nya?`;
          const waUrl = storePhone ? `https://wa.me/${formatWA(storePhone)}?text=${encodeURIComponent(waMessage)}` : '#';

          const trackingPixel = `<img src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-open?id=${rule.id}&type=automation&apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}" width="1" height="1" style="display:none !important;" />`;
          const trackedCtaUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-click?id=${rule.id}&type=automation&url=${encodeURIComponent(waUrl)}&apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}`;

          const emailHtml = getEmailTemplate({
            storeName: storeName,
            html: `<h2>${rule.rule_name}</h2><p>${message}</p>${trackingPixel}`,
            templateType: rule.campaign_template?.template_type || 'Standard',
            ctaUrl: trackedCtaUrl,
            promoImage: rule.promo_image_url || ''
          });

          const { data, error: functionError } = await supabase.functions.invoke('app-bridge', {
            body: {
              action: 'send-email',
              payload: {
                to: contextData.email,
                subject: rule.email_subject || rule.rule_name,
                from: `${storeName} <admin@mail.tradixasystems.com>`,
                html: emailHtml
              }
            }
          });

          if (functionError) {
            console.error(`[Tradixa Automation] Resend Function Error (403/400):`, functionError);
          } else {
            console.log(`[Tradixa Automation] Email sent successfully via Resend to: ${contextData.email}`, data);
          }
        } catch (emailErr) {
          console.error(`[Tradixa Automation] Critical Error calling Function:`, emailErr.message);
        }
      }
      
      // 3. Update statistik pada aturan tersebut
      const currentExecutions = parseInt(rule.total_executions || 0);
      await api.entities.AutomationRule.update(rule.id, {
        total_executions: currentExecutions + 1,
        last_run: new Date().toISOString()
      });

      // 4. Catat ke Log Komunikasi
      await api.entities.CommunicationLog.create({
        store_id: storeId,
        customer_id: contextData.id,
        rule_id: rule.id,
        type: 'Email',
        subject: rule.rule_name,
        status: 'Sent',
        content: message
      });
    }
  } catch (err) {
    console.error(`[Tradixa Automation] Main Execution error:`, err.message);
  }
}
