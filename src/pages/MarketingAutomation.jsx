import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, Pause, Mail, MessageSquare, TrendingUp, Zap, Clock, Send, Eye, X, Users, User, Loader2, Edit, ChevronDown, Megaphone, Copy, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ResponsiveContainer } from 'recharts';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { marketingApi } from '@/api/marketing';
import { getEmailTemplate } from '../utils/emailTemplates';
import { toast } from 'sonner';
import { supabase } from "@/lib/supabase";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import PageHeader from "@/components/layout/PageHeader";
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
const formatWA = (num) => {
  if (!num) return '';
  // Hilangkan semua karakter non-digit
  let clean = num.replace(/\D/g, '');

  // Jika diawali '0', ganti dengan '62' (Indonesia)
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  }
  // Jika diawali '8' (misal 812...), tambahkan '62'
  else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }

  return clean;
};

export default function MarketingAutomation({ store }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    campaign_name: '',
    campaign_type: 'Email',
    trigger_type: 'Manual',
    segment_id: '',
    target_customer_ids: [],
    is_all_customers: false,
    subject: '',
    message_content: '',
    schedule_date: '',
    template_type: 'Standard',
    promo_image_url: '',
    wa_message: '',
    cta_text: 'Belanja Sekarang'
  });
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    email_subject: '',
    trigger: 'Birthday',
    message_template: '',
    template_type: 'Standard',
    promo_image_url: '',
    wa_message: '',
    cta_text: 'Belanja Sekarang'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityLogs, setEntityLogs] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState('');

  const handleShowPreview = () => {
    let waMessage = (campaignForm.wa_message || '').trim();
    if (!waMessage) waMessage = `Halo ${store?.store_name || 'Admin'}, saya tertarik dengan promo ini!`;
    const phone = formatWA(store?.phone);
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMessage.replace(/{{name}}/g, 'Customer'))}`
      : '#';

    const html = getEmailTemplate({
      storeName: store?.store_name || 'Toko Anda',
      html: campaignForm.message_content || '<i>(Isi pesan belum diisi)</i>',
      templateType: campaignForm.template_type,
      ctaUrl: waUrl,
      promoImage: campaignForm.promo_image_url,
      fontFamily: store?.font_family || 'Inter',
      brandColor: store?.brand_color || '#2563eb',
      showLogo: store?.show_marketing_logo ?? true,
      ctaText: campaignForm.cta_text || 'Belanja Sekarang',
      logoAlign: store?.marketing_logo_align || 'center',
      logoSize: store?.marketing_logo_size || 'medium',
      trackingPixel: '' // No tracking in preview
    });
    setPreviewData(html);
    setShowPreviewModal(true);
  };

  const handleShowRulePreview = () => {
    let waMessage = (ruleForm.wa_message || '').trim();
    if (!waMessage) waMessage = `Halo ${store?.store_name || 'Admin'}, saya tertarik dengan promo ini!`;
    const phone = formatWA(store?.phone);
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMessage.replace(/{{name}}/g, 'Customer'))}`
      : '#';

    const html = getEmailTemplate({
      storeName: store?.store_name || 'Toko Anda',
      html: ruleForm.message_template || '<i>(Isi pesan belum diisi)</i>',
      templateType: ruleForm.template_type,
      ctaUrl: waUrl,
      promoImage: ruleForm.promo_image_url,
      fontFamily: store?.font_family || 'Inter',
      brandColor: store?.brand_color || '#2563eb',
      logoUrl: store?.logo_url,
      showLogo: store?.show_marketing_logo ?? true,
      ctaText: ruleForm.cta_text || 'Belanja Sekarang',
      logoAlign: store?.marketing_logo_align || 'center',
      logoSize: store?.marketing_logo_size || 'medium',
      trackingPixel: ''
    });
    setPreviewData(html);
    setShowPreviewModal(true);
  };
  const [chartLimit, setChartLimit] = useState('10');


  useEffect(() => {
    if (!store?.id) return;
    loadData();

    // Listener untuk tombol refresh di Header
    const handleRefreshEvent = () => {
      loadData();
    };
    window.addEventListener('refresh_data', handleRefreshEvent);

    // Setup Realtime Listener for sync
    const channel = supabase
      .channel('marketing-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'marketing_campaigns',
        filter: `store_id=eq.${store.id}`
      }, () => loadData())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'marketing_automation_rules',
        filter: `store_id=eq.${store.id}`
      }, () => loadData())
      .subscribe();

    return () => {
      window.removeEventListener('refresh_data', handleRefreshEvent);
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  const loadData = async () => {
    const [campData, ruleData, segData, custData] = await Promise.all([
      api.entities.MarketingCampaign.filter({ store_id: store.id }),
      api.entities.AutomationRule.filter({ store_id: store.id }),
      api.entities.CustomerSegment.filter({ store_id: store.id }),
      api.entities.Customer.filter({ store_id: store.id })
    ]);
    setCampaigns(campData);
    setAutomationRules(ruleData);
    setSegments(segData);
    setCustomers(custData || []);
  };

  const handleShowLogs = async (entity, type) => {
    setSelectedEntity({ ...entity, logType: type });
    setShowLogModal(true);
    try {
      const filter = type === 'campaign' ? { campaign_id: entity.id } : { rule_id: entity.id };
      const logData = await api.entities.CommunicationLog.filter(filter);

      // Map customer names
      const enrichedLogs = logData.map(log => {
        const customer = customers.find(c => c.id === log.customer_id);
        return {
          ...log,
          customer_name: customer ? customer.name : 'Unknown Customer',
          customer_email: customer ? customer.email : '-'
        };
      });

      setEntityLogs(enrichedLogs);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data log. Pastikan Anda sudah menjalankan migrasi terbaru (021_link_logs_to_entities.sql).');
    }
  };

  const handlePromoUpload = async (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.storage.upload(file);
      if (formType === 'campaign') {
        setCampaignForm(prev => {
          const currentUrls = (prev.promo_image_url || '').split(',').map(u => u.trim()).filter(Boolean);
          if (currentUrls.length >= 5) {
            toast.error('Maksimal 5 foto promosi');
            return prev;
          }
          const newUrls = [...currentUrls, res.url].filter(Boolean);
          return { ...prev, promo_image_url: newUrls.join(',') };
        });
      } else {
        setRuleForm(prev => {
          const currentUrls = (prev.promo_image_url || '').split(',').map(u => u.trim()).filter(Boolean);
          if (currentUrls.length >= 5) {
            toast.error('Maksimal 5 foto promosi');
            return prev;
          }
          const newUrls = [...currentUrls, res.url].filter(Boolean);
          return { ...prev, promo_image_url: newUrls.join(',') };
        });
      }
      toast.success('Foto berhasil diupload');
      if (e.target) e.target.value = ''; // Reset input to prevent double trigger
    } catch (err) {
      toast.error('Gagal upload foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();

    // Manual Validation
    if (!campaignForm.campaign_name) return toast.error('Nama kampanye wajib diisi!');
    if (!campaignForm.message_content) return toast.error('Konten pesan wajib diisi!');
    if (!campaignForm.is_all_customers && campaignForm.target_customer_ids.length === 0) {
      return toast.error('Pilih minimal satu customer atau centang "Seluruh Customer"!');
    }

    const tid = toast.loading('Sedang menyimpan kampanye...');
    try {
      await api.entities.MarketingCampaign.create({
        ...campaignForm,
        target_customer_ids: campaignForm.target_customer_ids.join(','),
        store_id: store.id,
        is_automated: campaignForm.trigger_type !== 'Manual',
        status: 'Draft'
      });
      toast.success('Kampanye berhasil dibuat', { id: tid });
      setShowCampaignForm(false);
      setCampaignForm({
        campaign_name: '', campaign_type: 'Email', trigger_type: 'Manual',
        segment_id: '', target_customer_ids: [], is_all_customers: false,
        subject: '', message_content: '', schedule_date: '',
        template_type: 'Standard', promo_image_url: '', wa_message: '',
        cta_text: 'Belanja Sekarang'
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat kampanye', { id: tid });
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    await api.entities.AutomationRule.create({
      store_id: store.id,
      rule_name: ruleForm.rule_name,
      email_subject: ruleForm.email_subject || ruleForm.rule_name,
      trigger: ruleForm.trigger,
      is_active: true,
      promo_image_url: ruleForm.promo_image_url,
      campaign_template: {
        type: 'Email',
        message: ruleForm.message_template,
        template_type: ruleForm.template_type,
        wa_message: ruleForm.wa_message,
        cta_text: ruleForm.cta_text || 'Belanja Sekarang'
      }
    });
    setShowRuleForm(false);
    setRuleForm({
      rule_name: '', email_subject: '', trigger: 'Birthday',
      message_template: '', template_type: 'Standard', promo_image_url: '',
      wa_message: '', cta_text: 'Belanja Sekarang'
    });
    loadData();
  };

  const handleToggleCampaign = async (campaign) => {
    const newStatus = campaign.status === 'Running' ? 'Paused' : 'Running';
    await api.entities.MarketingCampaign.update(campaign.id, { status: newStatus });
    loadData();
  };

  const handleToggleRule = async (rule) => {
    await api.entities.AutomationRule.update(rule.id, { is_active: !rule.is_active });
    loadData();
  };

  const handleExecuteCampaign = async (campaign) => {
    if (campaign.status === 'Sent') return;

    // --- CREDIT LIMIT CHECK (hitung langsung dari data campaign) ---
    const storePlan = store?.plan || 'free';
    const isTrial = storePlan === 'pro' && store?.has_used_trial;
    const isPaidPro = storePlan === 'pro' && !store?.has_used_trial;

    if (storePlan === 'free') {
      toast.error('Fitur Email Marketing hanya tersedia di paket Pro. Upgrade untuk menggunakan fitur ini.', { duration: 5000 });
      return;
    }

    // Hitung total email terkirim langsung dari tabel (source of truth)
    const allCampaigns = await api.entities.MarketingCampaign.filter({ store_id: store?.id });
    const totalEmailsSent = allCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);

    // Hitung juga email transaksional (Invoice, Low Stock) dari communication_logs
    const { count: transactionalCount } = await supabase
      .from('communication_logs')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store?.id)
      .eq('type', 'Email')
      .or('campaign_id.is.null,campaign_id.eq.');
    const totalTransactional = transactionalCount || 0;

    let EMAIL_LIMIT;
    let currentUsage;

    if (isTrial) {
      EMAIL_LIMIT = 5;
      currentUsage = totalEmailsSent + totalTransactional;
    } else if (isPaidPro) {
      EMAIL_LIMIT = 250;
      // Hitung hanya campaign bulan ini
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthCampaigns = allCampaigns.filter(c => {
        if (!c.created_date) return false;
        const d = new Date(c.created_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const campaignUsage = thisMonthCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);

      // Hitung juga transaksional bulan ini
      const { count: monthlyTransactional } = await supabase
        .from('communication_logs')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store?.id)
        .eq('type', 'Email')
        .or('campaign_id.is.null,campaign_id.eq.')
        .gte('created_date', startOfMonth);

      currentUsage = campaignUsage + (monthlyTransactional || 0);
    } else {
      toast.error('Fitur Email Marketing hanya tersedia di paket Pro. Upgrade untuk menggunakan fitur ini.', { duration: 5000 });
      return;
    }

    if (currentUsage >= EMAIL_LIMIT) {
      const msg = isTrial
        ? `Kuota Trial Habis! Anda telah mengirim ${currentUsage} dari maksimal ${EMAIL_LIMIT} email. Upgrade plan untuk melanjutkan.`
        : `Kuota email bulan ini habis (${currentUsage}/${EMAIL_LIMIT}). Kuota akan direset di awal bulan depan.`;
      toast.error(msg, { duration: 5000 });
      return;
    }
    // -------------------------

    try {
      toast.loading('Sedang mengirim kampanye...', { id: 'sending-campaign' });

      let targets = [];

      // Gunakan data customers yang sudah di-load di state
      if (campaign.is_all_customers) {
        targets = customers;
      } else if (campaign.segment_id) {
        targets = customers.filter(c => c.segment_id === campaign.segment_id);
      } else if (campaign.target_customer_ids) {
        const idList = campaign.target_customer_ids.split(',');
        targets = customers.filter(c => idList.includes(c.id));
      }

      if (targets.length === 0) {
        toast.dismiss('sending-campaign');
        toast.error('Tidak ada target pengiriman yang ditemukan.');
        return;
      }

      // --- BATCH LIMIT CHECK ---
      if ((currentUsage + targets.length) > EMAIL_LIMIT) {
        const remaining = Math.max(0, EMAIL_LIMIT - currentUsage);
        toast.dismiss('sending-campaign');
        toast.error(`Kuota tidak mencukupi. Sisa: ${remaining} email. Target: ${targets.length} email.`);
        return;
      }
      // -------------------------

      let successCount = 0;
      let failCount = 0;

      for (const target of targets) {
        try {
          if (campaign.campaign_type === 'Email' && target.email) {
            // Tambahkan jeda agar tidak dianggap spam
            await new Promise(resolve => setTimeout(resolve, 800));

            // Build WhatsApp Link for Store (Customer -> Store)
            let waMessage = (campaign.wa_message || '').trim();
            if (!waMessage) {
              waMessage = `Halo ${store?.store_name || 'Admin'}, saya tertarik dengan promo "${campaign.campaign_name}", boleh minta detailnya?`;
            }
            // Replace placeholder {{name}} if present
            waMessage = waMessage.replace(/{{name}}/g, target.name || 'Admin');

            const phone = formatWA(store?.phone);
            const waUrl = phone
              ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(waMessage)}`
              : '#';

            // Build Email HTML (Back to tracking mode since user managed JWT)
            const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Tracking Pixel
            const trackingPixel = `<img src="${baseUrl}/functions/v1/track-open?id=${campaign.id}&cid=${target.id}&type=campaign&apikey=${anonKey}" width="1" height="1" style="display:none !important;" />`;

            // Fix: Re-enable tracking redirect
            const trackedCtaUrl = `${baseUrl}/functions/v1/track-click?id=${campaign.id}&cid=${target.id}&type=campaign&url=${encodeURIComponent(waUrl)}&apikey=${anonKey}`;

            const emailHtml = getEmailTemplate({
              subject: campaign.subject || campaign.campaign_name,
              html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                  ${campaign.message_content.replace(/{{name}}/g, target.name)}
                </div>
              `,
              storeName: store?.store_name || 'Toko Kami',
              templateType: campaign.template_type || 'Standard',
              ctaUrl: trackedCtaUrl,
              promoImage: campaign.promo_image_url || '',
              fontFamily: store?.font_family || 'Inter',
              brandColor: store?.brand_color || '#2563eb',
              logoUrl: store?.logo_url,
              showLogo: store?.show_marketing_logo ?? true,
              ctaText: campaign.cta_text || 'Belanja Sekarang',
              logoAlign: store?.marketing_logo_align || 'center',
              logoSize: store?.marketing_logo_size || 'medium',
              trackingPixel: trackingPixel
            });

            const { error: sendError } = await supabase.functions.invoke('send-email', {
              body: {
                to: target.email,
                subject: campaign.subject || campaign.campaign_name,
                from: `${store?.store_name || 'Tradixa'} <admin@mail.tradixasystems.com>`,
                html: emailHtml
              }
            });

            if (sendError) throw sendError;

            // 5. Catat ke Log Komunikasi
            await api.entities.CommunicationLog.create({
              store_id: store.id,
              customer_id: target.id,
              campaign_id: campaign.id,
              type: 'Email',
              subject: campaign.subject || campaign.campaign_name,
              content: campaign.message_content,
              status: 'Sent'
            });

            // 6. Catat ke Customer Interaction (untuk tab Activity)
            await api.entities.CustomerInteraction.create({
              store_id: store.id,
              customer_id: target.id,
              interaction_type: 'Email Sent',
              campaign_name: campaign.campaign_name,
              channel: 'Email',
              notes: `Menerima email kampanye: ${campaign.campaign_name}`,
              metadata: {
                campaign_id: campaign.id,
                subject: campaign.subject || campaign.campaign_name
              },
              date: new Date().toISOString()
            });

            successCount++;
          } else if (campaign.campaign_type === 'WhatsApp' && target.phone) {
            await marketingApi.sendWhatsApp({
              to: target.phone,
              message: campaign.message_content.replace('{{name}}', target.name)
            });

            // Catat ke Customer Interaction (untuk tab Activity)
            await api.entities.CustomerInteraction.create({
              store_id: store.id,
              customer_id: target.id,
              interaction_type: 'WhatsApp Sent',
              campaign_name: campaign.campaign_name,
              channel: 'WhatsApp',
              notes: `Menerima pesan WA kampanye: ${campaign.campaign_name}`,
              metadata: {
                campaign_id: campaign.id
              },
              date: new Date().toISOString()
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Gagal mengirim ke ${target.email || target.phone}`, err);
          failCount++;
        }
      }

      // Update statistik kampanye (Pengiriman RIIL)
      await api.entities.MarketingCampaign.update(campaign.id, {
        sent_count: (campaign.sent_count || 0) + successCount,
        status: successCount > 0 ? 'Sent' : 'Failed'
      });

      // Tidak perlu increment usage_stats lagi — campaign sent_count adalah source of truth

      toast.dismiss('sending-campaign');
      toast.success(`Kampanye berhasil dikirim ke ${successCount} pelanggan!`);
      loadData();
    } catch (error) {
      toast.dismiss('sending-campaign');
      toast.error('Gagal memproses kampanye: ' + error.message);
    }
  };

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'Running').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const avgOpenRate = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + (c.opened_count / (c.sent_count || 1)), 0) / campaigns.length * 100).toFixed(1)
    : 0;

  const combinedData = [
    ...campaigns.map(c => ({
      name: c.campaign_name,
      sent: Number(c.sent_count || 0),
      opened: Number(c.opened_count || 0),
      clicked: Number(c.clicked_count || 0)
    })),
    ...automationRules.map(r => ({
      name: r.rule_name || '',
      sent: Number(r.total_executions || 0),
      opened: Number(r.opened_count || 0),
      clicked: Number(r.clicked_count || 0)
    }))
  ];

  const chartData = combinedData
    .sort((a, b) => b.sent - a.sent)
    .slice(0, chartLimit === 'all' ? combinedData.length : parseInt(chartLimit));

  const messageHistory = [...new Set([
    ...campaigns.map(c => c.message_content),
    ...automationRules.map(r => r.campaign_template?.message)
  ])].filter(Boolean).slice(0, 4);

  const subjectHistory = [...new Set([
    ...campaigns.map(c => c.subject),
    ...automationRules.map(r => r.email_subject)
  ])].filter(Boolean).slice(0, 4);

  const campaignHistory = [...new Set(campaigns.map(c => c.campaign_name))].filter(Boolean);
  const ruleHistory = [...new Set(automationRules.map(r => r.rule_name))].filter(Boolean);
  const waHistory = [...new Set([
    ...campaigns.map(c => c.wa_message),
    ...automationRules.map(r => r.campaign_template?.wa_message)
  ])].filter(Boolean).slice(0, 5);

  return (
    <div className="space-y-6" id="print-marketing-automation">
      <PageHeader
        title="Marketing Automation"
        subtitle="Kelola kampanye promosi dan automasi pemasaran"
        icon={Megaphone}
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Marketing Automation', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-marketing-automation')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Marketing Automation', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-marketing-automation')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Marketing Automation', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-marketing-automation')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            <Button onClick={() => setShowRuleForm(true)} variant="outline" className="h-11 rounded-xl font-bold border-slate-200">
              <Plus className="w-4 h-4 mr-2" /> Aturan Baru
            </Button>
            <Button onClick={() => setShowCampaignForm(true)} className="h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Buat Kampanye
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Kampanye</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={totalCampaigns} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kampanye Aktif</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={activeCampaigns} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Terkirim</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={totalSent} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-slate-500">Avg. Open Rate</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="outline-none p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-48 p-2 bg-slate-900 text-white border-none rounded-lg shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                      <p className="text-[10px] font-bold leading-relaxed">
                        Kalkulasi: (Total Dibuka / Total Terkirim) * 100
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={avgOpenRate} suffix="%" decimals={1} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Performa Kampanye</CardTitle>

          </div>
          <Select value={chartLimit} onValueChange={setChartLimit}>
            <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
              <SelectValue placeholder="Tampilkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="relative group">
            <div className="overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
              <PremiumBarChart
                data={chartData}
                dataKey="sent"
                height={Math.max(350, chartData.length * 50)}
                color="#3b82f6"
                layout="vertical"
              />
            </div>
            {chartData.length > 5 && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none flex items-end justify-center pb-2 opacity-100 transition-opacity group-hover:opacity-0">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scroll untuk lebih banyak</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Kampanye</TabsTrigger>
          <TabsTrigger value="automation">Automasi</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Nama Kampanye</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="text-center">Terkirim</TableHead>
                    <TableHead className="text-center">Dibuka</TableHead>
                    <TableHead className="text-center">Diklik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp, index) => (
                    <TableRow key={camp.id}>
                      <TableCell className="text-slate-400 font-bold">{index + 1}</TableCell>
                      <TableCell className="font-medium">{camp.campaign_name}</TableCell>
                      <TableCell><Badge variant="outline">{camp.campaign_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{camp.trigger_type}</Badge></TableCell>
                      <TableCell className="text-center">{camp.sent_count}</TableCell>
                      <TableCell className="text-center">{camp.opened_count}</TableCell>
                      <TableCell className="text-center">{camp.clicked_count}</TableCell>
                      <TableCell>
                        <Badge className={
                          camp.status === 'Running' ? 'bg-emerald-100 text-emerald-700' :
                            camp.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                        }>{camp.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleCampaign(camp)} title={camp.status === 'Running' ? 'Pause' : 'Start'}>
                          {camp.status === 'Running' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleExecuteCampaign(camp)} title="Kirim Sekarang">
                          <Send className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleShowLogs(camp, 'campaign')} title="Lihat Penerima">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Nama Aturan</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-center">Terkirim</TableHead>
                    <TableHead className="text-center">Dibuka</TableHead>
                    <TableHead className="text-center">Diklik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationRules.map((rule, index) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-slate-400 font-bold">{index + 1}</TableCell>
                      <TableCell className="font-medium">{rule.rule_name}</TableCell>
                      <TableCell><Badge><Zap className="w-3 h-3 mr-1" />{rule.trigger}</Badge></TableCell>
                      <TableCell className="text-slate-500 text-sm font-medium">
                        {rule.last_run ? moment(rule.last_run).format('DD MMM YYYY, HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-center">{rule.total_executions || 0}</TableCell>
                      <TableCell className="text-center">{rule.opened_count || 0}</TableCell>
                      <TableCell className="text-center">{rule.clicked_count || 0}</TableCell>
                      <TableCell>
                        <Badge className={rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {rule.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleRule(rule)}>
                          {rule.is_active ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleShowLogs(rule, 'automation')} title="Lihat Penerima">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Form */}
      <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
        <DialogContent className="max-w-3xl overflow-x-auto sm:overflow-x-hidden">
          <DialogHeader><DialogTitle>Buat Kampanye Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleCampaignSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 py-2">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Kampanye *</Label>
                  <Input
                    placeholder="Contoh: Promo Ramadhan 2026"
                    value={campaignForm.campaign_name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, campaign_name: e.target.value })}
                    className="h-11 mt-1.5"
                    list="campaign-names"
                    autoComplete="off"
                  />
                  <datalist id="campaign-names">
                    {campaignHistory.map((name, idx) => (
                      <option key={idx} value={name} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipe</Label>
                    <Select value={campaignForm.campaign_type} onValueChange={(v) => setCampaignForm({ ...campaignForm, campaign_type: v })}>
                      <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email Marketing</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp Blast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Trigger</Label>
                    <Select value={campaignForm.trigger_type} onValueChange={(v) => setCampaignForm({ ...campaignForm, trigger_type: v })}>
                      <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual (Kirim Sekali)</SelectItem>
                        <SelectItem value="Scheduled">Scheduled (Terjadwal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-2">
                      {['Standard', 'Promotion', 'Announcement'].map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={campaignForm.template_type === type ? 'default' : 'outline'}
                          className={`rounded-full px-6 transition-all ${campaignForm.template_type === type ? 'text-white' : ''}`}
                          style={campaignForm.template_type === type ? { backgroundColor: store?.brand_color || '#2563eb' } : {}}
                          onClick={() => setCampaignForm({ ...campaignForm, template_type: type })}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-bold uppercase tracking-wider gap-2 rounded-xl"
                      onClick={handleShowPreview}
                    >
                      <Eye className="w-3.5 h-3.5" /> Klik Preview
                    </Button>
                  </div>
                </div>

                {campaignForm.template_type === 'Promotion' && (
                  <div className="p-5 bg-blue-50/30 rounded-2xl border border-dashed border-blue-200">
                    <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3 block">Upload Foto Produk/Promo</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {(campaignForm.promo_image_url || '').split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                          <img src={url} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const urls = campaignForm.promo_image_url.split(',').filter((_, i) => i !== idx);
                              setCampaignForm({ ...campaignForm, promo_image_url: urls.join(',') });
                            }}
                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(campaignForm.promo_image_url || '').split(',').filter(Boolean).length < 5 && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all">
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Plus className="w-5 h-5 text-slate-400" />}
                          <span className="text-[10px] text-slate-400 font-bold mt-1">Add Foto</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePromoUpload(e, 'campaign')} disabled={isUploading} />
                        </label>
                      )}
                    </div>
                    <div className="mt-4">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1.5 block">Teks Tombol (CTA) *</Label>
                      <Input
                        placeholder="Contoh: BELANJA SEKARANG"
                        value={campaignForm.cta_text}
                        onChange={(e) => setCampaignForm({ ...campaignForm, cta_text: e.target.value })}
                        className="h-10 bg-white border-blue-100"
                      />
                    </div>
                  </div>
                )}

                {campaignForm.trigger_type === 'Scheduled' && (
                  <div className="animate-in zoom-in-95 p-5 bg-amber-50 rounded-2xl border border-amber-100">
                    <Label className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Jadwal Pengiriman Otomatis
                    </Label>
                    <Input
                      type="date"
                      value={campaignForm.schedule_date}
                      onChange={(e) => setCampaignForm({ ...campaignForm, schedule_date: e.target.value })}
                      className="h-11 mt-2.5 bg-white border-amber-200 focus-visible:ring-amber-500"
                    />
                    <p className="text-[10px] text-amber-600 font-medium mt-2">
                      * Kampanye akan dikirimkan secara otomatis oleh sistem pada tanggal ini.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <MessageSquare className="w-4 h-4" />
                      <Label className="text-[10px] font-black uppercase tracking-widest">Pesan WhatsApp Otomatis (Redirect)</Label>
                    </div>
                    {!store?.phone && (
                      <Badge variant="destructive" className="text-[9px] animate-pulse">Nomor WA Toko Belum Diatur!</Badge>
                    )}
                  </div>
                  <Textarea
                    placeholder={`Halo ${store?.store_name || 'Admin'}, saya tertarik dengan promo Produk A ini...`}
                    value={campaignForm.wa_message || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, wa_message: e.target.value })}
                    className="min-h-[100px] bg-white border-emerald-100"
                  />
                  {waHistory.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase w-full">Gunakan Riwayat:</span>
                      {waHistory.map((msg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCampaignForm({ ...campaignForm, wa_message: msg })}
                          className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors max-w-[200px] truncate"
                          title={msg}
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-3 bg-white/50 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-emerald-600 leading-relaxed">
                      💡 Saat pelanggan klik tombol <b>"Belanja Sekarang"</b> di email, mereka akan langsung diarahkan ke WhatsApp Anda dengan pesan di atas.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <Label className="font-bold text-slate-800">Target Pelanggan</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                      <Checkbox
                        id="all-customers"
                        checked={campaignForm.is_all_customers}
                        onCheckedChange={(checked) => setCampaignForm({ ...campaignForm, is_all_customers: !!checked, target_customer_ids: [] })}
                      />
                      <label htmlFor="all-customers" className="text-xs font-bold text-slate-600 cursor-pointer">
                        Kirim ke Seluruh Customer
                      </label>
                    </div>
                  </div>
                  {!campaignForm.is_all_customers && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-300 space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pilih Beberapa Customer</Label>

                      <div className="flex gap-2">
                        <Select
                          value={selectedTargetId}
                          onValueChange={setSelectedTargetId}
                        >
                          <SelectTrigger className="bg-white h-11 flex-1">
                            <SelectValue placeholder="Cari nama customer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers
                              .filter(c => !campaignForm.target_customer_ids.includes(c.id))
                              .map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  <div className="flex flex-col py-1">
                                    <span className="font-bold text-slate-700">{c.name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {c.email ? `✉️ ${c.email}` : ''} {c.phone ? `📱 ${c.phone}` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          className="h-11 w-11 bg-blue-600 text-white rounded-xl"
                          onClick={() => {
                            if (selectedTargetId && !campaignForm.target_customer_ids.includes(selectedTargetId)) {
                              setCampaignForm({
                                ...campaignForm,
                                target_customer_ids: [...campaignForm.target_customer_ids, selectedTargetId]
                              });
                              setSelectedTargetId('');
                            }
                          }}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>

                      {campaignForm.target_customer_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-slate-200 min-h-[50px]">
                          {campaignForm.target_customer_ids.map(id => {
                            const customer = customers.find(c => c.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 flex items-center bg-blue-50 text-blue-700 border-blue-100">
                                <span className="text-xs font-bold">{customer?.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-blue-200 rounded-full"
                                  onClick={() => setCampaignForm({
                                    ...campaignForm,
                                    target_customer_ids: campaignForm.target_customer_ids.filter(cid => cid !== id)
                                  })}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </Button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject Pesan</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                    {(subjectHistory.length > 0 ? subjectHistory : ['Selamat Bergabung!', 'Promo Spesial!', 'Diskon Hari Ini']).map((h, i) => (
                      <button key={i} type="button" onClick={() => setCampaignForm({ ...campaignForm, subject: h })} className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors">{h}</button>
                    ))}
                  </div>
                  <Input
                    placeholder="Judul pesan yang akan tampil di email"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                    className="h-11 mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Isi Konten Pesan *</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                    {(messageHistory.length > 0 ? messageHistory : ['Halo {{name}}, selamat bergabung!', 'Dapatkan diskon khusus hari ini.']).map((h, i) => (
                      <button key={i} type="button" onClick={() => setCampaignForm({ ...campaignForm, message_content: h })} className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors">{h.substring(0, 30)}...</button>
                    ))}
                  </div>
                  <Textarea
                    value={campaignForm.message_content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, message_content: e.target.value })}
                    rows={6}
                    placeholder="Halo {{name}}, kami punya promo spesial untukmu!"
                    className="mt-1.5 rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  />
                  <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-[10px] uppercase tracking-widest mb-2">
                      <Zap className="w-3.5 h-3.5" /> Tips Personalisasi
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Gunakan kode <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold text-blue-700">{"{{name}}"}</code> di dalam pesan Anda.
                      Sistem akan otomatis menggantinya dengan <strong>Nama Asli Pelanggan</strong> saat dikirim.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 italic">
                      <span>Contoh: "Halo {"{{name}}"}..."</span>
                      <span className="text-slate-300">→</span>
                      <span>"Halo Budi Arisandi..."</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCampaignForm(false)} className="font-bold text-slate-500">Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-xl font-bold">
                Buat Kampanye
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Automation Rule Form */}
      <Dialog open={showRuleForm} onOpenChange={setShowRuleForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden p-6">
          <DialogHeader><DialogTitle>Aturan Automasi Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleRuleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Aturan *</Label>
              <Input
                placeholder="Contoh: Welcome Message"
                value={ruleForm.rule_name}
                onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                className="h-11 mt-1.5"
                list="rule-names"
                autoComplete="off"
              />
              <datalist id="rule-names">
                {ruleHistory.map((name, idx) => (
                  <option key={idx} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject Email</Label>
              {subjectHistory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {subjectHistory.map((h, i) => (
                    <button key={i} type="button" onClick={() => setRuleForm({ ...ruleForm, email_subject: h })} className="text-[10px] bg-slate-50 border px-2 py-0.5 rounded-full hover:bg-slate-100">{h.substring(0, 20)}...</button>
                  ))}
                </div>
              )}
              <Input
                placeholder="Subject yang muncul di Inbox Customer"
                value={ruleForm.email_subject}
                onChange={(e) => setRuleForm({ ...ruleForm, email_subject: e.target.value })}
                className="h-11 mt-1.5"
              />
            </div>
            <div><Label>Trigger</Label>
              <Select value={ruleForm.trigger} onValueChange={(v) => setRuleForm({ ...ruleForm, trigger: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Birthday">Birthday</SelectItem>
                  <SelectItem value="Reward Expiry">Reward Expiry</SelectItem>
                  <SelectItem value="New Customer">New Customer</SelectItem>
                  <SelectItem value="Inactive Customer">Inactive Customer</SelectItem>
                  <SelectItem value="Tier Upgrade">Tier Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Desain Template</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-full"
                  onClick={handleShowRulePreview}
                >
                  <Eye className="w-3 h-3 mr-1" /> KLIK PREVIEW
                </Button>
              </div>
              <div className="flex gap-2">
                {['Standard', 'Promotion', 'Announcement'].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={ruleForm.template_type === type ? 'default' : 'outline'}
                    className={`rounded-full px-6 h-9 text-xs ${ruleForm.template_type === type ? 'bg-blue-600 text-white' : ''}`}
                    onClick={() => setRuleForm({ ...ruleForm, template_type: type })}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {ruleForm.template_type === 'Promotion' && (
              <div className="p-4 bg-blue-50/30 rounded-xl border border-dashed border-blue-200">
                <Label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 block text-center">Foto Produk / Promo (Maks 5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(ruleForm.promo_image_url || '').split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-white">
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const urls = ruleForm.promo_image_url.split(',').filter((_, i) => i !== idx);
                          setRuleForm({ ...ruleForm, promo_image_url: urls.join(',') });
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {(ruleForm.promo_image_url || '').split(',').filter(Boolean).length < 5 && (
                    <div
                      className="aspect-square rounded-lg bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                      onClick={() => document.getElementById('promo-upload-rule').click()}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  )}
                </div>
                <input
                  id="promo-upload-rule"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handlePromoUpload(e, 'rule')}
                />

                <div className="mt-4 pt-4 border-t border-purple-100">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1.5 block">Teks Tombol (CTA) *</Label>
                  <Input
                    placeholder="Contoh: KLAIM DISKON"
                    value={ruleForm.cta_text}
                    onChange={(e) => setRuleForm({ ...ruleForm, cta_text: e.target.value })}
                    className="h-10 bg-white border-purple-100"
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Template Pesan *</Label>
              {messageHistory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {messageHistory.map((h, i) => (
                    <button key={i} type="button" onClick={() => setRuleForm({ ...ruleForm, message_template: h })} className="text-[10px] bg-slate-50 border px-2 py-0.5 rounded-full hover:bg-slate-100">{h.substring(0, 20)}...</button>
                  ))}
                </div>
              )}
              <Textarea
                value={ruleForm.message_template}
                onChange={(e) => setRuleForm({ ...ruleForm, message_template: e.target.value })}
                rows={5}
                required
                className="mt-1.5"
              />
            </div>

            <div className="p-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200">
              <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Pesan WhatsApp Otomatis (Redirect)</Label>
              <Textarea
                placeholder="Contoh: Halo {{name}}, terima kasih atas ucapan selamat ulang tahunnya! Saya tertarik dengan promo..."
                value={ruleForm.wa_message}
                onChange={(e) => setRuleForm({ ...ruleForm, wa_message: e.target.value })}
                className="min-h-[80px] bg-white border-emerald-100 text-xs"
              />
              <p className="text-[10px] text-emerald-600 mt-1">
                💡 Gunakan <b>&#123;&#123;name&#125;&#125;</b> untuk personalisasi.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRuleForm(false)}>Batal</Button>
              <Button type="submit">Simpan Aturan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Communication Log Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Detail Penerima: {selectedEntity?.campaign_name || selectedEntity?.rule_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Waktu Kirim</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entityLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                      Belum ada data pengiriman untuk entitas ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  entityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-bold text-slate-700">{log.customer_name}</TableCell>
                      <TableCell className="text-slate-500">{log.customer_email}</TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {moment(log.created_at).format('DD MMM YYYY, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowLogModal(false)} className="bg-blue-600 text-white">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* Email Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
          <div className="bg-white p-4 border-bottom flex items-center justify-between shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Preview Desain Email
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl shadow-sm mx-auto" dangerouslySetInnerHTML={{ __html: previewData }} />
          </div>
          <div className="p-4 bg-white border-top text-center shrink-0">
            <p className="text-[10px] text-slate-400">Tampilan di atas adalah simulasi email yang akan diterima oleh pelanggan.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
