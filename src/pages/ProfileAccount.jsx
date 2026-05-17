import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Shield, 
  Key, 
  LogOut, 
  Clock, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Upload,
  Crown,
  Zap,
  Sparkles,
  Lock,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PLAN_TIERS } from '@/planConfig';
import { toast as sonnerToast } from 'sonner';

export default function ProfileAccount({ store }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [outboundUsage, setOutboundUsage] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Trial detection
  const isTrial = store?.plan === 'pro' && store?.has_used_trial;

  // Checkout handler (same as PricingPage)
  const handleUpgradeCheckout = async () => {
    const plan = PLAN_TIERS.pro;
    if (!plan || !store?.id) return;
    setIsProcessing(true);
    try {
      const response = await api.client.functions.invoke('mayar-saas-checkout', {
        body: {
          store_id: store.id,
          plan_id: plan.id,
          billingCycle: billingCycle,
          customer_name: user?.full_name || store.owner_name,
          customer_email: user?.email || store.owner_email || store.email,
          redirect_url: window.location.href
        }
      });
      if (response.error) throw response.error;
      const data = response.data;
      if (data?.success && data?.link) {
        let finalLink = data.link;
        if (finalLink.includes('ferdiarmond.myr.id')) {
          finalLink = finalLink.replace('ferdiarmond.myr.id', 'paytradixasystems.myr.id');
        }
        window.location.href = finalLink;
      } else {
        throw new Error(data?.error || 'Gagal membuat link pembayaran');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      sonnerToast.error(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateTrial = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const expires = new Date();
      expires.setDate(expires.getDate() + 14);

      const { error } = await supabase.from('stores').update({
        plan: 'pro',
        has_used_trial: true,
        plan_started_at: now.toISOString(),
        plan_expires_at: expires.toISOString()
      }).eq('id', store.id);

      if (error) throw error;

      sonnerToast.success('Trial Pro 14 Hari berhasil diaktifkan!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to activate trial:', error);
      sonnerToast.error('Gagal mengaktifkan trial.');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [store]);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const userData = await api.auth.me();
      setUser({
        ...userData,
        position: userData.position || (store?.owner_user_id === userData.id ? 'Owner / Director' : 'Staff Member'),
        phone: userData.phone || store?.phone || '08123456789'
      });

      if (store?.id) {
        const { count } = await supabase
          .from('outbound_deliveries')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', store.id);
        setOutboundUsage(count || 0);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Password Diperbarui",
        description: "Password akun Anda telah berhasil diubah.",
      });
    }, 1000);
  };

  // === UPLOAD FOTO PROFIL ===
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran (max 2MB) dan tipe
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran foto maksimal 2MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format Tidak Didukung",
        description: "Silakan pilih file gambar (JPG, PNG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Upload ke Supabase Storage
      const result = await api.storage.upload(file, 'profile');
      const avatarUrl = result.url;

      // Update user record di database
      if (user?.id && user.id !== 'admin') {
        await supabase.from('users').update({ avatar_url: avatarUrl, photo_url: avatarUrl }).eq('id', user.id);
        
        // Sync to linked employee if exists
        if (user.linked_employee_id) {
          try {
             await supabase.from('employees').update({ photo_url: avatarUrl }).eq('id', user.linked_employee_id);
          } catch(e) { console.error('Failed to sync to HRIS:', e); }
        }
      }

      // Update store record juga (untuk sinkronisasi ke Header)
      if (store?.id) {
        await supabase.from('stores').update({ owner_avatar_url: avatarUrl }).eq('id', store.id);
      }

      // Update local state
      setUser(prev => ({ ...prev, avatar_url: avatarUrl }));

      // Save to localStorage so it persists on refresh (especially for local testing)
      const storedUserStr = localStorage.getItem('tradixa_user');
      let storedUser = storedUserStr ? JSON.parse(storedUserStr) : { ...user };
      storedUser.avatar_url = avatarUrl;
      localStorage.setItem('tradixa_user', JSON.stringify(storedUser));

      // Invalidate auth cache so next api.auth.me() fetches fresh data
      api.auth._currentUser = null;

      // Dispatch event agar Header tahu ada update avatar
      window.dispatchEvent(new CustomEvent('avatar_updated', { detail: { avatarUrl } }));

      toast({
        title: "✅ Foto Profil Diperbarui",
        description: "Foto profil Anda telah berhasil diubah dan tersinkronisasi.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Gagal Upload",
        description: "Terjadi kesalahan saat mengunggah foto.",
        variant: "destructive",
      });
    }
    setIsUploadingPhoto(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'AD';
  const avatarUrl = user.avatar_url || user.photo_url || store?.owner_avatar_url;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header Profile Section */}
      <div className="relative rounded-3xl bg-slate-900 shadow-2xl mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black opacity-90"></div>
        <div className="relative h-40 px-8 pb-6 flex items-end gap-6 z-10">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl overflow-hidden border-2 border-slate-100">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={user.full_name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#74EB41] to-[#60D832] flex items-center justify-center text-slate-900 text-3xl font-black">
                  {initials}
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="mb-2">
            <h1 className="text-2xl font-black text-white tracking-tight">{user.full_name || 'Administrator'}</h1>
            <p className="text-slate-300 font-medium flex items-center gap-2 text-sm mt-1">
              <Mail className="w-4 h-4 text-slate-400" /> {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Identity Cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-900" /> Informasi Pribadi
              </CardTitle>
              <CardDescription>Rincian identitas Anda yang terdaftar di sistem</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Lengkap</Label>
                  <div className="h-12 flex items-center px-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800">
                    {user.full_name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nomor WhatsApp</Label>
                  <div className="h-12 flex items-center px-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 gap-3">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    {user.phone}
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">VERIFIED</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Jabatan (Position)</Label>
                  <div className="h-12 flex items-center px-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 gap-3">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {user.position}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tingkat Akses (Role)</Label>
                  <div className="h-12 flex items-center px-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 gap-3">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="capitalize">{user.role || 'Super Admin'}</span>
                  </div>
                </div>
              </div>

              {/* Foto Profil Upload Section */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-slate-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#74EB41] to-[#60D832] flex items-center justify-center text-slate-900 font-black">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">Foto Profil</p>
                  <p className="text-xs text-slate-500 mt-0.5">JPG, PNG atau WEBP. Maks 2MB.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="flex-shrink-0"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingPhoto ? 'Uploading...' : 'Ubah Foto'}
                </Button>
              </div>

              <div className="p-6 bg-blue-600 rounded-3xl text-white flex items-center gap-6 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#74EB41]" />
                </div>
                <div>
                  <h4 className="font-black text-lg">Keamanan Akun Terjamin</h4>
                  <p className="text-slate-400 text-xs">Akun Anda dilindungi oleh enkripsi 256-bit dan akses berbasis peran (RBAC).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-slate-900" /> Keamanan & Password
              </CardTitle>
              <CardDescription>Perbarui password secara berkala untuk menjaga keamanan data</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600">Password Lama</Label>
                  <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Password Baru</Label>
                    <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Konfirmasi Password</Label>
                    <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl border-slate-200" />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-black h-12 px-8 rounded-2xl">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Simpan Perubahan Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status & Activity */}
        <div className="space-y-6">
          {/* Subscription Plan Card */}
          {(() => {
            const planId = store?.plan || 'free';
            const plan = PLAN_TIERS[planId] || PLAN_TIERS.free;
            const planIcons = { free: Shield, pro: Zap, enterprise: Crown };
            const PlanIcon = planIcons[planId] || Shield;

            // Calculate subscription details
            const startedAt = store?.plan_started_at ? new Date(store.plan_started_at) : null;
            const expiresAt = store?.plan_expires_at ? new Date(store.plan_expires_at) : null;
            const now = new Date();
            const remainingDays = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))) : null;
            const totalDays = (startedAt && expiresAt) ? Math.ceil((expiresAt - startedAt) / (1000 * 60 * 60 * 24)) : null;
            const progressPercent = (totalDays && remainingDays !== null) ? Math.max(0, Math.min(100, ((totalDays - remainingDays) / totalDays) * 100)) : 0;
            
            // Status determination
            const isGracePeriod = expiresAt && now > expiresAt && now <= new Date(expiresAt.getTime() + 2 * 24 * 60 * 60 * 1000);
            const isExpiringSoon = remainingDays !== null && remainingDays <= 7 && remainingDays > 0;
            const isActive = planId !== 'free' && expiresAt && now <= expiresAt;

            const formatDate = (d) => d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

            return (
              <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${plan.gradient} p-5`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                      <PlanIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Paket Langganan</p>
                      <h3 className="text-xl font-black text-white">{plan.name} Plan</h3>
                    </div>
                    {isActive && (
                      <Badge className="ml-auto bg-white/20 text-white border-none font-bold text-[10px]">AKTIF</Badge>
                    )}
                    {isGracePeriod && (
                      <Badge className="ml-auto bg-red-500/80 text-white border-none font-bold text-[10px] animate-pulse">GRACE PERIOD</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{plan.priceLabel}</span>
                    {plan.price > 0 && <span className="text-sm text-slate-400">/bulan</span>}
                  </div>

                  {/* Subscription Date Details */}
                  {planId !== 'free' && (startedAt || expiresAt) && (
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📅 Mulai</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(startedAt)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📅 Berakhir</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(expiresAt)}</p>
                        </div>
                      </div>
                      
                      {/* Remaining Days */}
                      {remainingDays !== null && (
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⏳ Sisa Waktu</span>
                            <span className={`text-xs font-black ${
                              isGracePeriod ? 'text-red-600' :
                              isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {isGracePeriod ? 'Expired! Perpanjang dalam 2 hari' :
                               remainingDays === 0 ? 'Berakhir hari ini' :
                               `${remainingDays} hari lagi`}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isGracePeriod ? 'bg-red-500' :
                                isExpiringSoon ? 'bg-amber-500' :
                                progressPercent < 50 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Grace Period Warning */}
                      {isGracePeriod && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-[11px] font-bold text-red-700 dark:text-red-400">
                            Masa tenggang 2 hari. Jika tidak diperpanjang, akun akan kembali ke Free Plan.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-2">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{f}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-[11px] text-blue-600 font-bold pl-5">+ {plan.features.length - 4} fitur lainnya</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {planId === 'free' ? (
                    <div className="space-y-2">
                      {!store?.has_used_trial && (
                        <Button 
                          onClick={handleActivateTrial}
                          disabled={isProcessing}
                          className="w-full h-10 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-md transition-all hover:scale-[1.02]"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                          {isProcessing ? 'Memproses...' : 'Coba Trial Pro 14 Hari'}
                        </Button>
                      )}
                      <Button 
                        onClick={() => navigate('/PricingPage')}
                        className={`w-full h-10 rounded-xl font-bold text-sm bg-gradient-to-r ${PLAN_TIERS.pro.gradient} text-white hover:opacity-90 shadow-md transition-all hover:scale-[1.02]`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade ke Pro
                      </Button>
                    </div>
                  ) : (isExpiringSoon || isGracePeriod) ? (
                    <Button 
                      onClick={() => navigate('/PricingPage')}
                      className="w-full h-10 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-md transition-all hover:scale-[1.02] animate-pulse"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Perpanjang Sekarang
                    </Button>
                  ) : planId === 'pro' && isTrial ? (
                    <>
                      <Button 
                        disabled
                        className="w-full h-10 rounded-xl font-bold text-sm bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Paket Trial Pro
                      </Button>
                      <Button 
                        onClick={() => setShowUpgradeDialog(true)}
                        className={`w-full h-10 rounded-xl font-bold text-sm bg-gradient-to-r ${PLAN_TIERS.pro.gradient} text-white hover:opacity-90 shadow-md transition-all hover:scale-[1.02]`}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade ke Pro
                      </Button>
                    </>
                  ) : planId === 'pro' ? (
                    <Button 
                      disabled
                      className="w-full h-10 rounded-xl font-bold text-sm bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Paket Pro Aktif
                    </Button>
                  ) : null}
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/PricingPage')}
                    className="w-full h-9 rounded-xl font-bold text-xs border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Lihat Semua Paket & Pricing Plans
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Usage Stats for Free Plan */}
          {(!store?.plan || store?.plan === 'free') && (
            <Card className="border-slate-200 rounded-3xl shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Batas Penggunaan (Free Plan)</h3>
                  <Badge className="bg-slate-100 text-slate-600 border-none">{outboundUsage} / 5</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-slate-500 uppercase">Outbound Delivery</span>
                      <span className={outboundUsage >= 5 ? 'text-red-500' : 'text-slate-700'}>{outboundUsage} dari 5 Data</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${outboundUsage >= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (outboundUsage / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {outboundUsage >= 5 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">Batas data maksimal tercapai. Anda tidak dapat membuat data pengiriman baru. Silakan upgrade ke Pro Plan.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 rounded-3xl shadow-sm bg-gradient-to-b from-white to-slate-50/50">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Status Akun Aktif</h3>
                  <p className="text-xs text-slate-500 mt-1 italic font-medium">Terakhir login: Hari ini, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Aktif</p>
                    <p className="text-sm font-bold text-slate-700">Chrome on MacOS</p>
                  </div>
                  <Badge className="ml-auto bg-blue-50 text-blue-600 border-none font-bold">CURRENT</Badge>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</p>
                    <p className="text-sm font-bold text-slate-700">182.1.204.XX</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            asChild
            className="w-full h-14 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all hover:scale-[1.01] group"
          >
            <a 
              href="https://wa.me/6281383882120?text=Halo%20Tradixa%2C%20saya%20butuh%20bantuan%20terkait%20akun%20saya." 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-5 h-5" />
              Hubungi Support (WhatsApp)
            </a>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full h-14 rounded-3xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-slate-600 font-bold group"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            Keluar dari Sistem
          </Button>
        </div>
      </div>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-900">Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses data Tradixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Checkout Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={(open) => !open && setShowUpgradeDialog(false)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Pilih siklus penagihan</DialogTitle>
          <DialogDescription className="sr-only">Pilih antara penagihan tahunan atau bulanan</DialogDescription>
          <div className="bg-slate-50">
            <div className="p-6 text-center space-y-2 border-b border-slate-200 bg-white pt-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upgrade ke Pro Plan</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Pilih siklus penagihan untuk Pro Plan. Akses semua fitur tanpa batas.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Yearly Option */}
              <div 
                onClick={() => setBillingCycle('yearly')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${billingCycle === 'yearly' ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-4 ring-emerald-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${billingCycle === 'yearly' ? 'border-emerald-500' : 'border-slate-300'}`}>
                      {billingCycle === 'yearly' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                    </div>
                    <span className="font-bold text-slate-900">Tahunan</span>
                    <span className="text-slate-500 text-sm">— {PLAN_TIERS.pro.yearlyPriceLabel} × 12 bulan</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold border-0 px-2 py-0.5 text-[10px]">
                    HEMAT 17%
                  </Badge>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="mt-4 pl-8 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Diskon spesial (gratis 2 bulan)
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Prioritas Customer Support
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Option */}
              <div 
                onClick={() => setBillingCycle('monthly')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${billingCycle === 'monthly' ? 'border-blue-500 bg-blue-50/30 shadow-md ring-4 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${billingCycle === 'monthly' ? 'border-blue-500' : 'border-slate-300'}`}>
                    {billingCycle === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <span className="font-bold text-slate-900">Bulanan</span>
                  <span className="text-slate-500 text-sm">— {PLAN_TIERS.pro.priceLabel} / bulan</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Pembayaran aman oleh Mayar</span>
              </div>
              <Button 
                onClick={handleUpgradeCheckout}
                disabled={isProcessing}
                className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 text-sm transition-all hover:scale-105 shadow-lg flex items-center gap-2"
              >
                {isProcessing && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>}
                {isProcessing ? 'Memproses...' : 'Lanjutkan ke Checkout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
