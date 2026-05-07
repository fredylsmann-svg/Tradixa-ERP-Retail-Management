import { getEmailTemplate } from '../utils/emailTemplates';
import { supabase } from '../lib/supabase';

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
   * Placeholder untuk WhatsApp Meta API
   */
  async sendWhatsApp({ to, templateName, components }) {
    console.log(`[Simulasi WA] Mengirim template ${templateName} ke ${to}`);
    return { success: true };
  }
};

export default marketingApi;
