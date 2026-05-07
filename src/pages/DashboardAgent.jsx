import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRightLeft, Wallet, ShieldCheck, TrendingUp, Search, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/layout/PageHeader';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardAgent({ store }) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalServices: 0,
    totalTransactionValue: 0,
    totalCommissionGiven: 0,
    activeAgents: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    if (store?.id) {
      loadData();
    }
  }, [store]);

  const loadData = async () => {
    try {
      const [agents, txs] = await Promise.all([
        api.entities.Agent.filter({ store_id: store.id }),
        api.entities.AgentTransaction.filter({ store_id: store.id })
      ]);

      const activeAgents = agents.filter(a => a.status === 'Active').length;
      const validTxs = txs.filter(tx => tx.status !== 'Failed');
      
      const totalServices = validTxs.length;
      const totalTransactionValue = validTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      const totalCommissionGiven = validTxs.reduce((sum, tx) => sum + (Number(tx.commission) || 0) + (Number(tx.fee) || 0), 0);

      setStats({
        totalServices,
        totalTransactionValue,
        totalCommissionGiven,
        activeAgents
      });

      // Generate 7 day chart
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        
        const dayTxs = validTxs.filter(tx => {
          if (!tx.created_date) return false;
          const txDate = new Date(tx.created_date);
          return txDate.toDateString() === date.toDateString();
        });
        
        const dailyValue = dayTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        last7Days.push({ name: dateStr, value: dailyValue });
      }
      setChartData(last7Days);

      // Map recent transactions with agent name
      const recent = txs
        .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
        .slice(0, 5)
        .map(tx => {
          const agent = agents.find(a => a.id === tx.agent_id);
          return {
            ...tx,
            agentName: agent ? agent.name : 'Unknown Agent'
          };
        });

      setRecentTransactions(recent);
    } catch (error) {
      console.error("Gagal memuat data Dashboard Agent:", error);
    } finally {
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

  const StatCard = ({ title, value, icon: Icon, bgIconClass, textIconClass, subtitle }) => (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden">
      <CardContent className="p-6 flex items-center justify-between z-10 relative">
        <div className="space-y-1 z-10 w-full">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-end gap-2 w-full truncate">
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 break-words flex-1 pr-2">
              <AnimatedNumber 
                value={typeof value === 'number' ? value : 0} 
                prefix={String(value).includes('Rp') || title.toLowerCase().includes('nilai') || title.toLowerCase().includes('komisi') || title.toLowerCase().includes('transaksi') ? 'Rp ' : ''}
              />
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${bgIconClass}`}>
          <Icon className={`w-6 h-6 ${textIconClass}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Layanan Agen"
        subtitle="Ringkasan keseluruhan transaksi dan pendapatan agen Anda."
        icon={LayoutDashboard}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transaksi Masuk"
          value={stats.totalTransactionValue}
          icon={Wallet}
          bgIconClass="bg-blue-100"
          textIconClass="text-blue-600"
          subtitle="Nilai semua transaksi"
        />
        <StatCard
          title="Layanan Berhasil"
          value={stats.totalServices}
          icon={ShieldCheck}
          bgIconClass="bg-emerald-100"
          textIconClass="text-emerald-600"
          subtitle="Jumlah order agen"
        />
        <StatCard
          title="Estimasi Komisi"
          value={stats.totalCommissionGiven}
          icon={TrendingUp}
          bgIconClass="bg-violet-100"
          textIconClass="text-violet-600"
          subtitle="Total komisi dicairkan"
        />
        <StatCard
          title="Agen Aktif"
          value={stats.activeAgents}
          icon={ArrowRightLeft}
          bgIconClass="bg-amber-100"
          textIconClass="text-amber-600"
          subtitle="Menerima transaksi"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 overflow-hidden border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-base flex items-center justify-between">
              Traksi Pembayaran Harian
              <Badge variant="secondary" className="font-normal text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border-none">
                7 Hari Terakhir
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `Rp ${v/1000}k`} 
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Estimasi Layanan']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions List */}
        <Card className="shadow-sm border-slate-200/60 flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-800">
              Transaksi Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <div className="min-h-[300px]">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Belum ada transaksi agen tercatat untuk saat ini.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentTransactions.map((tx, idx) => (
                    <li key={tx.id || idx} className="p-4 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-800 line-clamp-1">{tx.transactionType || tx.transaction_type || 'Pembayaran'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{tx.agentName}</p>
                            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3" />
                              {tx.created_date ? new Date(tx.created_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : 'Baru Saja'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(tx.amount)}</p>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-[10px] border-none px-2 py-0.5 ${
                              tx.status === 'Success' ? 'bg-emerald-50 text-emerald-600' :
                              tx.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                              'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {tx.status || 'Berhasil'}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
