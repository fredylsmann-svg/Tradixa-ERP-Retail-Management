import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Store, Upload, Phone, Mail, FileText, Loader2, Save, Building2, User, Settings, Info, CreditCard, Key, ShieldCheck, CheckCircle2, ExternalLink, Zap, ArrowRight, Lock, ChevronDown, ChevronUp, Download, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const InfoTooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5">
      <button
        type="button"
        className="w-4 h-4 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <Info className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl text-xs shadow-2xl z-[9999]"
            style={{ background: '#0f2442', color: '#e2e8f0', border: '1px solid rgba(37,99,235,0.25)' }}
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 mt-[-5px]" style={{ background: '#0f2442' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

export default function CompanySettings({ store }) {
  const { settings, updateSetting } = useSettings();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null

  // Trial / Free plan detection for API key lock
  const isTrial = store?.plan === 'pro' && store?.has_used_trial;
  const isFree = !store?.plan || store?.plan === 'free';
  const isApiLocked = isTrial || isFree;

  // Premium-only feature lock (EDC, AI Assistant etc.) — only Premium (paid) and Enterprise can access
  const isPremiumPaid = store?.plan === 'premium' && store?.has_used_trial === false;
  const isEnterprise = store?.plan === 'enterprise';
  const isPremiumLocked = !(isPremiumPaid || isEnterprise);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(store?.logo_url || null);

  // Logo upload limit tracking (max 3)
  const MAX_LOGO_UPLOADS = 3;
  const getLogoUploadCount = () => {
    if (!store?.id) return 0;
    return parseInt(localStorage.getItem(`tradixa_logo_uploads_${store?.id}`) || '0', 10);
  };
  const [formData, setFormData] = useState({
    id: store?.id || '',
    store_name: store?.store_name || '',
    address: store?.address || '',
    phone: store?.phone || '',
    email: store?.email || '',
    tax_id: store?.tax_id || '',
    owner_name: store?.owner_name || '',
    owner_position: store?.owner_position || '',
    owner_phone: store?.owner_phone || '',
    bank_name: store?.bank_name || '',
    bank_account_number: store?.bank_account_number || '',
    mayar_api_key: store?.mayar_api_key || '',
    qris_static_url: store?.qris_static_url || ''
  });
  const [saved, setSaved] = useState(false);
  const [showEdcGuide, setShowEdcGuide] = useState(false);
  const [qrisFile, setQrisFile] = useState(null);
  const [qrisPreview, setQrisPreview] = useState(store?.qris_static_url || null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address || place.name
        }));
      }
    }
  };

  useEffect(() => {
    if (store && (!formData.store_name || store.id !== formData.id)) {
      setFormData({
        id: store.id,
        store_name: store.store_name || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        tax_id: store.tax_id || '',
        owner_name: store.owner_name || '',
        owner_position: store.owner_position || '',
        owner_phone: store.owner_phone || '',
        bank_name: store.bank_name || '',
        bank_account_number: store.bank_account_number || '',
        mayar_api_key: store.mayar_api_key || '',
        qris_static_url: store.qris_static_url || ''
      });
      setLogoPreview(store.logo_url || null);
      setQrisPreview(store.qris_static_url || null);
    }
  }, [store?.id]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check upload limit (max 3)
      const currentCount = getLogoUploadCount();
      if (currentCount >= MAX_LOGO_UPLOADS) {
        toast({ title: 'Batas Upload Tercapai', description: `Anda sudah mengubah logo ${MAX_LOGO_UPLOADS}x (maksimal). Hubungi support untuk reset.`, variant: 'destructive' });
        e.target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Terlalu Besar', description: `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)}MB melebihi batas maksimal 2MB.`, variant: 'destructive' });
        e.target.value = '';
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQrisChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Terlalu Besar', description: `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)}MB melebihi batas maksimal 2MB.`, variant: 'destructive' });
        e.target.value = '';
        return;
      }
      setQrisFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setQrisPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQris = () => {
    setQrisFile(null);
    setQrisPreview(null);
    setFormData(prev => ({ ...prev, qris_static_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let logoUrl = store?.logo_url || '';
    if (logoFile) {
      const _uploadRes = await api.storage.upload(logoFile);
      const file_url = _uploadRes.url;
      logoUrl = file_url;
    }

    // Upload QRIS statis ke Cloudflare R2 jika ada file baru
    let qrisStaticUrl = formData.qris_static_url || store?.qris_static_url || '';
    if (qrisFile) {
      try {
        const { uploadFile } = await import('@/utils/storageService');
        qrisStaticUrl = await uploadFile(qrisFile, 'document');
      } catch (err) {
        console.error('[Storage] QRIS upload failed:', err);
        toast({ title: 'Gagal Upload QRIS', description: err.message, variant: 'destructive' });
      }
    }

    await api.entities.Store.update(store.id, {
      ...formData,
      logo_url: logoUrl,
      qris_static_url: qrisStaticUrl
    });

    // Increment logo upload counter if a new logo was uploaded
    if (logoFile) {
      const newCount = getLogoUploadCount() + 1;
      localStorage.setItem(`tradixa_logo_uploads_${store.id}`, String(newCount));
      setLogoFile(null);
    }

    // Trigger app-wide refresh to update header/sidebar logo
    window.dispatchEvent(new Event('refresh_data'));

    setIsLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Account Settings"
        subtitle="Kelola informasi toko dan profil pemilik"
        icon={Settings}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informasi Toko
            </CardTitle>
            <CardDescription>Data perusahaan untuk identitas customer & supplier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" disabled={getLogoUploadCount() >= MAX_LOGO_UPLOADS} />
                <label htmlFor="logo-upload" className={`cursor-pointer block ${getLogoUploadCount() >= MAX_LOGO_UPLOADS ? 'opacity-50 pointer-events-none' : ''}`}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">Upload Logo</span>
                    </div>
                  )}
                </label>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">Maks 2MB (Sisa {Math.max(0, MAX_LOGO_UPLOADS - getLogoUploadCount())}x perubahan)</p>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-400" />
                Nama Toko *
              </Label>
              <Input
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Alamat Lengkap *
              </Label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1.5"
                    placeholder="Ketik alamat untuk pencarian otomatis..."
                    required
                  />
                </Autocomplete>
              ) : (
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1.5"
                  rows={2}
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Telepon
                </Label>
                <Input
                  placeholder="Contoh: 0812... atau +62812..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1.5"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format <b>08...</b> otomatis menjadi <b>+62...</b></p>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center text-slate-600 mb-1.5">
                <FileText className="w-4 h-4 text-slate-400 mr-2" />
                NPWP (Opsional)
                <InfoTooltip text="Sangat disarankan diisi. NPWP diperlukan untuk verifikasi identitas (KYC) saat mengaktifkan fitur Payment Gateway (QRIS/VA) agar uang bisa cair ke rekening Anda." />
              </Label>
              <Input
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="mt-1.5"
                placeholder="xx.xxx.xxx.x-xxx.xxx"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Informasi Rekening Bank (Pencairan Dana)
            </CardTitle>
            <CardDescription className="flex items-center">
              Tujuan pencairan dana dari Payment Gateway.
              <InfoTooltip text="Rekening ini mutlak harus sesuai dengan nama profil toko atau NPWP Anda untuk mempermudah verifikasi pencairan." />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Bank</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1.5"
                  placeholder="Contoh: BCA, Mandiri"
                />
              </div>
              <div>
                <Label>Nomor Rekening</Label>
                <Input
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="mt-1.5"
                  placeholder="Contoh: 1234567890"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Gateway Integrations */}
        <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-t-xl border-b border-emerald-100 dark:border-emerald-900/50">
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <Key className="w-5 h-5" />
              Integrasi Payment Gateway
            </CardTitle>
            <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80">
              Atur API Key untuk menerima pembayaran otomatis (QRIS, VA) langsung ke rekening toko Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 relative">
            {/* Lock Overlay for trial/free */}
            {isApiLocked && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] rounded-b-xl flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-black text-slate-800">Fitur Paket Berbayar</h4>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Integrasi Payment Gateway (QRIS, VA) tersedia untuk paket Pro & Premium berbayar. Upgrade untuk mengaktifkan fitur ini.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = '/PricingPage'}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 shadow-lg transition-all hover:scale-105"
                >
                  Upgrade Paket Anda
                </Button>
              </div>
            )}
            {/* Step-by-step Setup Guide */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Panduan Aktivasi Payment Gateway
              </p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]">1</span>
                  <span>Daftar di <a href="https://mayar.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline">mayar.id</a> (Pilih: Perorangan atau Perusahaan)</span>
                </div>
                <div className="flex items-start gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]">2</span>
                  <span>Lengkapi verifikasi <b>KYC</b> (Upload KTP, NPWP, Selfie). NPWP bisa gunakan yang sudah diisi di atas.</span>
                </div>
                <div className="flex items-start gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]">3</span>
                  <div>
                    <span>Buka <a href="https://web.mayar.id/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline">Dashboard Mayar → API Keys</a>, buat API Key baru</span>
                    <div className="mt-1.5 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                      <p className="text-[10px] text-red-700 dark:text-red-400 font-bold">⚠️ PENTING: Pilih scope "Read & Write"</p>
                      <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">Jangan pilih "Read Only" — scope tersebut tidak bisa membuat pembayaran. Harus <b>"Read & Write"</b> agar QRIS/VA berfungsi.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-[10px]">4</span>
                  <span>Tempel API Key di bawah ini, lalu klik <b>"Tes Koneksi"</b></span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-3 space-y-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">* Webhook akan didaftarkan otomatis oleh sistem saat Anda menyimpan.</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">* Membuat API Key baru tidak akan merusak webhook atau langganan (subscription) yang sudah ada.</p>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <Label className="flex items-center text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Mayar API Key
                <InfoTooltip text="Dapatkan API Key dari menu API Keys di dashboard Mayar.id. Satu toko = satu API Key. Webhook otomatis terdaftar." />
              </Label>
              <Input
                type="password"
                value={formData.mayar_api_key}
                onChange={(e) => { setFormData({ ...formData, mayar_api_key: e.target.value }); setTestResult(null); }}
                className={`mt-1.5 font-mono text-sm tracking-widest focus:tracking-normal ${isApiLocked ? 'opacity-50 pointer-events-none' : ''}`}
                placeholder="Paste API Key dari Dashboard Mayar"
                disabled={isApiLocked}
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-9 px-4 text-xs font-bold transition-all ${testResult === 'success' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                  testResult === 'error' ? 'border-red-300 text-red-700 bg-red-50' :
                    'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
                disabled={!formData.mayar_api_key || isTesting || isApiLocked}
                onClick={async () => {
                  setIsTesting(true);
                  setTestResult(null);
                  try {
                    const { data, error } = await api.client.functions.invoke('mayar-test-connection', {
                      body: { api_key: formData.mayar_api_key }
                    });
                    if (error) throw new Error(error.message);
                    if (data?.success) {
                      setTestResult('success');
                      toast({ title: '✅ Koneksi Berhasil!', description: `Saldo Mayar: Rp ${new Intl.NumberFormat('id-ID').format(data.balance || 0)}` });
                    } else {
                      setTestResult('error');
                      toast({ title: 'Koneksi Gagal', description: data?.error || 'API Key tidak valid.', variant: 'destructive' });
                    }
                  } catch (err) {
                    setTestResult('error');
                    toast({ title: 'Koneksi Gagal', description: err.message, variant: 'destructive' });
                  }
                  setIsTesting(false);
                }}
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> :
                  testResult === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> :
                    <Zap className="w-3.5 h-3.5 mr-1.5" />}
                {isTesting ? 'Menguji...' : testResult === 'success' ? 'Terhubung!' : 'Tes Koneksi API'}
              </Button>
              {testResult === 'success' && (
                <span className="text-[10px] text-emerald-600 font-medium animate-in fade-in">API Key valid — Anda siap menerima pembayaran QRIS!</span>
              )}
              {testResult === 'error' && (
                <span className="text-[10px] text-red-500 font-medium">Pastikan scope API Key = "Read & Write" dan KYC sudah terverifikasi.</span>
              )}
            </div>

            {/* Sandbox Info */}
            <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <b>Testing?</b> Gunakan <a href="https://web.mayar.club/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-bold">Sandbox Mayar (mayar.club)</a> untuk menguji pembayaran tanpa uang asli.
              </p>
            </div>

            {/* Static QRIS Upload Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6 space-y-4">
              <div>
                <Label className="flex items-center gap-2 font-bold text-slate-850 dark:text-slate-200">
                  <QrCode className="w-4 h-4 text-violet-500" />
                  QRIS Statis Toko (GPN Standee)
                  <InfoTooltip text="Upload file QRIS Statis GPN Anda. Pelanggan di kasir POS akan bisa scan kode QR ini untuk membayar secara instan." />
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Direkomendasikan mengunduh file QRIS statis dari Dashboard Mayar Anda agar <b>Webhook Auto-Settlement</b> tetap berfungsi otomatis, atau gunakan QRIS dari bank manapun (BCA, Mandiri, dll.) untuk verifikasi RRN manual.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-shrink-0 w-40 h-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                  {qrisPreview ? (
                    <img src={qrisPreview} alt="Preview QRIS" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-3 text-slate-400 dark:text-slate-500">
                      <QrCode className="w-8 h-8 mx-auto mb-1.5 opacity-60" />
                      <span className="text-[10px] font-medium leading-tight block">Belum Ada Gambar QRIS</span>
                    </div>
                  )}
                  {qrisPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveQris}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="qris-static-upload"
                      onChange={handleQrisChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="qris-static-upload"
                      className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-xs font-bold transition-all shadow-sm"
                    >
                      <Upload className="w-4 h-4 mr-2 text-violet-500" />
                      {qrisPreview ? 'Ganti Gambar' : 'Pilih Gambar QRIS'}
                    </Label>
                  </div>
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal space-y-1.5">
                    <p>• Maksimal ukuran file: <b>2 MB</b></p>
                    <p>• Format yang didukung: <b>PNG, JPG, JPEG, WEBP</b></p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EDC Integration & Guide Card */}
        <Card className="border-blue-100 dark:border-blue-900/50 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 rounded-t-xl border-b border-blue-100 dark:border-blue-900/50">
            <CardTitle className="flex items-center justify-between text-blue-800 dark:text-blue-400">
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Integrasi & Panduan Mesin EDC (Tradixa Link)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEdcGuide(!showEdcGuide)}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold flex items-center gap-1.5"
              >
                {showEdcGuide ? 'Tutup Panduan' : 'Buka Panduan & Download'}
                {showEdcGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CardTitle>
            <CardDescription className="text-blue-600/80 dark:text-blue-400/80 mt-1">
              Atur tipe integrasi EDC default untuk POS/Kasir & Transaksi Agen, serta unduh aplikasi bridge dan panduan Bluetooth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 relative">
            {/* Lock Overlay for non-Premium users */}
            {isPremiumLocked && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] rounded-b-xl flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-black text-slate-800">Fitur Khusus Premium Plan</h4>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Integrasi Mesin EDC (Tradixa Link) hanya tersedia untuk paket Premium & Enterprise berbayar. Upgrade untuk mengaktifkan fitur ini.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = '/PricingPage'}
                  className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 shadow-lg transition-all hover:scale-105"
                >
                  Upgrade ke Premium
                </Button>
              </div>
            )}
            {/* Default Integration Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <Label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                  Default Tipe Integrasi EDC
                  <InfoTooltip text="Pilihan default tipe integrasi EDC yang akan aktif pertama kali di layar checkout Kasir POS dan form Transaksi Agen." />
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pilih tipe integrasi default untuk seluruh device kasir.
                </p>
              </div>
              <div>
                <Select
                  value={settings.defaultEdcIntegration || 'Manual'}
                  onValueChange={(val) => updateSetting('defaultEdcIntegration', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">EDC Manual (Input Trace No)</SelectItem>
                    <SelectItem value="Local">EDC Local Bridge (WebSocket)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Collapsible Guide and Downloads */}
            <AnimatePresence>
              {showEdcGuide && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800"
                >
                  {/* Download Bridge Apps */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      1. Download Tradixa Link Bridge Agent
                    </h4>
                    <p className="text-xs text-slate-500">
                      Instal aplikasi agen ini pada komputer kasir (Desktop) untuk menghubungkan browser web dengan mesin EDC fisik.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <a
                        href="https://github.com/fredylsmann-svg/tradixa-link-bridge-ERC/releases/download/v2.0.0/TradixaLinkBridge.2.exe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-900/10 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                            <Download className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Windows Agent (.exe)</p>
                            <p className="text-[10px] text-slate-400">Windows 10 / 11 (64-bit)</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </a>

                      <a
                        href="https://github.com/fredylsmann-svg/tradixa-link-bridge-ERC/releases/download/v2.0.0/TradixaLinkBridge-v2-macos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-900/10 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                            <Download className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">macOS Agent (.dmg)</p>
                            <p className="text-[10px] text-slate-400">macOS Big Sur atau lebih baru</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  </div>

                  {/* Connection Guides */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      2. Panduan Koneksi Perangkat
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* USB Connection */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Metode A: Koneksi Kabel USB</span>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                          <li>Colokkan kabel USB mesin EDC ke port USB kosong di komputer kasir.</li>
                          <li>Buka aplikasi <b>Tradixa Link Bridge</b> yang sudah diinstal.</li>
                          <li>Aplikasi akan secara otomatis mendeteksi koneksi dan mengubah ikon tray menjadi hijau (Aktif).</li>
                          <li>Saat checkout di POS, pilih <b>EDC Local Bridge (WebSocket)</b> dan transaksi akan langsung dikirim ke EDC.</li>
                        </ol>
                      </div>

                      {/* Bluetooth Connection */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Metode B: Koneksi Nirkabel Bluetooth</span>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                          <li>Aktifkan Bluetooth pada mesin EDC dan PC Kasir/Laptop.</li>
                          <li>Buka menu <b>Bluetooth Settings</b> pada komputer kasir, lalu klik <b>Add Device</b> dan pasangkan (pair) ke mesin EDC.</li>
                          <li>Sistem Operasi akan secara otomatis membuat port virtual (<b>Virtual COM Port</b>) untuk EDC Bluetooth tersebut.</li>
                          <li>Jalankan <b>Tradixa Link Bridge</b>; aplikasi akan mendeteksi port virtual tersebut dan memproses transaksi secara nirkabel.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Enterprise Workflow & Procurement */}
        <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-xl">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black">Enterprise Workflow & Procurement</span>
                <p className="text-slate-300 text-xs font-normal mt-0.5">Pengaturan alur kerja lanjutan untuk pengadaan dan gudang</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Negotiation Mode */}
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Mode Negosiasi Harga</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tentukan bagaimana supplier melakukan penawaran harga di portal</p>
              </div>
              <RadioGroup
                value={settings.negotiationMode || 'Item'}
                onValueChange={(val) => updateSetting('negotiationMode', val)}
                className="space-y-3"
              >
                <Label htmlFor="cs-neg-item" className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.negotiationMode === 'Item' || !settings.negotiationMode ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}>
                  <RadioGroupItem value="Item" id="cs-neg-item" className="mt-1" />
                  <div>
                    <div className="font-bold">Mode A: Per Item Counter Offer</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supplier bisa menawar harga satuan untuk setiap produk.</p>
                  </div>
                </Label>
                <Label htmlFor="cs-neg-total" className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.negotiationMode === 'Total' ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}>
                  <RadioGroupItem value="Total" id="cs-neg-total" className="mt-1" />
                  <div>
                    <div className="font-bold">Mode B: Grand Total Counter Offer</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supplier hanya menawar total harga akhir dokumen.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Warehouse Approval Mode */}
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Mode Persetujuan Gudang (GRN)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tentukan hierarki tanda tangan untuk penerimaan barang</p>
              </div>
              <RadioGroup
                value={settings.warehouseApprovalMode || 'Single'}
                onValueChange={(val) => updateSetting('warehouseApprovalMode', val)}
                className="space-y-3"
              >
                <Label htmlFor="cs-app-single" className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.warehouseApprovalMode === 'Single' || !settings.warehouseApprovalMode ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}>
                  <RadioGroupItem value="Single" id="cs-app-single" className="mt-1" />
                  <div>
                    <div className="font-bold">Single Signature (Standar)</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hanya perlu tanda tangan Admin Gudang untuk posting stok.</p>
                  </div>
                </Label>
                <Label htmlFor="cs-app-dual" className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.warehouseApprovalMode === 'Dual' ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}>
                  <RadioGroupItem value="Dual" id="cs-app-dual" className="mt-1" />
                  <div>
                    <div className="font-bold">Dual Signature (Enterprise)</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Memerlukan tanda tangan Admin dan Manajer Gudang.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <User className="w-5 h-5" />
              Profil Pemilik / Penanggung Jawab
            </CardTitle>
            <CardDescription>Nama ini digunakan untuk pengajuan (Request) & Approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="flex items-center gap-2">
                Nama Lengkap *
              </Label>
              <Input
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="mt-1.5"
                placeholder="Contoh: Ferdi Armond"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jabatan</Label>
                <Input
                  value={formData.owner_position}
                  onChange={(e) => setFormData({ ...formData, owner_position: e.target.value })}
                  className="mt-1.5"
                  placeholder="Contoh: Owner / Manager"
                />
              </div>
              <div>
                <Label>Telepon Personal</Label>
                <Input
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="mt-1.5"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 bg-blue-700 hover:bg-blue-600 text-white shadow-lg" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" />Menyimpan...</>
          ) : saved ? (
            <><Save className="w-5 h-5 mr-2" />Pengaturan Berhasil Disimpan!</>
          ) : (
            <><Save className="w-5 h-5 mr-2" />Simpan Seluruh Perubahan</>
          )}
        </Button>
      </form>
    </div>
  );
}
