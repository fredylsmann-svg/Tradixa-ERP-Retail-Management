import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Image as ImageIcon, Layout, Mail, FileText, Check, ExternalLink, Save, Zap, Eye, Truck, ShoppingCart, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { getEmailTemplate } from '@/utils/emailTemplates';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignaturePad from '@/components/ui/SignaturePad';
import PageHeader from '@/components/layout/PageHeader';

export default function DesignStudio({ store }) {
  const [brandColor, setBrandColor] = useState(store?.brand_color || '#2563eb');
  const [titleColor, setTitleColor] = useState(store?.title_color || '#0f172a');
  const [activeTab, setActiveTab] = useState('branding');
  const [selectedTemplate, setSelectedTemplate] = useState(store?.invoice_layout_style || 'Modern');
  const [previewMode, setPreviewMode] = useState('Marketing'); // 'Marketing' or 'Invoice'
  const [logoUrl, setLogoUrl] = useState(store?.logo_url || null);
  const [logoFile, setLogoFile] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(store?.signature_url || '');
  const [signatureHistory, setSignatureHistory] = useState(store?.signature_history || []);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [ownerName, setOwnerName] = useState(store?.owner_name || '');
  const [ownerPosition, setOwnerPosition] = useState(store?.owner_position || '');
  const [isSaving, setIsSaving] = useState(false);
  const [previewPaid, setPreviewPaid] = useState(false);
  const [fontFamily, setFontFamily] = useState(store?.font_family || 'Inter');
  const [showMarketingLogo, setShowMarketingLogo] = useState(store?.show_marketing_logo ?? true);
  const [marketingLogoAlign, setMarketingLogoAlign] = useState(store?.marketing_logo_align || 'center');
  const [marketingLogoSize, setMarketingLogoSize] = useState(store?.marketing_logo_size || 'medium');
  const [previewCtaText, setPreviewCtaText] = useState('Belanja Sekarang');

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)}MB melebihi batas maksimal 2MB.`);
        e.target.value = ''; return;
      }
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      toast.success('Logo terpilih! Klik Simpan untuk memperbarui secara permanen.');
    }
  };


  const handleConfirmSignature = async (dataUrl) => {
    setSignatureUrl(dataUrl);
    setShowSignatureDialog(false);
    toast.success('Tanda tangan dibuat! Sedang menyimpan...');
    
    try {
      let finalUrl = dataUrl;
      // Upload to Supabase Storage if it's a new drawing (data URL)
      if (dataUrl.startsWith('data:image')) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `${store.id}/signature-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, blob, { upsert: true });
        
        if (!uploadError) {
           const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
           finalUrl = publicUrl;
           setSignatureUrl(finalUrl);
        }
      }

      let updatedHistory = Array.isArray(signatureHistory) ? [...signatureHistory] : [];
      if (finalUrl && !updatedHistory.includes(finalUrl)) {
        updatedHistory = [finalUrl, ...updatedHistory].slice(0, 5);
        setSignatureHistory(updatedHistory);
      }
      
      await supabase.from('stores').update({
        signature_url: finalUrl,
        signature_history: updatedHistory,
        owner_name: ownerName,
        owner_position: ownerPosition
      }).eq('id', store.id);
      
      window.dispatchEvent(new Event('refresh_data'));
      
    } catch (e) {
       console.error("Gagal auto-save signature:", e);
    }
  };

  const handleSaveBranding = async () => {
    if (!store?.id) return;
    
    setIsSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      let finalSignatureUrl = signatureUrl;

      // Jika ada file baru, unggah ke storage (melalui storageService → auto-compress)
      if (logoFile) {
        const { uploadFile } = await import('@/utils/storageService');
        finalLogoUrl = await uploadFile(logoFile, 'logo');
      }

      // if finalSignatureUrl is a data URL (not uploaded yet), upload it
      if (finalSignatureUrl && finalSignatureUrl.startsWith('data:image')) {
        const res = await fetch(finalSignatureUrl);
        const blob = await res.blob();
        const fileName = `${store.id}/signature-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, blob, { upsert: true });
        if (!uploadError) {
           const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
           finalSignatureUrl = publicUrl;
        }
      }

      let updatedHistory = Array.isArray(signatureHistory) ? [...signatureHistory] : [];
      
      if (finalSignatureUrl && !updatedHistory.includes(finalSignatureUrl)) {
        updatedHistory = [finalSignatureUrl, ...updatedHistory].slice(0, 5); // Simpan 5 history terakhir
        setSignatureHistory(updatedHistory);
      }

      const { error } = await supabase
        .from('stores')
        .update({
          brand_color: brandColor,
          title_color: titleColor,
          logo_url: finalLogoUrl,
          signature_url: finalSignatureUrl,
          signature_history: updatedHistory,
          invoice_layout_style: selectedTemplate,
          owner_name: ownerName,
          owner_position: ownerPosition,
          font_family: fontFamily,
          show_marketing_logo: showMarketingLogo,
          marketing_logo_align: marketingLogoAlign,
          marketing_logo_size: marketingLogoSize
        })
        .eq('id', store.id);

      if (error) throw error;
      window.dispatchEvent(new Event('refresh_data'));
      toast.success('Pengaturan Branding berhasil disimpan & diterapkan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      
      <PageHeader 
        title="Design Studio"
        subtitle="Kelola identitas visual dan template dokumen bisnis Anda."
        icon={Palette}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" /> Preview All
            </Button>
            <Button 
              onClick={handleSaveBranding} 
              className="bg-blue-600 gap-2"
              disabled={isSaving}
            >
              {isSaving ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Settings */}
        <div className="lg:col-span-4 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="branding" className="rounded-lg gap-2">
                <Palette className="w-4 h-4" /> Branding
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-lg gap-2">
                <Layout className="w-4 h-4" /> Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-6 space-y-6">
              <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg">Brand Identity</CardTitle>
                  <CardDescription>Logo dan warna utama bisnis Anda.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <Label>Logo Toko</Label>
                    <label 
                      htmlFor="logo-upload"
                      className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-400 transition-colors cursor-pointer group bg-white"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Ganti Logo</p>
                        <p className="text-xs text-slate-400">PNG, SVG atau JPG (Maks. 2MB)</p>
                      </div>
                    </label>

                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox 
                        id="showMarketingLogo" 
                        checked={showMarketingLogo} 
                        onCheckedChange={setShowMarketingLogo}
                      />
                      <Label htmlFor="showMarketingLogo" className="text-[11px] font-semibold text-slate-500 cursor-pointer">Tampilkan Logo di Email Marketing</Label>
                    </div>

                    {showMarketingLogo && (
                      <div className="flex items-center gap-1 mt-2 bg-slate-100 p-1 rounded-lg w-fit">
                        {[
                          { id: 'left', icon: AlignLeft },
                          { id: 'center', icon: AlignCenter },
                          { id: 'right', icon: AlignRight },
                        ].map((align) => (
                          <Button
                            key={align.id}
                            variant="ghost"
                            size="sm"
                            className={`h-7 w-8 p-0 rounded-md transition-all ${marketingLogoAlign === align.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setMarketingLogoAlign(align.id)}
                          >
                            <align.icon className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {showMarketingLogo && (
                      <div className="flex items-center gap-1 mt-2 bg-slate-100 p-1 rounded-lg w-fit">
                        {[
                          { id: 'small', label: 'S' },
                          { id: 'medium', label: 'M' },
                          { id: 'large', label: 'L' },
                        ].map((size) => (
                          <Button
                            key={size.id}
                            variant="ghost"
                            size="sm"
                            className={`h-7 w-8 p-0 rounded-md transition-all text-[10px] font-bold ${marketingLogoSize === size.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setMarketingLogoSize(size.id)}
                          >
                            {size.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label>Tanda Tangan Digital</Label>
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-center h-12 border-dashed font-semibold"
                          onClick={() => setShowSignatureDialog(true)}
                        >
                          Atur Tanda Tangan Digital
                        </Button>
                        <p className="text-xs text-slate-400 text-center">Gunakan tanda tangan digital untuk dicantumkan otomatis pada Invoice. Jadi tanda tangan tersebut hanya berlaku untuk di invoice.</p>
                      </div>
                      {signatureUrl && (
                        <div className="w-full h-32 bg-slate-50/50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 p-2">
                          <img src={signatureUrl} alt="Preview" className="w-full h-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen" onError={(e) => e.target.style.display = 'none'} onLoad={(e) => e.target.style.display = 'block'} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Warna Utama</Label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#7c3aed', '#1e293b',
                        '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#475569'
                      ].map(color => (
                        <div
                          key={color}
                          onClick={() => setBrandColor(color)}
                          className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 ${brandColor === color ? 'ring-2' : ''}`}
                          style={{ backgroundColor: color, ringColor: brandColor }}
                        >
                          {brandColor === color && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                      {/* Custom Color Circle */}
                      <label 
                        className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 relative overflow-hidden border-2 border-slate-200 ${![ '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#7c3aed', '#1e293b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#475569'].includes(brandColor) ? 'ring-2' : ''}`}
                        style={{ ringColor: brandColor }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 opacity-20" />
                        <Palette className="w-5 h-5 text-slate-400" />
                        <input 
                          type="color" 
                          value={brandColor} 
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                      <Input 
                        type="text" 
                        value={brandColor} 
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="font-mono text-sm uppercase h-10"
                      />
                      <div className="w-10 h-10 rounded-lg shrink-0 border shadow-sm" style={{ backgroundColor: brandColor }} />
                    </div>
                    
                    <Label className="text-xs text-slate-400 mt-2 block">Warna Gradient (Premium)</Label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                        'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                        'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
                      ].map(grad => (
                        <div
                          key={grad}
                          onClick={() => setBrandColor(grad)}
                          className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 ${brandColor === grad ? 'ring-2' : ''}`}
                          style={{ background: grad, ringColor: brandColor.includes('gradient') ? '#2563eb' : brandColor }}
                        >
                          {brandColor === grad && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label>Warna Judul Dokumen</Label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        '#0f172a', '#1e293b', '#2563eb', '#ef4444', '#10b981', '#7c3aed'
                      ].map(color => (
                        <div
                          key={color}
                          onClick={() => setTitleColor(color)}
                          className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 ${titleColor === color ? 'ring-2' : ''}`}
                          style={{ backgroundColor: color, ringColor: titleColor }}
                        >
                          {titleColor === color && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                      {/* Custom Title Color Circle */}
                      <label 
                        className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 relative overflow-hidden border-2 border-slate-200 ${![ '#0f172a', '#1e293b', '#2563eb', '#ef4444', '#10b981', '#7c3aed'].includes(titleColor) ? 'ring-2' : ''}`}
                        style={{ ringColor: titleColor }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-400 to-slate-900 opacity-20" />
                        <Palette className="w-5 h-5 text-slate-400" />
                        <input 
                          type="color" 
                          value={titleColor} 
                          onChange={(e) => setTitleColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>

                    <Label className="text-xs text-slate-400 mt-2 block">Judul Gradient (Premium)</Label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                        'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)',
                        'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                        'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
                        'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
                        'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)'
                      ].map(grad => (
                        <div
                          key={grad}
                          onClick={() => setTitleColor(grad)}
                          className={`w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center ring-offset-2 ${titleColor === grad ? 'ring-2' : ''}`}
                          style={{ background: grad, ringColor: titleColor.includes('gradient') ? '#0f172a' : titleColor }}
                        >
                          {titleColor === grad && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label>Gaya Huruf (Font Style)</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="w-full h-11 rounded-xl bg-white border-slate-200">
                        <SelectValue placeholder="Pilih font..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter" className="font-sans">Inter (Modern)</SelectItem>
                        <SelectItem value="Roboto" className="font-sans">Roboto (Corporate)</SelectItem>
                        <SelectItem value="Playfair Display" className="font-serif">Playfair Display (Elegant)</SelectItem>
                        <SelectItem value="Montserrat" className="font-sans">Montserrat (Geometric)</SelectItem>
                        <SelectItem value="Outfit" className="font-sans">Outfit (Stylish)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400">Pilih tipografi yang paling sesuai dengan karakter bisnis Anda.</p>
                  </div>

                  {previewMode !== 'Marketing' && (
                    <div className="pt-4 border-t space-y-4">
                      <Label>Preview Status</Label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <Button 
                          variant={!previewPaid ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="flex-1 rounded-lg text-xs"
                          onClick={() => setPreviewPaid(false)}
                        >
                          Belum Bayar
                        </Button>
                        <Button 
                          variant={previewPaid ? 'secondary' : 'ghost'} 
                          size="sm" 
                          className="flex-1 rounded-lg text-xs"
                          onClick={() => setPreviewPaid(true)}
                        >
                          Sudah Lunas
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl" style={{ borderLeft: `4px solid ${brandColor}` }}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Branding Otomatis</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Logo dan warna ini akan otomatis diterapkan ke seluruh dokumen seperti Invoice, Email, dan Laporan.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { 
                    id: 'Marketing', 
                    icon: Mail, 
                    count: 3, 
                    desc: 'Digunakan untuk pengiriman promosi, pengumuman, dan update otomatis ke email pelanggan.' 
                  },
                  { 
                    id: 'Invoices', 
                    icon: FileText, 
                    count: 2, 
                    desc: 'Digunakan pada modul Penjualan (Sales) untuk penagihan dan bukti pembayaran (Payment Receipt).' 
                  },
                  { 
                    id: 'Invoice Piutang (AR)', 
                    icon: FileText, 
                    count: 2, 
                    desc: 'Digunakan pada modul Account Receivable untuk tagihan piutang usaha ke pelanggan.' 
                  },
                  { 
                    id: 'Invoice Hutang (AP)', 
                    icon: FileText, 
                    count: 2, 
                    desc: 'Digunakan pada modul Account Payable untuk pencatatan hutang usaha ke supplier.' 
                  },
                  { 
                    id: 'Delivery Orders', 
                    icon: Truck, 
                    count: 2, 
                    desc: 'Digunakan pada modul Logistik & Gudang sebagai Surat Jalan resmi pengiriman barang.' 
                  },
                  { 
                    id: 'Purchase Orders', 
                    icon: ShoppingCart, 
                    count: 2, 
                    desc: 'Digunakan pada modul Procurement untuk pesanan resmi ke Supplier / Vendor.' 
                  },
                  { 
                    id: 'Inventory GRN', 
                    icon: Layout, 
                    count: 2, 
                    desc: 'Digunakan pada modul Logistik & Gudang sebagai bukti penerimaan barang di gudang.' 
                  },
                  { 
                    id: 'Goods Receipt Note', 
                    icon: Layout, 
                    count: 2, 
                    desc: 'Dokumen bukti penerimaan barang profesional dengan SLA Tracking dan detail item lengkap.' 
                  },
                ].map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setPreviewMode(item.id)}
                    className={`p-5 border rounded-2xl flex items-start justify-between transition-all cursor-pointer ${previewMode === item.id ? 'shadow-lg' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    style={previewMode === item.id ? { borderColor: brandColor, backgroundColor: `${brandColor}05`, ringColor: brandColor } : {}}
                  >
                    <div className="flex gap-4">
                      <div 
                        className={`p-3 rounded-xl shrink-0 ${previewMode === item.id ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
                        style={previewMode === item.id ? { backgroundColor: brandColor } : {}}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">{item.id}</p>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">{item.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant="outline" className="text-[10px] py-0 h-5">{item.count} Layouts</Badge>
                           {previewMode === item.id && <Badge className="text-[10px] py-0 h-5" style={{ backgroundColor: brandColor }}>Active Preview</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:col-span-8">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Live Preview: {previewMode}
              </span>
              <div className="flex gap-2">
                {previewMode === 'Marketing' ? (
                  ['Standard', 'Promotion', 'Announcement'].map(tpl => (
                    <Button 
                      key={tpl}
                      variant={selectedTemplate === tpl ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      onClick={() => setSelectedTemplate(tpl)}
                    >
                      {tpl}
                    </Button>
                  ))
                ) : (
                  ['Modern', 'Classic'].map(lyt => (
                    <Button 
                      key={lyt}
                      variant={selectedTemplate === lyt ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      onClick={() => setSelectedTemplate(lyt)}
                    >
                      {lyt} Style
                    </Button>
                  ))
                )}
              </div>
              {previewMode === 'Marketing' && selectedTemplate === 'Promotion' && (
                <div className="flex items-center gap-2 mt-4 bg-white p-3 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Custom CTA:</span>
                  <Input 
                    value={previewCtaText} 
                    onChange={(e) => setPreviewCtaText(e.target.value)}
                    placeholder="Contoh: AMBIL DISKON"
                    className="h-8 text-xs border-none bg-slate-50 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4 md:p-8 min-h-[700px] flex items-start justify-start md:justify-center overflow-x-auto overflow-y-auto shadow-inner group relative">
              {/* Mockup Frame Decor */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              
              <div className="w-full min-w-[700px] md:min-w-0 animate-in zoom-in-95 duration-500 origin-top">
                {previewMode === 'Marketing' ? (
                  <div 
                    className="max-w-[500px] mx-auto shadow-2xl"
                    dangerouslySetInnerHTML={{ 
                      __html: getEmailTemplate({
                        storeName: store?.store_name || 'TOKO ANDA',
                        html: `
                          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Update Bisnis Anda</h2>
                          <p>Ini adalah tampilan email marketing profesional yang akan diterima pelanggan. Desain ini otomatis menyesuaikan dengan warna brand Anda.</p>
                        `,
                        templateType: ['Standard', 'Promotion', 'Announcement'].includes(selectedTemplate) ? selectedTemplate : 'Standard',
                        fontFamily: fontFamily,
                        brandColor: brandColor,
                        logoUrl: logoUrl,
                        showLogo: showMarketingLogo,
                        ctaText: previewCtaText,
                        logoAlign: marketingLogoAlign,
                        logoSize: marketingLogoSize
                      })
                    }} 
                  />
                ) : (
                  <div 
                    className="max-w-[600px] mx-auto shadow-2xl bg-white"
                    dangerouslySetInnerHTML={{ 
                      __html: getDocumentTemplate({
                        type: previewMode === 'Invoice Piutang (AR)' ? 'INVOICE AR' : 
                              previewMode === 'Invoice Hutang (AP)' ? 'INVOICE AP' :
                              previewMode === 'Invoices' ? 'INVOICE' : 
                              previewMode === 'Purchase Orders' ? 'PURCHASE ORDER' : 
                              previewMode === 'Goods Receipt Note' ? 'GOODS RECEIPT NOTE' :
                              previewMode === 'Inventory GRN' ? 'INVENTORY GRN' : 'DELIVERY ORDER',
                        storeName: store?.store_name || 'TOKO ANDA',
                        logoUrl: logoUrl,
                        brandColor: brandColor,
                        titleColor: titleColor,
                        layout: selectedTemplate === 'Classic' ? 'Classic' : 'Modern',
                        signatureUrl: signatureUrl,
                        ownerName: ownerName,
                        ownerPosition: ownerPosition,
                        isPreview: true,
                        fontFamily: fontFamily,
                        total: previewMode === 'Inventory GRN' ? 9999 : 500000,
                        data: {
                          status: previewMode.includes('Invoice') ? (previewPaid ? 'Paid' : 'Unpaid') : 
                                  previewMode === 'Purchase Orders' ? 'Draft' : 
                                  previewMode === 'Goods Receipt Note' ? 'Received' :
                                  previewMode === 'Delivery Orders' ? 'Released' : 'Draft',
                          timestamp_wib: '29/04/2026 12:23 WIB',
                          full_timestamp: 'Rabu, 29 April 2026 12:23 WIB',
                          store_address: 'Jl. Jendral Sudirman No. 45, Jakarta Selatan, 12190',
                          store_phone: '0812-3456-7890',
                          store_email: 'contact@tradixa.id',
                          customer_name: 'PT Maju Jaya Sentosa',
                          customer_address: 'Gedung Cyber 2, Kuningan, Jakarta Selatan',
                          customer_phone: '0821-9988-7766',
                          customer_email: 'finance@majujaya.com',
                          supplier_name: 'SUPPLIER UTAMA PT',
                          supplier_address: 'Kawasan Industri Jababeka, Cikarang, Bekasi',
                          supplier_phone: '021-88776655',
                          supplier_email: 'sales@supplierutama.com',
                          po_number: 'PO-PREVIEW-001',
                          delivery_date: '25 April 2026',
                          confirmed_delivery_date: '2026-05-04 22:49',
                          actual_arrival_at: '2026-05-04 22:49',
                          due_date: '2026-05-27',
                          surat_jalan: 'SJ-PREVIEW-001',
                          storage_location: 'Gudang Utama - Rak A1',
                          journal_id: 'JV-20260429-XXXX',
                          shipping_via: 'Ekspedisi Tradixa',
                          driver_name: 'Budi Santoso',
                          driver_signature: 'https://placehold.co/200x80/white/black?text=Tanda+Tangan+Driver',
                          vehicle_no: 'B 1234 ABC',
                          shipping_confirmation: {
                            delivery_method: 'Ekspedisi Eksternal',
                            courier_name: 'SiCepat',
                            supplier_delivery_note_no: 'SJV-982-2028',
                            ship_via: 'B 98234',
                            driver_name: 'MADE',
                            tracking_no: '4234',
                            driver_phone: '0812-3456-7890'
                          },
                          tax_amount: 110000,
                          bill_amount: 500000,
                          settled_amount: 200000,
                          remaining_amount: 300000,
                          items: previewMode === 'Goods Receipt Note' ? [
                            { product_name: 'BESI BETON 10MM', sku: 'SKU-SEM-6TSQYN', qty_ordered: 100, received_qty: 100, reject_qty: 0, back_order_qty: 0, accepted_qty: 100, condition: 'Baik' },
                            { product_name: 'SEMEN PADANG 50KG', sku: 'SKU-PAD-8827', qty_ordered: 50, received_qty: 48, reject_qty: 2, back_order_qty: 0, accepted_qty: 48, condition: 'Kantong Robek' }
                          ] : previewMode === 'Inventory GRN' ? [
                            { product_name: 'PARACETAMOL 500MG', warehouse_qty: 100, reject_qty: 0, unit: 'box', condition: 'Baik', tracking_type: 'Batch', batches: [{ batch_number: 'BCH-2026A', manufacture_date: '2026-05-01', expiry_date: '2028-10-15', quantity: 50 }, { batch_number: 'BCH-2026B', manufacture_date: '2026-05-02', expiry_date: '2029-01-20', quantity: 50 }] },
                            { product_name: 'AMOXICILLIN 250MG', warehouse_qty: 45, reject_qty: 5, unit: 'btl', condition: 'Rusak', tracking_type: 'Standard', expired_date: '2027-12-31' }
                          ] : [
                            { name: 'Contoh Produk A', qty: 10, unit: 'pcs', price: 50000, total: 500000 },
                            { name: 'Contoh Produk B', qty: 5, unit: 'box', price: 100000, total: 500000 }
                          ]
                        }
                      }) 
                    }} 
                  />
                )}
              </div>
            </div>

            <div className="flex justify-center gap-6 py-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Desktop View
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Mobile Responsive
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tanda Tangan Digital</DialogTitle>
            <DialogDescription>
              Tanda tangani dokumen ini untuk keperluan Invoice dan Surat Jalan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input 
                value={ownerName} 
                onChange={(e) => setOwnerName(e.target.value)} 
                placeholder="Contoh: Administrator" 
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan (Opsional)</Label>
              <Input 
                value={ownerPosition} 
                onChange={(e) => setOwnerPosition(e.target.value)} 
                placeholder="Contoh: Jabatan / Posisi" 
              />
            </div>
          </div>

          {signatureHistory && signatureHistory.length > 0 && (
            <div className="space-y-2 mb-2">
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Pilih dari Riwayat</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {signatureHistory.map((url, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleConfirmSignature(url)}
                    className="w-16 h-12 bg-white border border-slate-200 rounded-lg flex-shrink-0 cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-100 overflow-hidden flex items-center justify-center p-1 transition-all"
                  >
                     <img src={url} alt="history" className="max-w-full max-h-full object-contain mix-blend-multiply dark:invert dark:mix-blend-screen" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <SignaturePad 
            title="Tanda Tangan Baru"
            onSave={handleConfirmSignature}
          />
        </DialogContent>
      </Dialog>
      <input 
        type="file" 
        id="logo-upload" 
        className="hidden" 
        accept="image/*" 
        onChange={handleLogoChange} 
      />
    </div>
  );
}
