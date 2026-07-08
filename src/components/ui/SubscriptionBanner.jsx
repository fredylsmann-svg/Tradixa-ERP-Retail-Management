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
      <div className="mx-4 mb-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-100 px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm tracking-tight">⚠️ Masa Tenggang Aktif — {daysLeft} Hari Tersisa</h4>
            <p className="text-xs text-red-700/90 dark:text-red-200/90 mt-1 leading-relaxed">
              Subscription Anda berakhir pada <strong>{formatDate(expiresAt)}</strong>. 
              Anda memiliki masa tenggang hingga <strong>{formatDate(graceEndDate)}</strong> untuk memperpanjang. 
              Setelah itu, akun akan otomatis downgrade ke paket Free dan modul Pro akan terkunci.
            </p>
            <button
              onClick={() => navigate('/PricingPage')}
              className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all hover:scale-[1.02] shadow-sm"
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
      <div className="mx-4 mb-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 text-orange-950 dark:text-orange-100 px-5 py-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm tracking-tight">
              Subscription berakhir dalam {daysUntilExpiry} hari ({formatDate(expiresAt)})
            </h4>
            <p className="text-[11px] text-orange-700/90 dark:text-orange-200/90 mt-0.5">
              Perpanjang sebelum {formatDate(expiresAt)} agar akses Pro tidak terputus.
            </p>
          </div>
          <button
            onClick={() => navigate('/PricingPage')}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all hover:scale-[1.02] shadow-sm"
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
