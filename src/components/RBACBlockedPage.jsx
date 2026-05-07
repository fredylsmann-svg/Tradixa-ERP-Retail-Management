import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_TO_MODULE } from '@/lib/moduleMap';

/**
 * Premium "Access Denied" page shown when a staff user tries to access
 * a module they don't have permissions for.
 */
export default function RBACBlockedPage({ pageName }) {
  const navigate = useNavigate();
  const moduleName = PAGE_TO_MODULE[pageName] || pageName;

  return (
    <div className="flex items-center justify-center min-h-[65vh] px-4">
      <div className="relative max-w-md w-full">
        {/* Decorative background glow */}
        <div className="absolute -inset-4 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-amber-950/10 rounded-3xl blur-xl opacity-60" />
        
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl shadow-slate-100/50 dark:shadow-slate-900/50">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/30 flex items-center justify-center mb-6 shadow-lg shadow-red-100/50 dark:shadow-red-900/20">
            <ShieldOff className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
            Akses Terbatas
          </h2>

          {/* Module badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{moduleName}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Anda tidak memiliki izin untuk mengakses modul ini. 
            Hubungi pemilik toko atau admin untuk mendapatkan akses.
          </p>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
              Bagaimana cara mendapatkan akses?
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/70 leading-relaxed">
              Minta pemilik toko membuka <strong>User Management</strong> → klik tombol <strong>Edit</strong> pada akun Anda → centang modul yang dibutuhkan → <strong>Simpan</strong>.
            </p>
          </div>

          {/* Action */}
          <Button
            onClick={() => navigate('/Dashboard')}
            className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white font-bold h-11 px-6 rounded-xl shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
