import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, TrendingUp, AlertTriangle, DollarSign, Users, LayoutDashboard, Info, HelpCircle, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PremiumBarChart, PremiumAreaChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import LowStockNotification from '@/components/dashboard/LowStockNotification';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export default function Dashboard({ store }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    revenue: 0,
    profit: 0,
    lowStock: 0,
    payables: 0,
    receivables: 0,
    salesGrowth: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
    productsGrowth: 0
  });
  const [range, setRange] = useState('daily');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [salesData, setSalesData] = useState([]);
  const [orderData, setOrderData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (store?.id) {
      loadDashboardData();
    }
  }, [store, range]);

  const loadDashboardData = async () => {
    try {
      // Single RPC call — replaces 4 heavy queries (~500 bytes instead of ~5MB)
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_store_id: store.id,
        p_range: range,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
      });

      if (error) {
        console.error('[Dashboard] RPC error:', error.message);
        return;
      }

      // Calculate growth percentages from RPC results
      const periodLabel = range === 'daily' ? 'kemarin' : range === 'weekly' ? 'minggu lalu' : 'bulan lalu';

      const salesGrowth = data.prev_sales_count > 0
        ? Math.round(((data.current_sales_count - data.prev_sales_count) / data.prev_sales_count) * 100)
        : data.current_sales_count > 0 ? 100 : 0;

      const revenueGrowth = data.prev_revenue > 0
        ? Math.round(((data.current_revenue - data.prev_revenue) / data.prev_revenue) * 100)
        : data.current_revenue > 0 ? 100 : 0;

      const profitGrowth = data.prev_profit > 0
        ? Math.round(((data.current_profit - data.prev_profit) / data.prev_profit) * 100)
        : data.current_profit > 0 ? 100 : 0;

      setStats({
        totalProducts: data.total_products,
        totalSales: data.total_sales,
        revenue: data.total_revenue,
        profit: data.total_profit,
        lowStock: data.low_stock,
        payables: data.total_payables,
        receivables: data.total_receivables,
        salesGrowth: salesGrowth !== 0 ? `${salesGrowth > 0 ? '+' : ''}${salesGrowth}% dari ${periodLabel}` : null,
        revenueGrowth: revenueGrowth !== 0 ? `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}% dari ${periodLabel}` : null,
        profitGrowth: profitGrowth !== 0 ? `${profitGrowth > 0 ? '+' : ''}${profitGrowth}% dari ${periodLabel}` : null,
        productsGrowth: data.new_products_this_month
      });

      setLastUpdated(new Date());

      // Map chart data from RPC response
      const chartData = data.chart_data || [];
      setSalesData(chartData.map(d => ({ name: d.name, value: d.revenue })));
      setOrderData(chartData.map(d => ({ name: d.name, orders: d.orders })));
      setIsLoading(false);
    } catch (err) {
      console.error('[Dashboard] Failed to load:', err);
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace('IDR', 'Rp');
  };

  const StatCard = ({ title, value, icon: Icon, colorTheme, trend, info, onClick }) => {
    // colorTheme example: 'blue', 'emerald', 'violet', 'rose', 'amber'

    const themeClasses = {
      blue: 'from-blue-500 to-blue-700',
      emerald: 'from-emerald-500 to-emerald-700',
      violet: 'from-violet-500 to-violet-700',
      rose: 'from-rose-500 to-rose-700',
      amber: 'from-amber-500 to-amber-700',
      indigo: 'from-indigo-500 to-indigo-700'
    };

    const gradientClass = themeClasses[colorTheme] || themeClasses.blue;

    return (
      <Card
        className={`relative overflow-hidden transition-all duration-300 bg-gradient-to-br ${gradientClass} border-none ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 active:scale-95' : ''}`}
        onClick={onClick}
      >
        {/* Subtle top inner reflection for 3D glass effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
        
        <CardContent className="p-5 md:p-6 relative z-10">
          <div className="relative">
            {/* Background Icon (Absolute) */}
            <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
            </div>

            {/* Content (with right padding to avoid icon) */}
            <div className="text-white pr-12 md:pr-16">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-base font-medium text-white/90 tracking-wide drop-shadow-sm truncate">{title}</p>
                {info && (
                  <Popover>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="outline-none">
                        <Info className="w-3.5 h-3.5 text-white/70 hover:text-white transition-colors" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-xl border-slate-100 shadow-2xl bg-white">
                      <p className="text-xs leading-relaxed text-slate-600">
                        {info}
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight drop-shadow-md">
                <AnimatedNumber
                  value={typeof value === 'number' ? value : 0}
                  prefix={title === 'Pendapatan' || title === 'Estimasi Profit' ? 'Rp ' : ''}
                />
              </p>
              {trend ? (
                <p className="text-sm mt-2 flex items-center gap-1 font-medium text-white/90 drop-shadow-sm">
                  <TrendingUp className={`w-4 h-4 ${String(trend).includes('-') ? 'rotate-180 text-rose-300' : 'text-emerald-200'}`} />
                  {trend}
                </p>
              ) : (
                <p className="text-sm mt-2 text-white/60 italic font-medium truncate">Stabil</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Halaman muncul instan, angka akan beranimasi saat data masuk

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Selamat datang di sistem manajemen retail"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[180px] h-11 bg-white border-none shadow-sm rounded-xl font-bold text-slate-700">
                <SelectValue placeholder="Pilih Rentang..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Hari Ini (Harian)</SelectItem>
                <SelectItem value="weekly">7 Hari Terakhir</SelectItem>
                <SelectItem value="monthly">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <LowStockNotification store={store} />

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          icon={Package}
          colorTheme="blue"
          trend={stats.productsGrowth > 0 ? `+${stats.productsGrowth} bulan ini` : null}
          info="Jumlah seluruh varian produk yang aktif di katalog toko Anda saat ini."
          onClick={() => navigate('/ProductMaster')}
        />
        <StatCard
          title="Total Penjualan"
          value={stats.totalSales}
          icon={ShoppingCart}
          colorTheme="emerald"
          trend={stats.salesGrowth}
          info="Akumulasi seluruh transaksi yang pernah dilakukan. Persentase menunjukkan pertumbuhan dibandingkan periode sebelumnya."
          onClick={() => navigate('/SalesTransaction')}
        />
        <StatCard
          title="Pendapatan"
          value={stats.revenue}
          icon={TrendingUp}
          colorTheme="violet"
          trend={stats.revenueGrowth}
          info="Total omzet kotor dari seluruh penjualan. Persentase menunjukkan kenaikan/penurunan omzet dibandingkan periode sebelumnya."
          onClick={() => navigate('/RevenueReports')}
        />
        <StatCard
          title="Estimasi Profit"
          value={stats.profit}
          icon={DollarSign}
          colorTheme="indigo"
          trend={stats.profitGrowth}
          info="Perkiraan keuntungan bersih (Omzet - HPP). Membantu Anda memantau profitabilitas bisnis secara real-time."
        />
        <StatCard
          title="Stok Menipis"
          value={stats.lowStock}
          icon={AlertTriangle}
          colorTheme="amber"
          info="Jumlah produk yang stoknya sudah mencapai batas minimum (Reorder Level)."
          onClick={() => navigate('/LowStockAlert')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grafik Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumAreaChart
              data={salesData}
              dataKey="value"
              color="#3b82f6"
              valuePrefix="Rp "
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jumlah Order</CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumBarChart
              data={orderData}
              dataKey="orders"
              color="#8b5cf6"
              valueSuffix=" Pesanan"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-rose-500 to-rose-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white">
                <p className="text-base text-white/90 font-medium tracking-wide drop-shadow-sm">Hutang Usaha (Payables)</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={stats.payables} prefix="Rp " />
                </p>
                <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-sm">{stats.payables > 0 ? '1' : '0'} transaksi belum lunas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-indigo-500 to-indigo-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white">
                <p className="text-base text-white/90 font-medium tracking-wide drop-shadow-sm">Piutang Usaha (Receivables)</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={stats.receivables} prefix="Rp " />
                </p>
                <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-sm">{stats.receivables > 0 ? '1' : '0'} transaksi belum lunas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="py-4 px-5 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 w-full">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-3 h-3 animate-spin-slow text-slate-400 shrink-0" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed text-left sm:text-center">
            Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')} WIB <span className="hidden sm:inline">•</span><br className="sm:hidden" /> Data tersinkronisasi otomatis
          </p>
        </div>
      </div>
    </div>
  );
}
