import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Store, Upload, Phone, Mail, FileText, Loader2, Save, Building2, User, Settings, Info, CreditCard, Key, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';

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
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(store?.logo_url || null);
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
    mayar_api_key: store?.mayar_api_key || ''
  });
  const [saved, setSaved] = useState(false);

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
        mayar_api_key: store.mayar_api_key || ''
      });
      setLogoPreview(store.logo_url || null);
    }
  }, [store?.id]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let logoUrl = store?.logo_url || '';
    if (logoFile) {
      const _uploadRes = await api.storage.upload(logoFile );
      const file_url = _uploadRes.url;
      logoUrl = file_url;
    }

    await api.entities.Store.update(store.id, {
      ...formData,
      logo_url: logoUrl
    });

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
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload" className="cursor-pointer block">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400">Upload Logo</span>
                    </div>
                  )}
                </label>
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
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1.5"
                rows={2}
                required
              />
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
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label className="flex items-center text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Mayar API Key
                <InfoTooltip text="Dapatkan API Key ini dengan mendaftar di dashboard Mayar.id. API Key ini memungkinkan aplikasi untuk membuat link pembayaran QRIS/VA atas nama toko Anda secara otomatis." />
              </Label>
              <Input
                type="password"
                value={formData.mayar_api_key}
                onChange={(e) => setFormData({ ...formData, mayar_api_key: e.target.value })}
                className="mt-1.5 font-mono text-sm tracking-widest focus:tracking-normal"
                placeholder="••••••••••••••••••••••••"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                * Kunci ini disensor (seperti password) agar aman dari penglihatan pihak yang tidak berwenang.
              </p>
            </div>
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
                <div className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.negotiationMode === 'Item' || !settings.negotiationMode ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`} onClick={() => updateSetting('negotiationMode', 'Item')}>
                  <RadioGroupItem value="Item" id="cs-neg-item" className="mt-1" />
                  <div>
                    <Label htmlFor="cs-neg-item" className="font-bold cursor-pointer">Mode A: Per Item Counter Offer</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supplier bisa menawar harga satuan untuk setiap produk.</p>
                  </div>
                </div>
                <div className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.negotiationMode === 'Total' ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`} onClick={() => updateSetting('negotiationMode', 'Total')}>
                  <RadioGroupItem value="Total" id="cs-neg-total" className="mt-1" />
                  <div>
                    <Label htmlFor="cs-neg-total" className="font-bold cursor-pointer">Mode B: Grand Total Counter Offer</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Supplier hanya menawar total harga akhir dokumen.</p>
                  </div>
                </div>
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
                <div className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.warehouseApprovalMode === 'Single' || !settings.warehouseApprovalMode ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`} onClick={() => updateSetting('warehouseApprovalMode', 'Single')}>
                  <RadioGroupItem value="Single" id="cs-app-single" className="mt-1" />
                  <div>
                    <Label htmlFor="cs-app-single" className="font-bold cursor-pointer">Single Signature (Standar)</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hanya perlu tanda tangan Admin Gudang untuk posting stok.</p>
                  </div>
                </div>
                <div className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.warehouseApprovalMode === 'Dual' ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-600 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700'}`} onClick={() => updateSetting('warehouseApprovalMode', 'Dual')}>
                  <RadioGroupItem value="Dual" id="cs-app-dual" className="mt-1" />
                  <div>
                    <Label htmlFor="cs-app-dual" className="font-bold cursor-pointer">Dual Signature (Enterprise)</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Memerlukan tanda tangan Admin dan Manajer Gudang.</p>
                  </div>
                </div>
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
