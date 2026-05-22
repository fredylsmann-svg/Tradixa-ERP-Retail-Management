import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Barcode,
  Package,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PDAOpnameCard({ 
  item, 
  onQtyChange, 
  continuousMode, 
  onToggleContinuous 
}) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl min-h-[300px] text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center relative">
          <Barcode className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Siap Memindai</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arahkan laser PDA Anda ke barcode produk untuk langsung memuat data penyesuaian di sini.
          </p>
        </div>
      </div>
    );
  }

  const recorded = item.recorded_qty || 0;
  const actual = item.actual_qty || 0;
  const difference = actual - recorded;

  // Tentukan status dan warna selisih untuk visual feedback instan
  let statusColor = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950';
  let badgeColor = 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300';
  let badgeText = 'Belum Dipindai';
  let StatusIcon = Info;

  if (actual > 0) {
    if (difference === 0) {
      statusColor = 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/5';
      badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      badgeText = 'Stok Cocok';
      StatusIcon = CheckCircle2;
    } else {
      statusColor = 'border-amber-200 dark:border-amber-950/60 bg-amber-50/20 dark:bg-amber-950/5';
      badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      badgeText = `Selisih: ${difference > 0 ? '+' : ''}${difference}`;
      StatusIcon = AlertTriangle;
    }
  }

  return (
    <div className={`border-2 rounded-3xl p-6 transition-all duration-300 shadow-md ${statusColor}`}>
      <div className="flex justify-between items-start gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badgeColor}`}>
          <StatusIcon className="w-3 h-3" />
          {badgeText}
        </span>
        
        {/* Toggle Continuous Scan Mode */}
        <button
          onClick={onToggleContinuous}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-all ${
            continuousMode 
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm shadow-emerald-500/20' 
              : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sparkles className={`w-2.5 h-2.5 ${continuousMode ? 'animate-spin' : ''}`} />
          Auto +1
        </button>
      </div>

      <div className="space-y-4">
        {/* Identitas Produk Raksasa */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">
            <Package className="w-3.5 h-3.5" />
            <span>{item.sku}</span>
            {item.barcode && (
              <>
                <span>·</span>
                <Barcode className="w-3.5 h-3.5" />
                <span>{item.barcode}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight line-clamp-2 leading-tight">
            {item.product_name}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Kategori: {item.category_name || 'Bahan Baku / Produk'}
          </p>
        </div>

        <hr className="border-slate-100 dark:border-slate-900" />

        {/* Perbandingan Stok Raksasa */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Stok Tercatat</p>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{recorded}</p>
          </div>
          <div className={`p-3 rounded-2xl border ${
            difference === 0 && actual > 0
              ? 'bg-emerald-500/10 border-emerald-500/20' 
              : difference !== 0 && actual > 0
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-900'
          }`}>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Selisih Stok</p>
            <p className={`text-2xl font-black ${
              difference === 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : difference > 0 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-rose-600 dark:text-rose-400'
            }`}>
              {actual > 0 ? (difference > 0 ? `+${difference}` : difference) : '-'}
            </p>
          </div>
        </div>

        {/* Kontrol Penyesuai Glove-Friendly Raksasa */}
        <div className="space-y-2">
          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Stok Aktual (Fisik)
          </p>
          
          <div className="flex items-center justify-between gap-3">
            {/* Tombol Kurangi Raksasa */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onQtyChange(Math.max(0, actual - 1))}
                className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center"
              >
                <Minus className="w-6 h-6 stroke-[3]" />
              </Button>
            </motion.div>

            {/* Input Nilai Aktual Raksasa */}
            <div className="flex-1 text-center">
              <input
                type="number"
                value={actual}
                onChange={(e) => onQtyChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-4xl font-black text-slate-900 dark:text-slate-50 bg-transparent border-0 text-center focus:ring-0 focus:outline-none focus:border-0"
                style={{ MozAppearance: 'textfield' }}
              />
            </div>

            {/* Tombol Tambah Raksasa */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onQtyChange(actual + 1)}
                className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Notifikasi Tambahan untuk Konfirmasi Visual */}
        <AnimatePresence>
          {actual > 0 && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-center font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersimpan Lokal Sebagai Draft
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
