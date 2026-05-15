import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Mail,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Loader2,
  Package,
  Users,
  FileText,
  ClipboardList,
  Truck,
  RotateCcw,
  FileInput,
  Camera,
  ShoppingCart,
  Contact,
  CreditCard,
  Wallet,
  Download,
  Upload,
  Boxes,
  UserCircle,
  Megaphone,
  ClipboardCheck,
  Warehouse,
  ArrowRightLeft,
  FileCheck,
  ReceiptText,
  HandCoins
} from 'lucide-react';
import PageHeader from "@/components/layout/PageHeader";
import { PLAN_TIERS, getEffectiveLimits } from '@/planConfig';
import { supabase } from '@/lib/supabase';

function UsageCard({ icon: Icon, title, current, limit, color = 'blue', description }) {
  const isUnlimited = limit === Infinity || limit === 'Unlimited';
  const percent = isUnlimited ? 0 : limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
  const isReached = !isUnlimited && limit > 0 && current >= limit;
  const isLocked = limit === 0;

  const colorMap = {
    blue: { bar: 'from-blue-400 to-blue-600', text: 'text-blue-600', iconBg: 'from-blue-500 to-blue-700', glow: 'shadow-blue-500/20', ring: 'ring-blue-100' },
    purple: { bar: 'from-purple-400 to-purple-600', text: 'text-purple-600', iconBg: 'from-purple-500 to-purple-700', glow: 'shadow-purple-500/20', ring: 'ring-purple-100' },
    emerald: { bar: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600', iconBg: 'from-emerald-500 to-emerald-700', glow: 'shadow-emerald-500/20', ring: 'ring-emerald-100' },
    amber: { bar: 'from-amber-400 to-amber-600', text: 'text-amber-600', iconBg: 'from-amber-500 to-amber-700', glow: 'shadow-amber-500/20', ring: 'ring-amber-100' },
    rose: { bar: 'from-rose-400 to-rose-600', text: 'text-rose-600', iconBg: 'from-rose-500 to-rose-700', glow: 'shadow-rose-500/20', ring: 'ring-rose-100' },
    cyan: { bar: 'from-cyan-400 to-cyan-600', text: 'text-cyan-600', iconBg: 'from-cyan-500 to-cyan-700', glow: 'shadow-cyan-500/20', ring: 'ring-cyan-100' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 group
      ${isLocked
        ? 'bg-slate-50/80 border-slate-200 opacity-60'
        : isReached
          ? 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_10px_15px_-3px_rgba(0,0,0,0.06),0_20px_25px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.06),0_16px_24px_-4px_rgba(0,0,0,0.08),0_24px_32px_-6px_rgba(0,0,0,0.04)] ring-1 ring-slate-100'
          : `bg-gradient-to-br from-white to-slate-50/80 border-slate-200/80 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_10px_15px_-3px_rgba(0,0,0,0.06),0_20px_25px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.06),0_16px_24px_-4px_rgba(0,0,0,0.08),0_24px_32px_-6px_rgba(0,0,0,0.04)] ${c.ring} ring-1`}`}
    >
      {/* Subtle gradient overlay */}
      {!isLocked && !isReached && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
            ${isLocked ? 'bg-slate-300' : isReached ? 'bg-gradient-to-br from-red-500 to-red-700' : `bg-gradient-to-br ${c.iconBg}`}`}
          >
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{title}</p>
            {description && <p className="text-[10px] text-slate-400 font-medium">{description}</p>}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xl font-black ${isReached ? 'text-red-600' : 'text-slate-900'}`}>{current}</span>
          <span className="text-slate-400 font-bold text-sm ml-1">
            / {isLocked ? '✕' : isUnlimited ? '∞' : limit.toLocaleString()}
          </span>
        </div>
      </div>
      {!isLocked && !isUnlimited && (
        <div className="relative space-y-1.5">
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-200/50">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${isReached ? 'from-red-400 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : c.bar}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isReached ? 'Limit Tercapai' : `${percent.toFixed(0)}% Terpakai`}
            </span>
            {isReached && (
              <span className="text-[10px] font-bold text-red-500 animate-pulse">Upgrade untuk lanjut</span>
            )}
          </div>
        </div>
      )}
      {isLocked && (
        <p className="text-[10px] font-bold text-slate-400 mt-1">Tidak tersedia di paket Anda</p>
      )}
      {isUnlimited && (
        <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Unlimited
        </p>
      )}
    </div>
  );
}

export default function UsageStats({ store }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    emailSent: 0,
    monthlyEmail: 0,
    monthlySales: 0,
    products: 0,
    productPhotos: 0,
    customers: 0,
    suppliers: 0,
    payables: 0,
    receivables: 0,
    purchaseRequisitions: 0,
    purchaseOrders: 0,
    grn: 0,
    inventoryGRN: 0,
    supplierReturn: 0,
    stockIn: 0,
    stockOut: 0,
    outboundDeliveries: 0,
    employees: 0,
    expenses: 0,
    payments: 0,
  });
  const [loading, setLoading] = useState(true);

  const isTrial = store?.plan === 'pro' && store?.has_used_trial;
  const isPaidPro = store?.plan === 'pro' && !store?.has_used_trial;
  const limits = getEffectiveLimits(store);
  const plan = PLAN_TIERS[store?.plan || 'free'] || PLAN_TIERS.free;

  useEffect(() => {
    if (!store?.id) return;

    const fetchAllStats = async () => {
      setLoading(true);
      try {
        // Parallel queries untuk efisiensi
        const [
          campaignRes,
          ruleRes,
          productRes,
          customerRes,
          supplierRes,
          prRes,
          poRes,
          grnRes,
          invGrnRes,
          srRes,
          payablesRes,
          receivablesRes,
          salesRes,
          stockInRes,
          stockOutRes,
          bankRecRes,
          outboundRes,
          employeesRes,
          expensesRes,
          paymentsRes,
        ] = await Promise.all([
          supabase.from('marketing_campaigns').select('sent_count', { count: 'exact' }).eq('store_id', store.id).in('status', ['Sent', 'Running']),
          supabase.from('marketing_automation_rules').select('total_executions', { count: 'exact' }).eq('store_id', store.id),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('purchase_requisitions').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('goods_receipts').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('inventory_grns').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('supplier_returns').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('payables').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('receivables').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('sales_transactions').select('created_date, timestamp_wib').eq('store_id', store.id),
          supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('movement_type', 'in'),
          supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('store_id', store.id).eq('movement_type', 'out'),
          supabase.from('bank_statement_history').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('outbound_deliveries').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
        ]);

        // Hitung total email terkirim (hanya dari campaign sent_count — source of truth)
        let totalEmail = 0;
        if (campaignRes.data) totalEmail = campaignRes.data.reduce((sum, c) => sum + (c.sent_count || 0), 0);

        // Monthly email — hitung dari campaign yang dibuat bulan ini
        const now = new Date();
        let monthlyEmail = 0;
        if (campaignRes.data) {
          // Filter campaign bulan ini dan hitung sent_count
          const { data: thisMonthCampaigns } = await supabase
            .from('marketing_campaigns')
            .select('sent_count, created_date')
            .eq('store_id', store.id)
            .in('status', ['Sent', 'Running'])
            .gte('created_date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);

          if (thisMonthCampaigns) {
            monthlyEmail = thisMonthCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
          }
        }

        // Hitung foto produk (products with image_url yang benar-benar ada)
        const photoRes = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id).not('image_url', 'is', null).neq('image_url', '');

        let monthlySales = 0;
        if (salesRes.data) {
          monthlySales = salesRes.data.filter(tx => {
            const txDate = new Date(tx.created_date || tx.timestamp_wib);
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          }).length;
        }

        setStats({
          emailSent: totalEmail,
          monthlyEmail: monthlyEmail,
          monthlySales: monthlySales,
          products: productRes.count || 0,
          productPhotos: photoRes.count || 0,
          customers: customerRes.count || 0,
          suppliers: supplierRes.count || 0,
          purchaseRequisitions: prRes.count || 0,
          purchaseOrders: poRes.count || 0,
          grn: grnRes.count || 0,
          inventoryGRN: invGrnRes.count || 0,
          supplierReturn: srRes.count || 0,
          payables: payablesRes.count || 0,
          receivables: receivablesRes.count || 0,
          stockIn: stockInRes.count || 0,
          stockOut: stockOutRes.count || 0,
          reconciliationUploads: bankRecRes.count || 0,
          outboundDeliveries: outboundRes.count || 0,
          employees: employeesRes.count || 0,
          expenses: expensesRes.count || 0,
          payments: paymentsRes.count || 0,
        });
      } catch (err) {
        console.error('Gagal mengambil data penggunaan:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, [store?.id]);

  // Determine email display
  const emailCurrent = isTrial ? stats.emailSent : stats.monthlyEmail;
  const emailLimit = isTrial ? 5 : isPaidPro ? 250 : 0;
  const emailDesc = isTrial ? 'Total selama trial' : isPaidPro ? 'Reset setiap bulan' : 'Upgrade untuk menggunakan';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Penggunaan Sistem"
        subtitle="Pantau kuota dan statistik penggunaan resource Tradixa Anda"
        icon={BarChart3}
      />

      {/* Hero Status Card */}
      <div className={`relative overflow-hidden rounded-[32px] p-8 text-white shadow-2xl bg-gradient-to-br ${plan.gradient}`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <BarChart3 className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-white/20 text-white border-none font-black text-[10px] tracking-widest uppercase py-1 px-3">
              {store?.plan} Plan Status
            </Badge>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              {isTrial ? 'Masa Percobaan Pro' : `${plan.name} Edition`}
              <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300" />
            </h2>
            <p className="text-white/80 font-medium max-w-md">
              {isTrial
                ? 'Anda sedang menikmati fitur premium Tradixa dengan kuota percobaan terbatas.'
                : 'Akun Anda aktif dengan akses penuh sesuai paket langganan Anda.'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/PricingPage')}
            className="bg-white text-slate-900 hover:bg-slate-100 font-black h-14 px-8 rounded-2xl shadow-xl hover:scale-105 transition-all group"
          >
            {isTrial ? 'Upgrade ke Full Version' : 'Kelola Langganan'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <span className="ml-3 text-slate-400 font-medium">Memuat data penggunaan...</span>
        </div>
      ) : (
        <>
          {/* Resource Usage Grid */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> Data & Resource
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={Boxes} title="Produk" color="blue"
                current={stats.products} limit={limits.maxProducts}
                description="Jumlah produk terdaftar"
              />
              <UsageCard
                icon={Users} title="Customer" color="purple"
                current={stats.customers} limit={limits.maxCustomers}
                description="Jumlah pelanggan terdaftar"
              />
              <UsageCard
                icon={Contact} title="Supplier" color="amber"
                current={stats.suppliers} limit={limits.maxSuppliers}
                description="Jumlah supplier terdaftar"
              />
              <UsageCard
                icon={Camera} title="Upload Foto/Media Produk" color="cyan"
                current={stats.productPhotos} limit={limits.maxProductPhotos}
                description={store?.plan === 'free' || isTrial ? 'Total selama trial/free' : 'Total kuota foto/bulan'}
              />
              <UsageCard
                icon={UserCircle} title="Employee Management" color="orange"
                current={stats.employees} limit={limits.maxEmployees}
                description="Jumlah karyawan terdaftar"
              />
            </div>
          </div>

          {/* Sales */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
              <ShoppingCart className="w-4 h-4" /> Sales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={ShoppingCart} title="Sales Transaction" color="emerald"
                current={stats.monthlySales} limit={limits.maxSalesPerMonth}
                description="Total transaksi penjualan bulan ini"
              />
            </div>
          </div>

          {/* Email Marketing */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
              <Megaphone className="w-4 h-4" /> Marketing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={Megaphone} title="Email Marketing" color="rose"
                current={emailCurrent} limit={emailLimit}
                description={emailDesc}
              />
              <div className="p-5 rounded-2xl border bg-amber-50 border-amber-100 flex flex-col items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center">
                  <MessageSquare className="w-4.5 h-4.5 text-amber-700" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-900">WhatsApp Credits</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Procurement */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Procurement
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={FileInput} title="Purchase Requisition" color="purple"
                current={stats.purchaseRequisitions} limit={limits.maxPR}
                description="Jumlah PR dibuat"
              />
              <UsageCard
                icon={ClipboardList} title="Purchase Order" color="emerald"
                current={stats.purchaseOrders} limit={limits.maxPO}
                description="Jumlah PO dibuat"
              />
              <UsageCard
                icon={ClipboardCheck} title="Goods Receipt (GRN)" color="emerald"
                current={stats.grn} limit={limits.maxGRN}
                description="Jumlah GRN dibuat"
              />
              <UsageCard
                icon={Warehouse} title="Inventory GRN" color="blue"
                current={stats.inventoryGRN} limit={limits.maxInventoryGRN}
                description="Jumlah Inventory GRN"
              />
              <UsageCard
                icon={ArrowRightLeft} title="Supplier Return" color="amber"
                current={stats.supplierReturn} limit={limits.maxSupplierReturn}
                description="Jumlah retur supplier"
              />
            </div>
          </div>

          {/* Logistics & Delivery */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
              <Truck className="w-4 h-4" /> Logistics & Delivery
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={Truck} title="Outbound Delivery" color="blue"
                current={stats.outboundDeliveries} limit={limits.maxOutboundDeliveries}
                description="Jumlah pengiriman kurir"
              />
            </div>
          </div>

          {/* Finance */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
              <CreditCard className="w-4 h-4" /> Finance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={CreditCard} title="Account Payables" color="rose"
                current={stats.payables} limit={limits.maxPayables}
                description="Jumlah tagihan hutang dibuat"
              />
              <UsageCard
                icon={Wallet} title="Account Receivables" color="emerald"
                current={stats.receivables} limit={limits.maxReceivables}
                description="Jumlah tagihan piutang dibuat"
              />
              <UsageCard
                icon={FileCheck} title="Bank Rec. Uploads" color="blue"
                current={stats.reconciliationUploads} limit={limits.maxReconciliationUploads}
                description="Jumlah upload file mutasi"
              />
              <UsageCard
                icon={ReceiptText} title="Operational Expenses" color="purple"
                current={stats.expenses} limit={limits.maxExpenses}
                description="Jumlah pencatatan beban operasional"
              />
              <UsageCard
                icon={HandCoins} title="Payments" color="cyan"
                current={stats.payments} limit={limits.maxPayments}
                description="Jumlah pembayaran tercatat"
              />
            </div>
          </div>

          {/* Inventory Movements */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
              <Package className="w-4 h-4" /> Inventory Movements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UsageCard
                icon={Download} title="Stock In" color="emerald"
                current={stats.stockIn} limit={limits.maxStockIn}
                description="Jumlah penerimaan barang sederhana"
              />
              <UsageCard
                icon={Upload} title="Stock Out" color="rose"
                current={stats.stockOut} limit={limits.maxStockOut}
                description="Jumlah pengeluaran barang sederhana"
              />
            </div>
          </div>

        </>
      )}
    </div>
  );
}
