import { getEmailTemplate } from '../utils/emailTemplates';
import { supabase } from '../lib/supabase';
import { getEffectiveLimits } from '../planConfig';

export const marketingApi = {
  /**
   * Mengirim Email menggunakan Supabase Edge Function (Bypass CORS)
   */
  async sendEmail({ to, subject, html, storeName = 'Toko Kami', templateType = 'Standard', from, ctaUrl = '#', promoImage = '' }) {
    // Jika html sudah berupa full template (mengandung tag div atau html), gunakan langsung.
    // Jika tidak, baru bungkus dengan template.
    const isFullTemplate = html?.includes('<div') || html?.includes('<html');
    const finalHtml = isFullTemplate ? html : getEmailTemplate({ storeName, html, templateType, ctaUrl, promoImage });

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          from: from || `${storeName} <admin@mail.tradixasystems.com>`,
          to,
          subject,
          html: finalHtml,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[Tradixa] Email Error:', error);
      throw error;
    }
  },

  /**
   * Mendapatkan penggunaan email bulan ini (Marketing + Transactional)
   */
  async getMonthlyEmailUsage(storeId) {
    if (!storeId) return 0;
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    try {
      // 1. Hitung dari Marketing Campaigns
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('sent_count')
        .eq('store_id', storeId)
        .gte('created_date', startOfMonth);
      
      const marketingSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;

      // 2. Hitung dari Transactional Logs (Email yang tidak berasal dari campaign)
      const { count: transactionalSent } = await supabase
        .from('communication_logs')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('type', 'Email')
        .or('campaign_id.is.null,campaign_id.eq.')
        .gte('created_date', startOfMonth);

      return marketingSent + (transactionalSent || 0);
    } catch (err) {
      console.error('[Tradixa] Error calculating email usage:', err);
      return 0;
    }
  },

  /**
   * Helper untuk validasi kuota sebelum kirim
   */
  async checkEmailQuota(store) {
    if (!store) return { allowed: false, message: 'Data store tidak ditemukan' };
    
    const plan = store.plan || 'free';
    const isTrial = plan === 'pro' && store.has_used_trial;

    if (plan === 'free') {
      return { allowed: false, message: 'Fitur email hanya tersedia di paket berbayar (Pro / Premium). Silakan upgrade.' };
    }

    if (isTrial) {
      // Trial limit: 5 total
      const { data: allCampaigns } = await supabase.from('marketing_campaigns').select('sent_count').eq('store_id', store.id);
      const { count: allLogs } = await supabase.from('communication_logs').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('type', 'Email').or('campaign_id.is.null,campaign_id.eq.');
      const totalSent = (allCampaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0) + (allLogs || 0);
      
      if (totalSent >= 5) {
        return { allowed: false, message: 'Kuota Trial habis (5/5). Upgrade paket untuk kuota lebih besar.' };
      }
      return { allowed: true, remaining: 5 - totalSent };
    }

    // Dynamic limit lookup from planConfig
    const limits = getEffectiveLimits(store);
    const limit = limits.emailCreditsPerMonth || 0;

    if (limit === Infinity) {
      return { allowed: true, remaining: Infinity };
    }

    if (limit > 0) {
      const usage = await this.getMonthlyEmailUsage(store.id);
      if (usage >= limit) {
        return { allowed: false, message: `Kuota bulan ini habis (${usage}/${limit}). Akan direset awal bulan depan.` };
      }
      return { allowed: true, remaining: limit - usage };
    }

    return { allowed: false, message: 'Plan tidak valid atau tidak memiliki kuota email' };
  }
};

export default marketingApi;
