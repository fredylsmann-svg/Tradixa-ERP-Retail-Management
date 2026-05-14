import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, X, Crown, Zap, Shield, Sparkles, Lock, ChevronDown,
  Package, ShoppingCart, Truck, DollarSign, Users, BarChart3,
  Award, Megaphone, Landmark, Palette, History, MessageCircle, Clock
} from 'lucide-react';
import { PLAN_TIERS } from '@/planConfig';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
const featureGroups = [
  {
    title: 'Usage & Limits',
    icon: BarChart3,
    features: [
      { name: 'Produk', free: '100', pro: '10.000', enterprise: 'Unlimited' },
      { name: 'Customer', free: '100', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Upload Foto/Media Produk', free: '20', pro: 'Hingga 2.000/bulan', enterprise: 'Unlimited' },
      { name: 'Max Ukuran Foto', free: '2 MB', pro: '2 MB', enterprise: '10 MB' },
      { name: 'Email Marketing', free: false, pro: '250/bulan', enterprise: 'Unlimited' },
      { name: 'Purchase Requisition', free: false, pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Purchase Order', free: false, pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'GRN', free: false, pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Inventory GRN', free: false, pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Supplier Return', free: false, pro: 'Unlimited', enterprise: 'Unlimited' },
    ]
  },
  {
    title: 'Inventory',
    icon: Package,
    features: [
      { name: 'Product Master', free: '100 produk', pro: '10.000 produk', enterprise: 'Unlimited' },
      { name: 'Location Settings', free: true, pro: true, enterprise: true },
      { name: 'Stock In / Stock Out', free: true, pro: true, enterprise: true },
      { name: 'Stock Opname', free: false, pro: true, enterprise: true },
      { name: 'Inventory Reports', free: false, pro: true, enterprise: true },
      { name: 'Inventory Ledger', free: false, pro: true, enterprise: true },
      { name: 'Low Stock Alert', free: false, pro: true, enterprise: true },
      { name: 'Outbound Delivery', free: false, pro: true, enterprise: true },
      { name: 'Inventory Workflow', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    features: [
      { name: 'Sales Transaction', free: '100 / bulan', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Sales Invoices', free: true, pro: true, enterprise: true },
      { name: 'Revenue Reports', free: false, pro: true, enterprise: true },
      { name: 'Sales Report', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'Procurement',
    icon: Truck,
    features: [
      { name: 'Procurement Workflow', free: false, pro: true, enterprise: true },
      { name: 'Suppliers', free: false, pro: true, enterprise: true },
      { name: 'Purchase Orders', free: false, pro: true, enterprise: true },
      { name: 'Goods Receipt & GRN', free: false, pro: true, enterprise: true },
      { name: 'Purchase Invoices', free: false, pro: true, enterprise: true },
      { name: 'Supplier Return', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'Keuangan',
    icon: DollarSign,
    features: [
      { name: 'Bank Accounts & Transactions', free: false, pro: true, enterprise: true },
      { name: 'Cash Register', free: true, pro: true, enterprise: true },
      { name: 'Payables & Receivables', free: false, pro: true, enterprise: true },
      { name: 'Journal Entries', free: false, pro: true, enterprise: true },
      { name: 'Financial Statements', free: false, pro: true, enterprise: true },
      { name: 'Bank Reconciliation', free: false, pro: true, enterprise: true },
      { name: 'Tax Management', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'CRM & Marketing',
    icon: Megaphone,
    features: [
      { name: 'Customer Master', free: '100 customer', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Customer Segmentation', free: false, pro: true, enterprise: true },
      { name: 'Marketing Automation', free: false, pro: true, enterprise: true },
      { name: 'Discount Management', free: false, pro: true, enterprise: true },
      { name: 'Loyalty Program', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'HRIS Management',
    icon: Users,
    features: [
      { name: 'Employee Management', free: false, pro: true, enterprise: true },
      { name: 'Sales Performance', free: false, pro: true, enterprise: true },
      { name: 'User Management', free: '1 user', pro: '10 user', enterprise: 'Unlimited' },
    ]
  },
  {
    title: 'Financial Agent',
    icon: Landmark,
    features: [
      { name: 'Agent Workflow (BRILink)', free: false, pro: true, enterprise: true },
      { name: 'Transaksi & Dashboard Agent', free: false, pro: true, enterprise: true },
      { name: 'Agent Performance', free: false, pro: true, enterprise: true },
    ]
  },
  {
    title: 'Lainnya',
    icon: Sparkles,
    features: [
      { name: 'Design Studio', free: false, pro: true, enterprise: true },
      { name: 'Audit Log', free: false, pro: true, enterprise: true },
      { name: 'Export (Excel, PDF, Print)', free: false, pro: true, enterprise: true },
      { name: 'Hapus Watermark Struk', free: false, pro: true, enterprise: true },
      { name: 'AI Assistant', free: false, pro: true, enterprise: true },
    ]
  },
];

function FeatureCell({ value }) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-slate-300 mx-auto" />;
  return <span className="text-xs font-bold text-blue-600 block text-center">{value}</span>;
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden transition-all duration-200 border border-transparent dark:border-slate-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-xs text-slate-500 dark:text-slate-400 px-4 pb-4 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function PricingPage({ store }) {
  const { user } = useAuth();
  const currentPlan = store?.plan || 'free';
  const isTrial = currentPlan === 'pro' && store?.has_used_trial;
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'yearly' | 'monthly'
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!selectedPlanForCheckout || !store?.id) return;
    setIsProcessing(true);
    
    try {
      const response = await api.client.functions.invoke('mayar-saas-checkout', {
        body: {
          store_id: store.id,
          plan_id: selectedPlanForCheckout.id,
          billingCycle: billingCycle,
          customer_name: user?.full_name || store.owner_name,
          customer_email: user?.email || store.owner_email || store.email,
          redirect_url: window.location.href
        }
      });

      if (response.error) throw response.error;
      const data = response.data;

      if (data?.success && data?.link) {
        // BYPASS: Mayar API sometimes returns the old subdomain due to caching.
        // We force replace it with the new active subdomain.
        let finalLink = data.link;
        if (finalLink.includes('ferdiarmond.myr.id')) {
          finalLink = finalLink.replace('ferdiarmond.myr.id', 'paytradixasystems.myr.id');
        }
        window.location.href = finalLink; // Redirect to Mayar
      } else {
        throw new Error(data?.error || 'Gagal membuat link pembayaran');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <Badge className="bg-blue-100 text-blue-700 font-bold px-4 py-1.5 text-xs">
          <Sparkles className="w-3 h-3 mr-1" /> Pricing Plans
        </Badge>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Pilih Paket yang Tepat untuk Bisnis Anda
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm">
          Mulai gratis, upgrade kapan saja. Semua paket dilengkapi fitur keamanan enterprise-grade.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(PLAN_TIERS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.id === 'pro';
          return (
            <Card key={plan.id} className={`relative overflow-hidden transition-all duration-300 ${isPopular ? 'border-2 border-blue-500 shadow-xl shadow-blue-100 dark:shadow-blue-900/20 scale-[1.02]' : 'border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 hover:shadow-lg'}`}>
              {isPopular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-1.5 text-[10px] font-black uppercase tracking-widest">
                  Paling Populer
                </div>
              )}
              <CardContent className={`p-6 space-y-5 ${isPopular ? 'pt-10' : ''}`}>
                {/* Plan Name */}
                <div>
                  <h3 className="font-black text-2xl text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="py-4 border-y border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {plan.id === 'enterprise' ? 'Custom' : plan.priceLabel}
                    </span>
                    {plan.price > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">/bulan</span>}
                  </div>
                  {plan.id === 'pro' && (
                    <p className="text-[10px] lg:text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      atau {plan.yearlyPriceLabel} / tahun ({plan.savingsLabel})
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2.5 min-h-[120px]">
                  {plan.id === 'enterprise' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 text-amber-500 opacity-50" />
                      <p className="text-[11px] text-slate-500 px-4">
                        Solusi kustom untuk bisnis skala besar, multi-cabang, dan sistem keagenan finansial.
                      </p>
                    </div>
                  ) : (
                    <>
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f}</span>
                        </div>
                      ))}
                      {plan.notIncluded.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-start gap-2 opacity-40">
                          <X className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed line-through">{f}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* CTA */}
                {isCurrent && isTrial && plan.id === 'pro' ? (
                  <div className="space-y-3">
                    <Button disabled className="w-full h-11 rounded-xl font-bold text-sm bg-amber-50 text-amber-600 border border-amber-200">
                      <Clock className="w-4 h-4 mr-2" /> Paket Trial Pro
                    </Button>
                    <Button 
                      onClick={() => setSelectedPlanForCheckout(plan)}
                      className="w-full h-11 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90 shadow-lg transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Upgrade ke Pro
                    </Button>
                  </div>
                ) : isCurrent ? (
                  <Button disabled className="w-full h-11 rounded-xl font-bold text-sm bg-slate-100 text-slate-500">
                    Paket Aktif Anda
                  </Button>
                ) : plan.id === 'enterprise' ? (
                  <Button 
                    asChild
                    className="w-full h-11 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-all hover:scale-[1.02]"
                  >
                    <a 
                      href="https://wa.me/6281383882120?text=Halo%20Tradixa%2C%20saya%20tertarik%20dengan%20paket%20Enterprise%20untuk%20bisnis%20saya." 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Hubungi Sales (WhatsApp)
                    </a>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      if (plan.price > 0) setSelectedPlanForCheckout(plan);
                    }}
                    className={`w-full h-11 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] ${isPopular ? `bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90 shadow-lg` : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {plan.price === 0 ? 'Mulai Gratis' : `Upgrade ke ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 shadow-2xl">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight">
            Perbandingan Fitur Lengkap
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-bold text-slate-700 dark:text-slate-200 w-1/3">Fitur</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-500 dark:text-slate-400 w-1/3">
                    Free
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600 dark:text-blue-400 w-1/3">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureGroups.map((group) => (
                  <React.Fragment key={group.title}>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                      <td colSpan={3} className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 font-black text-[10px] text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                          <group.icon className="w-3.5 h-3.5 text-blue-500" />
                          {group.title}
                        </div>
                      </td>
                    </tr>
                    {group.features.map((f) => (
                      <tr key={f.name} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-xs font-medium">{f.name}</td>
                        <td className="py-2.5 px-4"><FeatureCell value={f.free} /></td>
                        <td className="py-2.5 px-4"><FeatureCell value={f.pro} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-black text-lg text-slate-900">Pertanyaan Umum</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: 'Apakah bisa downgrade?', a: 'Ya, Anda bisa downgrade kapan saja. Data Anda tetap aman, hanya akses ke modul premium yang dibatasi.' },
              { q: 'Bagaimana cara pembayaran?', a: 'Pembayaran melalui transfer bank, e-wallet, atau kartu kredit. Invoice otomatis dikirim ke email.' },
              { q: 'Apakah ada trial?', a: 'Ya, setiap akun baru mendapat kesempatan free trial Pro selama 14 hari. Selama trial, Anda bisa mencoba hampir semua fitur dengan batasan jumlah data tertentu.' },
              { q: 'Berapa kuota email marketing?', a: 'Free Trial mendapat 5 email. Pro Plan berbayar mendapat 250 email per bulan yang akan direset otomatis setiap awal siklus billing.' },
              { q: 'Apakah data aman?', a: 'Data dienkripsi dengan standar AES-256 dan disimpan di server cloud yang aman.' },
              { q: 'Apa batasan paket Free / Trial?', a: 'Limit Paket Free: Maksimal 100 transaksi penjualan per bulan, fitur ekspor (Excel/PDF/Print) terkunci, dan terdapat watermark pada struk. Upgrade ke Pro untuk akses tanpa batas dan laporan profesional.' },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Checkout Dialog */}
      <Dialog open={!!selectedPlanForCheckout} onOpenChange={(open) => !open && setSelectedPlanForCheckout(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
          <DialogTitle className="sr-only">Pilih siklus penagihan</DialogTitle>
          <DialogDescription className="sr-only">Pilih antara penagihan tahunan atau bulanan</DialogDescription>
          {selectedPlanForCheckout && (
            <div className="bg-slate-50">
              <div className="p-6 text-center space-y-2 border-b border-slate-200 bg-white pt-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pilih siklus penagihan</h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Paket {selectedPlanForCheckout.name} dilengkapi dengan sistem pembayaran otomatis dan aman.
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Yearly Option */}
                <div 
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${billingCycle === 'yearly' ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-4 ring-emerald-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${billingCycle === 'yearly' ? 'border-emerald-500' : 'border-slate-300'}`}>
                        {billingCycle === 'yearly' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="font-bold text-slate-900">Tahunan</span>
                      <span className="text-slate-500 text-sm">— {selectedPlanForCheckout.yearlyPriceLabel} × 12 bulan</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold border-0 px-2 py-0.5 text-[10px]">
                      HEMAT 17%
                    </Badge>
                  </div>
                  
                  {billingCycle === 'yearly' && (
                    <div className="mt-4 pl-8 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Diskon spesial (gratis 2 bulan)
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Prioritas Customer Support
                      </div>
                    </div>
                  )}
                </div>

                {/* Monthly Option */}
                <div 
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${billingCycle === 'monthly' ? 'border-blue-500 bg-blue-50/30 shadow-md ring-4 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${billingCycle === 'monthly' ? 'border-blue-500' : 'border-slate-300'}`}>
                      {billingCycle === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <span className="font-bold text-slate-900">Bulanan</span>
                    <span className="text-slate-500 text-sm">— {selectedPlanForCheckout.priceLabel} / bulan</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Pembayaran aman oleh Mayar</span>
                </div>
                <Button 
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  id="checkout-btn"
                  className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 text-sm transition-all hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  {isProcessing && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>}
                  {isProcessing ? 'Memproses...' : 'Lanjutkan ke Checkout'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
