import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Zap, MessageCircle, X } from 'lucide-react';

export default function TrialNotificationBanner({ store }) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const { user } = useAuth();
  
  // Calculate detailed countdown every second
  useEffect(() => {
    const calculateCountdown = () => {
      if (!store?.plan_expires_at) return '';
      
      const expires = new Date(store.plan_expires_at);
      const now = new Date();
      const diff = expires - now;

      if (diff <= 0) return "Trial Expired";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateCountdown());
    }, 1000);

    setTimeLeft(calculateCountdown()); // Initial call
    return () => clearInterval(timer);
  }, [store]);

  if (!isVisible || !store || store.plan !== 'pro' || !store.has_used_trial || !store.plan_expires_at) {
    return null;
  }

  const waMessage = encodeURIComponent("Halo admin Tradixa saya tertarik dengan sistem nya bisa di atur untuk jadwal demo online nya?");
  const waUrl = `https://wa.me/6281383882120?text=${waMessage}`;

  return (
    <div className="w-full bg-amber-400 text-slate-900 px-4 py-2 shadow-md z-[45] border-b border-amber-500 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-4 flex-nowrap overflow-x-auto no-scrollbar">
        
        {/* Left Section: Badge */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
            Pro Trial
          </div>
        </div>

        {/* Center Section: Countdown (Stays on one line) */}
        <div className="flex-1 text-center min-w-0">
          <p className="text-[13px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="opacity-80">Sisa Waktu Akses Gratis:</span> <span className="tabular-nums ml-1">{timeLeft}</span>
          </p>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a 
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Atur Demo
          </a>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 px-2 py-1.5 transition-colors border border-slate-900/10 rounded-lg hover:bg-white/20 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Hide
          </button>
        </div>

      </div>
    </div>
  );
}
