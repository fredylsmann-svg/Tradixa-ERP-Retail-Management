import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useQuickAccess } from '@/contexts/QuickAccessContext';
import { toast as sonnerToast } from 'sonner';

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
  actions
}) {
  const { toggleQuickAccess, isQuickAccess } = useQuickAccess();
  const isCurrentPageFavorited = title ? isQuickAccess(title) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="bg-blue-600 p-3 rounded-2xl shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-2">
              {title}
              {title && (
                <button
                  onClick={() => {
                    toggleQuickAccess(title);
                    const wasAdded = !isCurrentPageFavorited;
                    sonnerToast(
                      wasAdded ? 'Berhasil!' : 'Dihapus',
                      {
                        description: wasAdded
                          ? `Menu ${title} berhasil ditambahkan ke Quick Access`
                          : `Menu ${title} dihapus dari Quick Access`,
                        duration: 2500,
                      }
                    );
                  }}
                  className="flex-shrink-0 p-0.5 rounded-md transition-all duration-200 hover:scale-110 active:scale-95 translate-y-[2px]"
                  title={isCurrentPageFavorited ? 'Hapus dari Quick Access' : 'Tambah ke Quick Access'}
                >
                  <Star
                    strokeWidth={isCurrentPageFavorited ? 2.5 : 2}
                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                      isCurrentPageFavorited
                        ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                    }`}
                  />
                </button>
              )}
            </h1>
            {children}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
