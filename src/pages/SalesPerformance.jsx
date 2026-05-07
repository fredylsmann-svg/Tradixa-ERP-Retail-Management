import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, MapPin, Download, Loader2, BarChart3 } from 'lucide-react';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/layout/PageHeader';

export default function SalesPerformance({ store }) {
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedDate } = useGlobalDate();

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    setIsLoading(true);
    const [txData, empData] = await Promise.all([
      api.entities.SalesTransaction.filter({ store_id: store.id }),
      api.entities.Employee.filter({ store_id: store.id, status: 'Active' })
    ]);
    setTransactions(txData);
    setEmployees(empData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  // Filter transactions by global selected date
  const filteredTransactions = transactions.filter(tx => matchesDate(tx, selectedDate));

  // Process Sales Performance by PIC
  const performanceData = employees.map(emp => {
    const empTxs = filteredTransactions.filter(tx => tx.sales_pic === emp.name);
    const totalSales = empTxs.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactions = empTxs.length;
    const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      id: emp.id,
      name: emp.name,
      photo_url: emp.photo_url,
      totalSales,
      totalTransactions,
      avgTransaction
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  // Group by Location
  const locationStats = {};
  filteredTransactions.forEach(tx => {
    const loc = tx.sale_location || 'Lainnya';
    if (!locationStats[loc]) {
      locationStats[loc] = { name: loc, value: 0 };
    }
    locationStats[loc].value += tx.total;
  });
  const pieData = Object.values(locationStats).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const grandTotal = performanceData.reduce((sum, p) => sum + p.totalSales, 0);
  const totalTxs = performanceData.reduce((sum, p) => sum + p.totalTransactions, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Performance"
        subtitle="Pantau produktivitas tim sales di lapangan"
        icon={BarChart3}
        actions={
          <Button variant="outline" className="border-slate-200 h-11 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        }
      />

      <PageDatePicker />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Penjualan</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={grandTotal} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-emerald-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Transaksi</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalTxs} suffix=" Order" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-violet-500 to-violet-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Users className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">PIC Teraktif</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">{performanceData[0]?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by PIC Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking Sales PIC (Omset)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <PremiumBarChart
                data={performanceData.slice(0, 10)}
                dataKey="totalSales"
                layout="vertical"
                height={300}
                color="#3b82f6"
                valuePrefix="Rp "
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sebaran Lokasi Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `Rp ${formatCurrency(val)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 pr-4">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate max-w-[100px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Performa Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Nama Sales</TableHead>
                <TableHead className="text-center">Total Order</TableHead>
                <TableHead className="text-right">Total Omset</TableHead>
                <TableHead className="text-right">Rata-rata/Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    Belum ada data transaksi untuk personil sales
                  </TableCell>
                </TableRow>
              ) : (
                performanceData.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-center">
                      <Badge variant={idx === 0 ? "default" : "outline"} className={idx === 0 ? "bg-amber-500 hover:bg-amber-600" : ""}>
                        #{idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{p.totalTransactions}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">Rp {formatCurrency(p.totalSales)}</TableCell>
                    <TableCell className="text-right text-slate-500">Rp {formatCurrency(p.avgTransaction)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
