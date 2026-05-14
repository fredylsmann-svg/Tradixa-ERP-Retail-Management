import React from 'react';
import { Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

/**
 * PremiumGate
 * A universal wrapper to gate features for non-paid users.
 * Shows a lock icon and triggers an upgrade toast on click.
 */
export default function PremiumGate({ 
  children, 
  store, 
  featureName = "fitur ini",
  className = "" 
}) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Premium Paid Logic (Global switch)
  // has_used_trial: false means they have PAID and are no longer in trial.
  const isPaidPro = store?.plan === 'pro' && store?.has_used_trial === false;

  // If already paid, render as normal
  if (isPaidPro) {
    return <>{children}</>;
  }

  const handleGateClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    toast({
      variant: "destructive",
      title: "Akses Premium Dibutuhkan",
      description: `Maaf, ${featureName} hanya tersedia untuk member Pro. Silakan upgrade untuk membuka akses selamanya.`,
      action: (
        <button 
          onClick={() => navigate('/PricingPage')}
          className="bg-white text-red-600 px-3 py-1 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          Upgrade Sekarang
        </button>
      ),
    });
  };

  return (
    <div 
      className={`relative group inline-block cursor-pointer ${className}`} 
      onClick={handleGateClick}
    >
      {/* The original button/content (locked & dimmed) */}
      <div className="opacity-60 pointer-events-none grayscale-[0.3]">
        {children}
      </div>
      
      {/* Small Lock Icon in corner */}
      <div className="absolute -top-1.5 -right-1.5 z-10 bg-white border border-slate-200 rounded-full p-1 shadow-md group-hover:scale-110 transition-transform">
        <Lock className="w-2.5 h-2.5 text-slate-500" />
      </div>
    </div>
  );
}
