import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, Instagram, Globe } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [rememberedUser, setRememberedUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);

  const phrases = [
    "Enter your credentials to access the enterprise dashboard",
    "Procurement end to end solutions",
    "Empowering your business with smart inventory",
    "Streamlining retail operations with FEFO automation",
    "Real-time analytics for better decision making"
  ];

  useEffect(() => {
    let timer = setTimeout(() => {
      handleType();
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingSpeed]);

  const handleType = () => {
    const i = loopNum % phrases.length;
    const fullText = phrases[i];

    setDisplayText(isDeleting 
      ? fullText.substring(0, displayText.length - 1)
      : fullText.substring(0, displayText.length + 1)
    );

    setTypingSpeed(isDeleting ? 30 : 100);

    if (!isDeleting && displayText === fullText) {
      setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
    }
  };

  useEffect(() => {
    const lastUser = localStorage.getItem('tradixa_last_user');
    if (lastUser) {
      try {
        setRememberedUser(JSON.parse(lastUser));
      } catch (e) {
        console.error('Error parsing remembered user');
      }
    }
    
    const savedEmail = localStorage.getItem('tradixa_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('registered')) {
      setSuccess('Pendaftaran berhasil! Silakan masuk untuk melanjutkan.');
      setShowForm(true); // Auto-show if just registered
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isForgotMode) return handleForgotPassword(e);
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    const result = await login(email, password);
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('tradixa_saved_email', email);
      } else {
        localStorage.removeItem('tradixa_saved_email');
      }
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali di Tradixa!",
        variant: "default",
      });
      navigate('/');
    } else {
      const errorMsg = result.message || 'Login gagal. Coba cek email & password.';
      setError(errorMsg);
      toast({
        title: "Login Gagal",
        description: errorMsg,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Silakan masukkan email Anda untuk reset password.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess('Tautan reset password telah dikirim ke email Anda. Silakan cek Inbox atau Spam.');
    } catch (err) {
      console.error("Lupa password error:", err);
      let errMsg = 'Gagal mengirim tautan reset password.';
      if (err?.message && err.message !== '{}') {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    const result = await loginWithGoogle(rememberedUser?.email);
    if (result?.success === false) {
      const errorMsg = result.message || 'Gagal masuk dengan Google.';
      setError(errorMsg);
      toast({
        title: "Login Google Gagal",
        description: errorMsg,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Premium Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          loop 
          playsInline 
          preload="auto"
          fetchpriority="high"
          disablePictureInPicture
          onCanPlayThrough={() => setVideoReady(true)}
          className="absolute w-full h-full object-cover scale-[1.02] transition-opacity duration-1000 ease-in-out"
          style={{ opacity: videoReady ? 1 : 0 }}
        >
          <source src="/assets/login-bg.mp4" type="video/mp4" />
        </video>
        {/* Deep Overlay for readability - Removed blur to keep video sharp */}
        <div className="absolute inset-0 bg-[#020617]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/60 via-transparent to-[#020617]/80" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input::selection {
          background-color: #bfdbfe !important;
          color: #000000 !important;
        }
      `}} />

      {/* Subtle decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-30%] left-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1"
          initial={{ opacity: 0 }}
          animate={(isSubmitting || isGoogleLoading) ? { 
            opacity: 1,
            backgroundPosition: ['200% 0', '-200% 0'] 
          } : { opacity: 0 }}
          transition={{ 
            backgroundPosition: { repeat: Infinity, duration: 1.5, ease: "linear" },
            opacity: { duration: 0.3 }
          }}
          style={{ 
            background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 25%, #ffffff 50%, #3b82f6 75%, #2563eb 100%)',
            backgroundSize: '200% 100%'
          }} 
        />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {!showForm ? (
          /* INITIAL LANDING STATE */
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white text-3xl md:text-4xl font-black tracking-tight"
              >
                Welcome to the Tradixa <br />
                <span className="text-blue-400">Retail Management System</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-300 text-sm font-medium tracking-wide h-6"
              >
                {displayText}
                <span className="inline-block w-[2px] h-4 bg-blue-400 ml-1 animate-pulse" />
              </motion.p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="px-12 h-[60px] bg-white text-blue-600 rounded-full font-black text-lg shadow-2xl shadow-blue-500/20 hover:bg-blue-50 transition-all uppercase tracking-widest"
            >
              LOGIN
            </motion.button>

            {/* Social Links */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-6 pt-4"
            >
              <a 
                href="https://www.instagram.com/tradixa.systems/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Instagram className="w-5 h-5" />
                <span>Instagram</span>
              </a>
              <a 
                href="https://www.tradixasystems.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Globe className="w-5 h-5" />
                <span>Website</span>
              </a>
            </motion.div>
          </motion.div>
        ) : (
          /* LOGIN FORM STATE */
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Card with Glassmorphism */}
            <div className="rounded-3xl pt-2 px-8 pb-8 border border-white/20 backdrop-blur-md relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                boxShadow: '0 4px 24px -1px rgba(0,0,0,0.1), 0 10px 40px -5px rgba(0,0,0,0.2)'
              }}>
              
              {/* Back Button */}
              <button 
                onClick={() => isForgotMode ? setIsForgotMode(false) : setShowForm(false)}
                className="absolute top-6 left-6 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>

              {/* Logo */}
              <div className="text-center mb-6">
                <motion.img
                  src={tradixaLogo}
                  alt="Tradixa"
                  className="h-52 mx-auto -mb-8"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                />
                <p className="text-[13px] text-slate-400 tracking-wide">
                  {isForgotMode ? "Masukkan email untuk reset password Anda" : "Masuk ke akun Anda untuk melanjutkan"}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-[13px] font-bold mb-1.5 block" style={{ color: '#1e293b' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      className="w-full h-[46px] pl-10 pr-4 rounded-xl text-sm outline-none transition-all font-medium placeholder-slate-400"
                      style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe', color: '#000000' }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password (Only show if not in forgot password mode) */}
                {!isForgotMode && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[13px] font-bold" style={{ color: '#1e293b' }}>Password</label>
                      <button type="button" onClick={() => { setIsForgotMode(true); setError(''); setSuccess(''); }} className="text-xs font-semibold hover:underline" style={{ color: '#2563eb' }}>Lupa password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="w-full h-[46px] pl-10 pr-11 rounded-xl text-sm outline-none transition-all font-medium placeholder-slate-400"
                        style={{ background: '#f8f9fb', border: '1.5px solid #bfdbfe', color: '#000000' }}
                        onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 mb-2">
                      <input 
                        type="checkbox" 
                        id="rememberMe" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="rememberMe" className="text-xs text-slate-600 font-medium cursor-pointer">
                        Ingat Saya
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 hover:shadow-lg mt-6"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      {isForgotMode ? "Kirim Tautan Reset" : "Masuk ke Sistem"} 
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider & Other Options (Hide in Forgot Mode) */}
              {!isForgotMode && (
                <>
                  <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-medium">atau</span></div>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full h-[52px] rounded-2xl text-sm font-medium flex items-center justify-between px-4 transition-all active:scale-[0.98] hover:shadow-md group"
                style={{ 
                  background: '#ffffff', 
                  border: '1.5px solid #bfdbfe', 
                  color: '#1e3a5f',
                  boxShadow: rememberedUser ? '0 4px 12px rgba(37,99,235,0.08)' : 'none'
                }}
              >
                <div className="flex items-center gap-3">
                  {rememberedUser?.avatar ? (
                    <img src={rememberedUser.avatar} className="w-8 h-8 rounded-full border border-blue-100" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                  )}
                  <div className="text-left">
                    {isGoogleLoading ? (
                      <span className="text-slate-400">Menghubungkan...</span>
                    ) : rememberedUser ? (
                      <>
                        <div className="text-[11px] text-blue-500 font-bold uppercase tracking-wider leading-none mb-0.5">Welcome Back</div>
                        <div className="text-sm font-semibold text-slate-700">Lanjutkan sebagai {rememberedUser.name.split(' ')[0]}</div>
                      </>
                    ) : (
                      <span className="font-semibold">Masuk dengan Google</span>
                    )}
                  </div>
                </div>
                {!isGoogleLoading && (
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Login Link */}
              <p className="text-center text-sm text-slate-500 mt-5">
                Belum punya akun?{' '}
                <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#2563eb' }}>Daftar sekarang</Link>
              </p>
                </>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs mt-6 text-slate-100/50">
              © 2026 Tradixa — Management Retail System
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
