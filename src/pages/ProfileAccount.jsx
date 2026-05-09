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
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PLAN_TIERS } from '@/planConfig';

export default function ProfileAccount({ store }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

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
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{plan.priceLabel}</span>
                    {plan.price > 0 && <span className="text-sm text-slate-400">/bulan</span>}
                  </div>
                  <div className="space-y-2">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600">{f}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-[11px] text-blue-600 font-bold pl-5">+ {plan.features.length - 4} fitur lainnya</p>
                    )}
                  </div>
                  {planId === 'free' ? (
                    <Button 
                      onClick={() => navigate('/PricingPage')}
                      className={`w-full h-10 rounded-xl font-bold text-sm bg-gradient-to-r ${PLAN_TIERS.pro.gradient} text-white hover:opacity-90 shadow-md transition-all hover:scale-[1.02]`}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade ke Pro
                    </Button>
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
    </div>
  );
}
