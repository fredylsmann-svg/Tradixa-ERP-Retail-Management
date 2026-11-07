import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Key, User, Mail, UserPlus, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// Pesan untuk link undangan yang tidak bisa dipakai
const INVALID_INVITE_MESSAGES = {
  legacy: 'Format link undangan ini sudah tidak berlaku demi keamanan. Silakan minta admin toko mengirim ulang undangan baru.',
  not_found: 'Link undangan tidak valid. Pastikan Anda membuka link lengkap yang dikirim admin toko.',
  used: 'Link undangan ini sudah digunakan. Jika Anda sudah mendaftar, silakan langsung login.',
  revoked: 'Undangan ini sudah dibatalkan oleh admin toko.',
  expired: 'Link undangan sudah kedaluwarsa (berlaku 7 hari). Silakan minta undangan baru ke admin toko.',
  error: 'Gagal memeriksa undangan. Periksa koneksi internet Anda lalu muat ulang halaman.',
};

export default function StaffRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(true);
  const [invite, setInvite] = useState(null); // hasil RPC get_store_invitation
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  // Link format lama (/register?store_id=...&role=...) tidak lagi diterima
  const isLegacyLink = !token && !!queryParams.get('store_id');

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      if (!token) {
        setInvite({ valid: false, reason: isLegacyLink ? 'legacy' : 'not_found' });
        setIsCheckingInvite(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_store_invitation', { p_token: token });
      if (cancelled) return;

      if (error || !data) {
        console.error('[StaffRegister] get_store_invitation error:', error);
        setInvite({ valid: false, reason: 'error' });
      } else {
        setInvite(data);
        if (data.valid && data.full_name) {
          setFormData(prev => ({ ...prev, name: prev.name || data.full_name }));
        }
      }
      setIsCheckingInvite(false);
    };

    loadInvite();
    return () => { cancelled = true; };
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!invite?.valid) return;

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Tidak Sama", description: "Konfirmasi password harus sama dengan password.", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Password Terlalu Pendek", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const email = formData.email.trim().toLowerCase();

    try {
      // 1. Buat akun Supabase Auth. Token undangan disimpan di metadata
      //    sehingga AuthContext bisa menyelesaikan undangan saat login
      //    pertama (misalnya jika verifikasi email diaktifkan).
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: { data: { full_name: formData.name.trim(), invite_token: token } }
      });

      let session = signUpData?.session || null;

      if (authError) {
        const alreadyRegistered =
          authError.message?.toLowerCase().includes('already registered') || authError.status === 422;
        if (!alreadyRegistered) throw authError;

        // Email sudah punya akun login: buktikan kepemilikan dengan password lamanya
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password
        });
        if (signInError) {
          toast({
            title: "Email Sudah Terdaftar",
            description: "Email ini sudah punya akun. Masukkan password lama akun tersebut, atau gunakan email lain.",
            variant: "destructive"
          });
          return;
        }
        session = signInData?.session || null;
      }

      if (session) {
        // 2. Terima undangan di server (role/toko/modul diambil dari database, bukan dari URL)
        const { error: acceptError } = await supabase.rpc('accept_store_invitation', { p_token: token });

        // 3. Logout agar karyawan login secara eksplisit
        await supabase.auth.signOut();

        if (acceptError) throw acceptError;

        toast({
          title: "Pendaftaran Berhasil!",
          description: "Akun karyawan berhasil dibuat. Silakan login.",
        });
      } else {
        // Verifikasi email aktif: undangan otomatis diselesaikan saat login pertama
        toast({
          title: "Cek Email Anda",
          description: "Klik link verifikasi di email Anda, lalu login. Akun akan otomatis terhubung ke toko.",
        });
      }

      navigate('/login?registered=true');
    } catch (error) {
      toast({
        title: "Pendaftaran Gagal",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingInvite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!invite?.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Undangan Tidak Dapat Digunakan</CardTitle>
            <CardDescription>
              {INVALID_INVITE_MESSAGES[invite?.reason] || INVALID_INVITE_MESSAGES.not_found}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center border-t p-4">
            <Button variant="outline" onClick={() => navigate('/login')}>Ke Halaman Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Registrasi Karyawan</CardTitle>
          <CardDescription>
            Anda diundang untuk bergabung dengan sistem 
            {invite.store_name ? <span className="font-bold text-slate-800"> {invite.store_name}</span> : ' ERP'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="Budi Santoso"
                  className="pl-9"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="budi@example.com"
                  className="pl-9"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Buat password baru"
                  className="pl-9 pr-10"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  className="pl-9 pr-10"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg mt-4 border text-xs text-slate-600 space-y-1">
              <p><span className="font-bold">Posisi:</span> {invite.position}</p>
              <p><span className="font-bold">Hak Akses:</span> {invite.role === 'admin' ? 'Admin' : 'Staff'}</p>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Akun Karyawan
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-4 text-xs text-slate-500">
          Tradixa Enterprise System &copy; 2026
        </CardFooter>
      </Card>
    </div>
  );
}
