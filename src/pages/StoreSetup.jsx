import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { Store, Upload, Building2, Phone, Mail, FileText, Loader2, User, ArrowRight, ArrowLeft, Info, MapPin, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

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
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl text-xs shadow-2xl z-[9999]"
            style={{ background: '#0f2442', color: '#e2e8f0', border: '1px solid rgba(37,99,235,0.25)' }}
          >
            {text}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 mb-[-5px]" style={{ background: '#0f2442' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

export default function StoreSetup({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [ownerPhotoFile, setOwnerPhotoFile] = useState(null);
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    store_name: '',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    owner_name: '',
    owner_position: 'Owner',
    owner_phone: '',
    owner_notes: '',
    bank_name: '',
    bank_account_number: ''
  });

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
    if (user?.email) setFormData(prev => ({ ...prev, email: user.email }));
    if (user?.full_name) setFormData(prev => ({ ...prev, owner_name: user.full_name }));
  }, [user]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) { setLogoFile(file); const r = new FileReader(); r.onloadend = () => setLogoPreview(r.result); r.readAsDataURL(file); }
  };

  const handleOwnerPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) { setOwnerPhotoFile(file); const r = new FileReader(); r.onloadend = () => setOwnerPhotoPreview(r.result); r.readAsDataURL(file); }
  };

  const handleNext = (e) => { e.preventDefault(); setStep(2); };
  const handleBack = () => setStep(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const currentUser = await api.auth.me();
      let logoUrl = '', ownerPhotoUrl = '';
      if (logoFile) { const res = await api.storage.upload(logoFile, 'logo'); logoUrl = res.url; }
      if (ownerPhotoFile) { const res = await api.storage.upload(ownerPhotoFile, 'profile'); ownerPhotoUrl = res.url; }

      const store = await api.entities.Store.create({
        store_name: formData.store_name, address: formData.address, phone: formData.phone,
        email: formData.email, tax_id: formData.tax_id, logo_url: logoUrl,
        owner_user_id: currentUser.id, owner_email: currentUser.email,
        owner_name: formData.owner_name, owner_position: formData.owner_position,
        owner_phone: formData.owner_phone, owner_photo_url: ownerPhotoUrl,
        owner_notes: formData.owner_notes, bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number, is_active: true
      });

      await api.auth.updateMe({ current_store_id: store.id, is_store_setup_completed: true });
      setIsLoading(false);
      onComplete(store);
    } catch (error) {
      console.error('Setup error:', error);
      alert('Terjadi kesalahan saat setup toko. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const inputStyle = { background: '#f8f9fb', border: '1.5px solid #bfdbfe' };
  const inputFocus = (e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; };
  const inputBlur = (e) => { e.target.style.borderColor = '#bfdbfe'; e.target.style.boxShadow = 'none'; };
  const inputClass = "w-full h-[46px] pl-10 pr-4 rounded-xl text-sm outline-none transition-all text-slate-800 placeholder-slate-400";
  const labelClass = "text-[13px] font-semibold text-slate-600 mb-1.5 block";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#ffffff' }}>

      {/* Subtle decorative */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #0f2442 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        
        <AnimatePresence>
          {isLoading && (
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
        transition={{ duration: 0.5 }}
        className="w-full max-w-[520px] relative z-10"
      >
        {/* Step Indicator */}
        <div className="relative flex items-center justify-center mb-6 w-full">
          <button 
            type="button"
            onClick={async () => { await api.auth.logout(); window.location.replace('/login'); }} 
            className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
            title="Kembali ke halaman login"
          >
            <ArrowLeft className="w-4 h-4" /> Keluar
          </button>
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= 1 ? 'text-white' : 'text-slate-400'
            }`} style={{ background: step >= 1 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f1f5f9', boxShadow: step >= 1 ? '0 2px 8px rgba(37,99,235,0.35)' : 'none' }}>1</div>
            <span className="text-xs font-semibold" style={{ color: step >= 1 ? '#1e40af' : '#94a3b8' }}>Data Pemilik</span>
          </div>
          <div className="w-8 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= 2 ? 'text-white' : 'text-slate-400'
            }`} style={{ background: step >= 2 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f1f5f9', boxShadow: step >= 2 ? '0 2px 8px rgba(37,99,235,0.35)' : 'none' }}>2</div>
            <span className="text-xs font-semibold" style={{ color: step >= 2 ? '#1e40af' : '#94a3b8' }}>Data Toko</span>
          </div>
        </div>
        </div>

        {/* Card — no overflow hidden so tooltip can show */}
        <div className="rounded-2xl border"
          style={{
            background: '#ffffff',
            borderColor: '#dbeafe',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(37,99,235,0.06)'
          }}>

          <AnimatePresence mode="wait" custom={step}>
            {step === 1 ? (
              <motion.div key="step1" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-8 pb-8">
                  {/* Logo */}
                  <div className="text-center mb-6">
                    <img src={tradixaLogo} alt="Tradixa" className="h-52 mx-auto -mb-8" />
                  </div>

                  <div className="mb-3">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                      <User className="w-5 h-5 text-blue-600" />
                      Identitas Pemilik
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Lengkapi data diri Anda sebagai pemilik bisnis</p>
                  </div>

                  <form onSubmit={handleNext} className="space-y-4">
                    {/* Owner Photo */}
                    <div className="flex justify-center mb-2">
                      <div className="relative group">
                        <input type="file" accept="image/*" onChange={handleOwnerPhotoChange} className="hidden" id="owner-photo-upload" />
                        <label htmlFor="owner-photo-upload" className="cursor-pointer block">
                          {ownerPhotoPreview ? (
                            <div className="relative">
                              <img src={ownerPhotoPreview} alt="Owner" className="w-24 h-24 rounded-full object-cover shadow-md" style={{ border: '2px solid #bfdbfe' }} />
                              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50 transition-all"
                              style={{ borderColor: '#93c5fd' }}>
                              <Camera className="w-6 h-6 text-blue-400 mb-1 group-hover:text-blue-500 transition-colors" />
                              <span className="text-[10px] text-blue-400 group-hover:text-blue-500">Upload Foto</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Nama Pemilik *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Masukkan nama pemilik" className={inputClass} style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                          value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Jabatan *</label>
                        <select className="w-full h-[46px] px-3.5 rounded-xl text-sm outline-none transition-all appearance-none text-slate-800" style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                          value={formData.owner_position} onChange={(e) => setFormData({ ...formData, owner_position: e.target.value })}>
                          <option value="Owner">Owner</option>
                          <option value="Direktur">Direktur</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[13px] font-semibold text-slate-600 mb-1.5 flex items-center">
                          Telepon Pemilik *
                          <InfoTooltip text="Nomor ini akan digunakan untuk kepentingan operasional toko Anda, termasuk notifikasi penting dan verifikasi." />
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="tel" placeholder="08xxxxxxxxxx" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.owner_phone} onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })} required />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Catatan (Opsional)</label>
                      <textarea placeholder="Catatan tambahan tentang pemilik"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all resize-none text-slate-800 placeholder-slate-400"
                        style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                        rows={2} value={formData.owner_notes} onChange={(e) => setFormData({ ...formData, owner_notes: e.target.value })} />
                    </div>

                    <button type="submit"
                      className="w-full h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                      Lanjutkan <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" custom={2} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-8 pb-8">
                  {/* Logo */}
                  <div className="text-center mb-6">
                    <img src={tradixaLogo} alt="Tradixa" className="h-52 mx-auto -mb-8" />
                  </div>

                  <div className="mb-3">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Data Toko
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Informasi usaha yang akan Anda kelola</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Logo Upload */}
                    <div className="flex justify-center mb-2">
                      <div className="relative group">
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                        <label htmlFor="logo-upload" className="cursor-pointer block">
                          {logoPreview ? (
                            <div className="relative">
                              <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-md" style={{ border: '2px solid #bfdbfe' }} />
                              <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50 transition-all"
                              style={{ borderColor: '#93c5fd' }}>
                              <Upload className="w-5 h-5 text-blue-400 mb-1 group-hover:text-blue-500" />
                              <span className="text-[10px] text-blue-400 group-hover:text-blue-500">Logo Toko</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Nama Toko *</label>
                      <div className="relative">
                        <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Masukkan nama toko" className={inputClass} style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                          value={formData.store_name} onChange={(e) => setFormData({ ...formData, store_name: e.target.value })} required />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Alamat Lengkap *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        {isLoaded ? (
                          <Autocomplete
                            onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                            onPlaceChanged={handlePlaceChanged}
                          >
                            <input type="text" placeholder="Ketik alamat untuk pencarian otomatis..." className={inputClass} style={inputStyle}
                              onFocus={inputFocus} onBlur={inputBlur}
                              value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                          </Autocomplete>
                        ) : (
                          <input type="text" placeholder="Masukkan alamat lengkap toko" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[13px] font-semibold text-slate-600 mb-1.5 flex items-center">
                          Nomor Telepon
                          <InfoTooltip text="Nomor telepon ini akan digunakan untuk kepentingan operasional toko Anda, seperti komunikasi dengan supplier dan pelanggan." />
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="tel" placeholder="08xxxxxxxxxx" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[13px] font-semibold text-slate-600 mb-1.5 flex items-center">
                          Email Toko
                          <InfoTooltip text="Email ini akan digunakan untuk keperluan yang berkaitan dengan operasional perusahaan, termasuk invoice, laporan, dan notifikasi bisnis." />
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="email" placeholder="toko@email.com" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[13px] font-semibold text-slate-600 mb-1.5 flex items-center">
                        NPWP (Opsional)
                        <InfoTooltip text="Sangat disarankan diisi. NPWP diperlukan untuk verifikasi identitas (KYC) saat mengaktifkan fitur Payment Gateway (QRIS/VA) agar uang bisa cair ke rekening Anda." />
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="xx.xxx.xxx.x-xxx.xxx" className={inputClass} style={inputStyle}
                          onFocus={inputFocus} onBlur={inputBlur}
                          value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-3 border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          Informasi Rekening Bank (Pencairan Dana)
                          <InfoTooltip text="Rekening ini akan digunakan sebagai tujuan pencairan dana dari Payment Gateway. Pastikan nama rekening sesuai dengan profil toko atau NPWP Anda." />
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Nama Bank</label>
                          <input type="text" placeholder="Contoh: BCA, Mandiri" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelClass}>Nomor Rekening</label>
                          <input type="text" placeholder="Contoh: 1234567890" className={inputClass} style={inputStyle}
                            onFocus={inputFocus} onBlur={inputBlur}
                            value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={handleBack}
                        className="flex-1 h-[46px] rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-blue-50"
                        style={{ border: '1.5px solid #bfdbfe', color: '#64748b' }}>
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                      <button type="submit" disabled={isLoading}
                        className="flex-[2] h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : <><Store className="w-4 h-4" /> Mulai Menggunakan Sistem</>}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs mt-6 text-slate-400">
          © 2026 Tradixa — Management Retail System
        </p>
      </motion.div>
    </div>
  );
}
