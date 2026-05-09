import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have an active session to reset password
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase's email link will automatically log the user in temporarily 
      // when they click the reset link. If there's no session, the link is invalid/expired.
      if (!session) {
        // Wait a bit to see if session establishes from URL hash
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (!delayedSession) {
            setError('Tautan reset password tidak valid atau sudah kadaluarsa. Silakan minta tautan baru dari halaman Login.');
          }
        }, 1000);
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Password dan Konfirmasi Password tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess('Password berhasil diubah!');
      toast({
        title: "Berhasil",
        description: "Password Anda berhasil diperbarui. Silakan login kembali.",
      });
      
      // Sign out the temporary session and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Gagal mereset password.');
      toast({
        title: "Gagal",
        description: err.message || 'Gagal mereset password.',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617]">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/60 via-[#020617] to-[#020617]/80" />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-30%] left-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Card */}
          <div className="rounded-3xl pt-2 px-8 pb-8 border border-white/20 backdrop-blur-md relative overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 4px 24px -1px rgba(0,0,0,0.1)'
            }}>

            {/* Logo */}
            <div className="text-center mb-6">
              <motion.img
                src={tradixaLogo}
                alt="Tradixa"
                className="h-52 mx-auto -mb-8"
              />
              <p className="text-[14px] font-bold text-slate-800 tracking-wide">Buat Password Baru</p>
              <p className="text-[12px] text-slate-500 mt-1">Masukkan kata sandi baru untuk akun Anda</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-2">
                <div className="w-1.5 h-1.5 mt-1.5 bg-red-500 rounded-full flex-shrink-0" />
                <p className="leading-tight">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl flex items-start gap-2">
                <div className="w-1.5 h-1.5 mt-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                <p className="leading-tight">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Baru */}
              <div>
                <label className="text-[13px] font-bold mb-1.5 block" style={{ color: '#1e293b' }}>Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-[46px] pl-10 pr-11 rounded-xl text-sm outline-none transition-all font-medium placeholder-slate-400"
                    style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe', color: '#000000' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!!error && error.includes('tidak valid')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="text-[13px] font-bold mb-1.5 block" style={{ color: '#1e293b' }}>Konfirmasi Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    className="w-full h-[46px] pl-10 pr-11 rounded-xl text-sm outline-none transition-all font-medium placeholder-slate-400"
                    style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe', color: '#000000' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!!error && error.includes('tidak valid')}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || (!!error && error.includes('tidak valid'))}
                className="w-full h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 hover:shadow-lg mt-6"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Simpan Password <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <button 
                onClick={() => navigate('/login')}
                className="text-xs font-semibold hover:underline" style={{ color: '#2563eb' }}
              >
                Kembali ke halaman Login
              </button>
            </div>
            
          </div>

          <p className="text-center text-xs mt-6 text-slate-100/50">
            © 2026 Tradixa — Management Retail System
          </p>
        </motion.div>
      </div>
    </div>
  );
}
