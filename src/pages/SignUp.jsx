import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

export default function SignUp() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Password strength
  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Lemah', color: '#ef4444' };
    if (score <= 2) return { level: 2, label: 'Sedang', color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Baik', color: '#3b82f6' };
    return { level: 4, label: 'Kuat', color: '#22c55e' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      const msg = 'Password tidak cocok';
      setError(msg);
      toast({ title: "Validasi Gagal", description: msg, variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      const msg = 'Password minimal 6 karakter';
      setError(msg);
      toast({ title: "Validasi Gagal", description: msg, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Cek apakah email sudah terdaftar di tabel users
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        setIsLoading(false);
        const msg = 'Email sudah terdaftar. Silakan gunakan email lain atau langsung Login.';
        setError(msg);
        toast({
          title: "Pendaftaran Gagal",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      // 2. Jika belum ada, baru proses signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.full_name } }
      });
      if (authError) throw authError;

      // 3. Simpan data tambahan di tabel users
      // Gunakan try-catch terpisah untuk menangani race condition dengan AuthContext
      try {
        await api.entities.User.create({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: 'owner',
          is_store_setup_completed: false
        });
      } catch (insertErr) {
        // Jika error kode 23505 (Unique Violation), artinya AuthContext 
        // sudah berhasil membuat data di background. Kita bisa abaikan.
        if (insertErr.code !== '23505') {
          throw insertErr;
        }
        console.log('[SignUp] User record already created by AuthContext, continuing...');
      }

      await supabase.auth.signOut();
      navigate('/login?registered=true');
    } catch (err) {
      console.error('[SignUp Error]', err);
      if (err.message?.includes('already registered')) {
        setError('Email ini sudah terdaftar. Silakan login.');
      } else {
        setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (result?.success === false) {
      setError(result.message || 'Gagal mendaftar dengan Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#ffffff' }}>

      {/* Subtle decorative elements for premium feel */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #0f2442 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <AnimatePresence>
          {(isLoading || isGoogleLoading) && (
            <motion.div 
              initial={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-1 z-[100]"
              animate={{ opacity: 1, backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              style={{ 
                background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 25%, #ffffff 50%, #3b82f6 75%, #2563eb 100%)',
                backgroundSize: '200% 100%'
              }} 
            />
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Card */}
        <div className="rounded-2xl pt-2 px-8 pb-8 border"
          style={{
            background: '#ffffff',
            borderColor: '#dbeafe',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(37,99,235,0.06)'
          }}>

          {/* Logo — larger */}
          <div className="text-center mb-6">
            <motion.img
              src={tradixaLogo}
              alt="Tradixa"
              className="h-52 mx-auto -mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            />
            <p className="text-[13px] text-slate-400 tracking-wide">Buat akun baru untuk memulai</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  className="w-full h-[46px] pl-10 pr-4 rounded-xl text-sm outline-none transition-all text-slate-800 placeholder-slate-400"
                  style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe' }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full h-[46px] pl-10 pr-4 rounded-xl text-sm outline-none transition-all text-slate-800 placeholder-slate-400"
                  style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe' }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-[46px] pl-10 pr-11 rounded-xl text-sm outline-none transition-all text-slate-800 placeholder-slate-400"
                  style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe' }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength.level ? strength.color : '#e8ecf0' }} />
                    ))}
                  </div>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  className="w-full h-[46px] pl-10 pr-11 rounded-xl text-sm outline-none transition-all text-slate-800 placeholder-slate-400"
                  style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe' }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Daftar Akun <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-medium">atau</span></div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full h-[46px] rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] hover:shadow-sm"
            style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', color: '#475569' }}
          >
            {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Daftar dengan Google
              </>
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-slate-500 mt-5">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#2563eb' }}>Masuk di sini</Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6 text-slate-400">
          © 2026 Tradixa — Management Retail System
        </p>
      </motion.div>
    </div>
  );
}
