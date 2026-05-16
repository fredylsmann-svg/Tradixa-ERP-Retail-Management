import React from 'react';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SubscriptionBanner
 * Menampilkan banner peringatan jika subscription mendekati atau melewati tanggal expired.
 * - Jika dalam grace period (expired tapi belum di-downgrade): banner merah
 * - Jika mendekati expired (H-7): banner kuning
 */
export default function SubscriptionBanner({ store }) {
  const navigate = useNavigate();

  if (!store) return null;

  const plan = store.plan || 'free';
  const expiresAt = store.plan_expires_at ? new Date(store.plan_expires_at) : null;

  // Hanya tampilkan untuk plan berbayar (pro/enterprise) yang punya tanggal expired
  if (plan === 'free' || !expiresAt) return null;

  const now = new Date();
  const GRACE_PERIOD_DAYS = 3;
  const graceEndDate = new Date(expiresAt);
  graceEndDate.setDate(graceEndDate.getDate() + GRACE_PERIOD_DAYS);

  const diffMs = expiresAt - now;
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatDate = (d) =>
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // === GRACE PERIOD: Subscription sudah expired tapi belum di-downgrade ===
  if (now > expiresAt && now <= graceEndDate) {
    const daysLeft = Math.ceil((graceEndDate - now) / (1000 * 60 * 60 * 24));

    return (
      <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-4 shadow-xl shadow-red-200/50 dark:shadow-red-900/30 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-sm tracking-tight">⚠️ Masa Tenggang Aktif — {daysLeft} Hari Tersisa</h4>
            <p className="text-xs text-red-100 mt-1 leading-relaxed">
              Subscription Anda berakhir pada <strong>{formatDate(expiresAt)}</strong>. 
              Anda memiliki masa tenggang hingga <strong>{formatDate(graceEndDate)}</strong> untuk memperpanjang. 
              Setelah itu, akun akan otomatis downgrade ke paket Free dan modul Pro akan terkunci.
            </p>
            <button
              onClick={() => navigate('/PricingPage')}
              className="mt-3 inline-flex items-center gap-2 bg-white text-red-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-50 transition-all hover:scale-[1.02] shadow-lg"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Perpanjang Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === PERINGATAN: Mendekati expired (H-7 atau kurang) ===
  if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
    return (
      <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3.5 shadow-xl shadow-amber-200/50 dark:shadow-amber-900/30 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-sm tracking-tight">
              Subscription berakhir dalam {daysUntilExpiry} hari ({formatDate(expiresAt)})
            </h4>
            <p className="text-[11px] text-amber-100 mt-0.5">
              Perpanjang sebelum {formatDate(expiresAt)} agar akses Pro tidak terputus.
            </p>
          </div>
          <button
            onClick={() => navigate('/PricingPage')}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-amber-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-50 transition-all hover:scale-[1.02] shadow-lg"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Perpanjang
          </button>
        </div>
      </div>
    );
  }

  // Tidak perlu tampilkan apa-apa
  return null;
}
