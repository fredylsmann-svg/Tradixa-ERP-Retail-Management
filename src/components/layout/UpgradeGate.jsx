import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Crown, Zap, ArrowRight, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { PLAN_TIERS, getRequiredPlan } from '@/planConfig';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function UpgradeGate({ pageName, pageTitle, currentPlan = 'free' }) {
  const [isHovered, setIsHovered] = useState(false);
  const requiredPlan = getRequiredPlan(pageName);
  const planInfo = PLAN_TIERS[requiredPlan];
  const currentPlanInfo = PLAN_TIERS[currentPlan];

  const planIcons = {
    pro: Zap,
    enterprise: Crown,
  };
  const PlanIcon = planIcons[requiredPlan] || Zap;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Animated Lock Icon */}
        <motion.div 
          className="relative mx-auto w-24 h-24"
          animate={isHovered ? { scale: 1.05, y: 0 } : { scale: 1, y: [0, -8, 0] }}
          transition={
            isHovered 
              ? { type: "spring", stiffness: 300, damping: 20 }
              : { repeat: Infinity, duration: 3, ease: "easeInOut" }
          }
        >
          <div className={`absolute inset-0 rounded-3xl animate-pulse transition-colors duration-500 ${isHovered ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30' : 'bg-gradient-to-br from-blue-500/20 to-violet-500/20'}`} />
          <div className="relative w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl border border-slate-100 overflow-hidden">
            <AnimatePresence mode="wait">
              {isHovered ? (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <Unlock className="w-10 h-10 text-emerald-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <Lock className="w-10 h-10 text-slate-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </motion.div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Modul Premium
          </h2>
          <div className="text-slate-500 mt-2 text-sm leading-relaxed max-w-md mx-auto">
            <span className="font-bold text-slate-700">{pageTitle || pageName}</span> tersedia di paket{' '}
            <Badge className={`${planInfo.badge} font-bold text-xs px-2 py-0.5 ml-1`}>
              {planInfo.name}
            </Badge>
          </div>
        </div>

        {/* Upgrade Card - Premium Blue Theme */}
        <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-[#0B1B3D] via-[#102A5E] to-[#0B1B3D] relative">
          <CardContent className="p-8 space-y-6 relative z-10">
            {/* Plan comparison */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-xs font-bold text-slate-200">{currentPlanInfo.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400/70" />
              <div className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${planInfo.gradient} rounded-xl shadow-lg border border-white/20`}>
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-xs font-bold text-white">{planInfo.name}</span>
              </div>
            </div>

            {/* Features preview */}
            <div className="text-left space-y-3 bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Yang akan Anda dapatkan:</p>
              <div className="grid grid-cols-1 gap-2.5">
                {planInfo.features.slice(0, 6).map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-blue-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-medium">{f}</span>
                  </div>
                ))}
                {planInfo.features.length > 6 && (
                  <p className="text-[11px] text-blue-300 font-bold pl-7 pt-1">
                    + {planInfo.features.length - 6} fitur lainnya
                  </p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="pt-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-4xl font-black text-white tracking-tight drop-shadow-md">{planInfo.priceLabel}</span>
                <span className="text-sm text-blue-200/80 font-medium">/bulan</span>
              </div>
              {planInfo.price > 0 && (
                <p className="text-[11px] text-blue-300/80 font-medium mt-1">
                  Hemat {requiredPlan === 'enterprise' ? '20%' : '15%'} dengan langganan tahunan
                </p>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2">
              <Link 
                to={createPageUrl('PricingPage')}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="block"
              >
                <Button className={`relative overflow-hidden w-full h-14 bg-gradient-to-r ${planInfo.gradient} hover:opacity-90 text-white font-bold rounded-2xl text-sm transition-all duration-300 hover:scale-[1.02] border border-white/20 group ${
                  requiredPlan === 'enterprise' 
                    ? 'shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]' 
                    : 'shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]'
                }`}>
                  {requiredPlan === 'enterprise' && (
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade ke {planInfo.name} Sekarang
                  </span>
                </Button>
              </Link>
              <Link to={createPageUrl('PricingPage')}>
                <Button variant="ghost" className="w-full h-10 text-sm text-slate-500 hover:text-blue-600 font-medium">
                  Lihat Perbandingan Paket →
                </Button>
              </Link>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] text-slate-400 font-medium">Pembayaran aman • Bisa cancel kapan saja</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
