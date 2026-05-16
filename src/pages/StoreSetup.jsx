import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { Store, Upload, Building2, Phone, Mail, FileText, Loader2, User, ArrowRight, ArrowLeft, Info, MapPin, Camera, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/api/client';

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

const ScrollBox = ({ children, onScrolledToBottom }) => {
  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 20;
    if (bottom) {
      onScrolledToBottom(true);
    }
  };
  return (
    <div 
      onScroll={handleScroll}
      className="w-full h-[300px] overflow-y-auto p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed custom-scrollbar shadow-inner"
    >
      {children}
    </div>
  );
};

export default function StoreSetup({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const [createdStore, setCreatedStore] = useState(null);
  
  // Legal Steps State
  const [scrolledTerms, setScrolledTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [scrolledPrivacy, setScrolledPrivacy] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Form State
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

  const handleNext = (e) => { if (e) e.preventDefault(); setStep(prev => prev + 1); };
  const handleBack = () => setStep(prev => prev - 1);

  const handleCreateStore = async (e) => {
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
        bank_account_number: formData.bank_account_number, is_active: true,
        has_used_trial: false // default initialization
      });

      await api.auth.updateMe({ current_store_id: store.id, is_store_setup_completed: true });
      setCreatedStore(store);
      setIsLoading(false);
      setStep(5); // Go to Welcome & Plan Selection
    } catch (error) {
      console.error('Setup error:', error);
      alert('Terjadi kesalahan saat setup toko. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!createdStore) return;
    setIsTrialLoading(true);
    try {
      // 14 days from now
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('stores')
        .update({
          plan: 'pro',
          has_used_trial: true,
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString()
        })
        .eq('id', createdStore.id);

      if (error) throw error;
      
      const updatedStore = { ...createdStore, plan: 'pro', has_used_trial: true, plan_started_at: now.toISOString(), plan_expires_at: expiresAt.toISOString() };
      setIsTrialLoading(false);
      onComplete(updatedStore);
    } catch (error) {
      console.error('Failed to start trial:', error);
      alert('Gagal memulai trial. Silakan hubungi support.');
      setIsTrialLoading(false);
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
        className={`w-full relative z-10 transition-all duration-300 ${step === 5 ? 'max-w-[700px]' : 'max-w-[520px]'}`}
      >
        {/* Step Indicator (Hidden on Welcome Page) */}
        {step < 5 && (
          <div className="relative flex items-center justify-center mb-6 w-full">
            <button 
              type="button"
              onClick={async () => { await api.auth.logout(); window.location.replace('/login'); }} 
              className="absolute left-0 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
              title="Kembali ke halaman login"
            >
              <ArrowLeft className="w-4 h-4" /> Keluar
            </button>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                    step >= s ? 'text-white' : 'text-slate-400'
                  }`} style={{ background: step >= s ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f1f5f9', boxShadow: step >= s ? '0 2px 8px rgba(37,99,235,0.35)' : 'none' }}>
                    {s}
                  </div>
                  {s < 4 && <div className="w-4 sm:w-6 h-px bg-slate-200" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border"
          style={{
            background: '#ffffff',
            borderColor: '#dbeafe',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(37,99,235,0.06)'
          }}>

          <AnimatePresence mode="wait" custom={step}>
            {/* STEP 1: TERMS OF SERVICE */}
            {step === 1 && (
              <motion.div key="step1" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-6 pb-8 sm:px-8">
                  <div className="text-center mb-6">
                    <img src={tradixaLogo} alt="Tradixa" className="h-52 mx-auto -mb-8" />
                  </div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                      <FileText className="w-5 h-5 text-blue-600" /> Terms of Service
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Silakan baca dan setujui ketentuan layanan kami.</p>
                  </div>

                  <ScrollBox onScrolledToBottom={setScrolledTerms}>
                    <h3 className="font-bold text-slate-800 mb-2">01. Gambaran Umum Layanan</h3>
                    <p className="mb-4">Tradixa Systems menyediakan platform integrasi digital berbasis cloud (SaaS) yang mencakup sistem ERP, HRIS, dan modul operasional bisnis lainnya. Layanan kami dirancang untuk membantu perusahaan (B2B maupun B2C) dalam mengelola alur kerja, data karyawan, dan efisiensi operasional harian.</p>

                    <h3 className="font-bold text-slate-800 mb-2">02. Akun Pengguna dan Keamanan</h3>
                    <p className="mb-2">Untuk mengakses layanan Tradixa, Anda setuju untuk:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      <li>Memberikan informasi pendaftaran perusahaan yang akurat dan lengkap.</li>
                      <li>Menjaga kerahasiaan kredensial akun Anda dan bertanggung jawab atas semua aktivitas di bawah akun tersebut.</li>
                      <li>Segera memberitahu kami jika terdapat indikasi penyalahgunaan akun atau pelanggaran keamanan.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mb-2">03. Aturan Penggunaan dan Larangan</h3>
                    <p className="mb-2">Kami menghargai lingkungan profesional. Anda dilarang untuk:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      <li>Menggunakan platform untuk aktivitas ilegal, penipuan, atau melanggar hukum RI.</li>
                      <li>Melakukan rekayasa balik (reverse engineering) atau mencoba menyalin kode sumber platform.</li>
                      <li>Mengunggah konten yang mengandung virus, malware, atau skrip berbahaya.</li>
                      <li>Mengganggu integritas atau stabilitas sistem cloud Tradixa Systems.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mb-2">04. Hak Kekayaan Intelektual (HAKI) dan Batasan Penggunaan</h3>
                    <p className="mb-2">Seluruh hak cipta, desain antarmuka (UI/UX), merek dagang, kode sumber (source code), dan logika sistem yang terdapat di dalam layanan Tradixa Systems sepenuhnya adalah milik sah Tradixa. Dengan menggunakan layanan ini, Anda setuju untuk <strong>TIDAK</strong>:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      <li>Menyalin, menduplikasi, menjiplak, atau mereproduksi desain visual, alur kerja (workflow), dan struktur sistem Tradixa untuk tujuan komersial maupun pembuatan produk pesaing.</li>
                      <li>Melakukan Reverse Engineering (rekayasa balik), decompiling, atau mencoba membongkar kode sumber dari platform Tradixa.</li>
                      <li>Menyewakan, menjual kembali, atau melisensikan ulang akses akun Tradixa Anda kepada pihak ketiga tanpa izin tertulis dari kami.</li>
                      <li>Menggunakan bot, spider, scraper, atau alat otomatis lainnya untuk mengambil data atau struktur kode dari platform kami.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mb-2">05. Kepemilikan Data Bisnis</h3>
                    <p className="mb-4">Anda memegang kepemilikan penuh atas semua data bisnis, catatan karyawan, dan konten yang Anda unggah ke Tradixa Systems. Kami hanya bertindak sebagai pemroses data untuk memfasilitasi operasional Anda sesuai dengan instruksi yang diberikan melalui fitur-fitur aplikasi.</p>

                    <h3 className="font-bold text-slate-800 mb-2">06. Ketersediaan dan Dukungan</h3>
                    <p className="mb-4">Meskipun kami berkomitmen untuk menyediakan layanan terbaik, kami tidak menjamin ketersediaan sistem 100% tanpa gangguan (uptime). Kami melakukan pemeliharaan rutin yang mungkin menyebabkan downtime singkat, dan kami akan berusaha memberikan notifikasi sebelumnya melalui dashboard aplikasi.</p>

                    <h3 className="font-bold text-slate-800 mb-2">07. Batasan Tanggung Jawab</h3>
                    <p className="mb-4">Tradixa Systems tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan bisnis, atau kerusakan data yang disebabkan oleh kelalaian pihak ketiga atau penggunaan platform yang tidak sesuai instruksi teknis kami. Layanan disediakan apa adanya sesuai dengan spesifikasi fitur yang tersedia pada sistem.</p>

                    <h3 className="font-bold text-slate-800 mb-2">08. Penghentian Akun</h3>
                    <p className="mb-4">Anda dapat menghentikan penggunaan layanan kapan saja. Tradixa Systems juga berhak menangguhkan atau menghentikan akses jika ditemukan pelanggaran serius terhadap ketentuan penggunaan ini, demi melindungi keamanan pengguna lainnya.</p>

                    <h3 className="font-bold text-slate-800 mb-2">09. Hukum yang Berlaku</h3>
                    <p className="mb-4">Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia. Setiap perselisihan yang timbul akan diselesaikan melalui musyawarah untuk mufakat atau melalui yurisdiksi pengadilan yang berwenang.</p>
                  </ScrollBox>

                  <div className="mt-4 flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Checkbox 
                      id="terms" 
                      disabled={!scrolledTerms}
                      checked={acceptedTerms}
                      onCheckedChange={setAcceptedTerms}
                      className={!scrolledTerms ? 'opacity-50 cursor-not-allowed' : ''}
                    />
                    <label htmlFor="terms" className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed ${!scrolledTerms ? 'text-slate-400' : 'text-slate-700 cursor-pointer'}`}>
                      Saya menyetujui Terms of Service Tradixa Systems
                    </label>
                  </div>

                  <div className="mt-6">
                    <button type="button" onClick={() => handleNext()} disabled={!acceptedTerms}
                      className="w-full h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: acceptedTerms ? '0 4px 14px rgba(37,99,235,0.35)' : 'none' }}>
                      Lanjutkan <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PRIVACY POLICY */}
            {step === 2 && (
              <motion.div key="step2" custom={2} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-6 pb-8 sm:px-8">
                  <div className="text-center mb-6">
                    <img src={tradixaLogo} alt="Tradixa" className="h-52 mx-auto -mb-8" />
                  </div>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                      <ShieldCheck className="w-5 h-5 text-blue-600" /> Privacy Policy
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Kebijakan privasi dan keamanan data Anda.</p>
                  </div>

                  <ScrollBox onScrolledToBottom={setScrolledPrivacy}>
                    <h3 className="font-bold text-slate-800 mb-2">01. Pendekatan Kami Terhadap Privasi</h3>
                    <p className="mb-4">Di Tradixa Systems, kami percaya bahwa data Anda adalah aset paling berharga Anda. Kami berkomitmen untuk menjaga kepercayaan Anda dengan bersikap transparan tentang bagaimana kami mengelola dan melindungi informasi yang dipercayakan kepada platform SaaS kami. Kebijakan ini menjelaskan praktik kami dalam memproses data untuk solusi ERP, HRIS, dan sistem operasional lainnya.</p>

                    <h3 className="font-bold text-slate-800 mb-2">02. Informasi yang Kami Kelola</h3>
                    <p className="mb-2">Untuk memberikan layanan yang optimal, kami memproses beberapa kategori data berikut:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      <li><strong>Data Perusahaan:</strong> Nama entitas bisnis, alamat kantor, NPWP, dan informasi identitas perusahaan lainnya.</li>
                      <li><strong>Informasi Karyawan:</strong> Data yang dimasukkan ke dalam sistem HRIS seperti nama, jabatan, struktur organisasi, dan catatan operasional terkait.</li>
                      <li><strong>Data Operasional:</strong> Catatan transaksi, manajemen stok, dan aktivitas operasional yang Anda jalankan menggunakan sistem ERP kami.</li>
                      <li><strong>Informasi Teknis:</strong> Alamat IP, jenis perangkat, dan catatan log penggunaan aplikasi untuk tujuan keamanan dan peningkatan performa.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mb-2">03. Tujuan Penggunaan Data</h3>
                    <p className="mb-2">Kami memproses informasi Anda semata-mata untuk:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      <li>Menyediakan, menjaga, dan memelihara fitur-fitur layanan cloud Tradixa Systems.</li>
                      <li>Memastikan akurasi perhitungan operasional dan pelaporan bisnis Anda.</li>
                      <li>Memberikan dukungan teknis yang responsif dan bantuan pengguna.</li>
                      <li>Mendeteksi, mencegah, dan menangani masalah keamanan atau teknis secara proaktif.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800 mb-2">04. Keamanan dan Penyimpanan</h3>
                    <p className="mb-4">Kami mengimplementasikan standar keamanan kelas industri untuk melindungi data Anda. Seluruh data disimpan dalam infrastruktur cloud yang terenkripsi dan dipantau selama 24/7. Kami menggunakan protokol enkripsi saat data dikirimkan (in-transit) maupun saat data disimpan (at-rest) untuk meminimalisir risiko akses yang tidak sah.</p>

                    <h3 className="font-bold text-slate-800 mb-2">05. Prinsip Berbagi Data</h3>
                    <p className="mb-4">Tradixa Systems tidak pernah menjual data Anda kepada pihak ketiga. Kami hanya berbagi informasi dengan penyedia layanan infrastruktur (seperti provider cloud) yang terikat kontrak ketat untuk melindungi data Anda, atau jika diwajibkan oleh hukum yang berlaku di Republik Indonesia.</p>

                    <h3 className="font-bold text-slate-800 mb-2">06. Hak Pengguna dan Retensi</h3>
                    <p className="mb-4">Sebagai pemilik data, Anda memiliki kontrol penuh. Anda berhak untuk mengakses, memperbaiki, serta meminta penghapusan data perusahaan Anda dari sistem kami. Kami menyimpan data selama akun Anda aktif atau sesuai dengan kewajiban retensi data legal yang berlaku bagi bisnis Anda (B2B maupun B2C).</p>

                    <h3 className="font-bold text-slate-800 mb-2">07. Perubahan Kebijakan</h3>
                    <p className="mb-4">Kami dapat memperbarui kebijakan privasi ini secara berkala untuk mencerminkan perubahan pada layanan kami. Anda akan menerima notifikasi melalui aplikasi atau email jika terdapat perubahan yang signifikan dalam cara kami mengelola data Anda.</p>
                  </ScrollBox>

                  <div className="mt-4 flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Checkbox 
                      id="privacy" 
                      disabled={!scrolledPrivacy}
                      checked={acceptedPrivacy}
                      onCheckedChange={setAcceptedPrivacy}
                      className={!scrolledPrivacy ? 'opacity-50 cursor-not-allowed' : ''}
                    />
                    <label htmlFor="privacy" className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed ${!scrolledPrivacy ? 'text-slate-400' : 'text-slate-700 cursor-pointer'}`}>
                      Saya memahami & menyetujui Privacy Policy Tradixa Systems
                    </label>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button type="button" onClick={handleBack}
                      className="flex-1 h-[46px] rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-blue-50"
                      style={{ border: '1.5px solid #bfdbfe', color: '#64748b' }}>
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <button type="button" onClick={() => handleNext()} disabled={!acceptedPrivacy}
                      className="flex-[2] h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: acceptedPrivacy ? '0 4px 14px rgba(37,99,235,0.35)' : 'none' }}>
                      Lanjutkan Setup <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: DATA PEMILIK */}
            {step === 3 && (
              <motion.div key="step3" custom={3} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-6 pb-8 sm:px-8">
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

                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={handleBack}
                        className="flex-1 h-[46px] rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-blue-50"
                        style={{ border: '1.5px solid #bfdbfe', color: '#64748b' }}>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button type="submit"
                        className="flex-[4] h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                        Lanjutkan <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* STEP 4: DATA TOKO */}
            {step === 4 && (
              <motion.div key="step4" custom={4} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pt-2 px-6 pb-8 sm:px-8">
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

                  <form onSubmit={handleCreateStore} className="space-y-4">
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

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={handleBack}
                        className="flex-1 h-[46px] rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-blue-50"
                        style={{ border: '1.5px solid #bfdbfe', color: '#64748b' }}>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button type="submit" disabled={isLoading}
                        className="flex-[4] h-[46px] rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : <><Store className="w-4 h-4" /> Buat Toko</>}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* STEP 5: WELCOME & PLAN SELECTION */}
            {step === 5 && (
              <motion.div key="step5" custom={5} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                <div className="p-8 text-center sm:p-12">
                  <div className="mb-6" />
                  <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Selamat Datang di Tradixa!</h1>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto">Akun dan Toko Anda berhasil didaftarkan. Silakan pilih opsi di bawah ini untuk memulai.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {/* Free Plan Option */}
                    <div className="border-2 border-slate-200 rounded-2xl p-6 text-left hover:border-slate-300 transition-colors bg-white">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-slate-800">Free Plan</h3>
                      </div>
                      <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Akses dasar untuk operasional ringan. Modul Pro & Enterprise terkunci.</p>
                      <button 
                        onClick={() => onComplete(createdStore)}
                        className="w-full h-11 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Gunakan Free Plan
                      </button>
                    </div>

                    {/* Pro Trial Option */}
                    <div className="border-2 border-blue-500 rounded-2xl p-6 text-left shadow-lg relative bg-blue-50/30 overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                        Rekomendasi
                      </div>
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-slate-900">Pro Trial 14 Hari</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-6 min-h-[40px]">Coba seluruh fitur Premium, Procurement & HRIS gratis selama 14 hari.</p>
                      <button 
                        onClick={handleStartTrial}
                        disabled={isTrialLoading}
                        className="w-full h-11 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isTrialLoading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Diproses...</>
                        ) : (
                          <>Start Free Trial <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < 5 && (
          <p className="text-center text-xs mt-6 text-slate-400">
            © 2026 Tradixa — Management Retail System
          </p>
        )}
      </motion.div>
    </div>
  );
}
