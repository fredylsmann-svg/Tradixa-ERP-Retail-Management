import React from 'react';
import { motion } from 'framer-motion';

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
  actions
}) {
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
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{title}</h1>
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
