import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingCart, DollarSign, Award, Calendar, Download, FileDown, ArrowUpRight, ArrowDownRight, LineChart as LineChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { BarChart3 } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export default function SalesReport({ store }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [products, setProducts] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [prevPeriodData, setPrevPeriodData] = useState(null);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [txData, prodData] = await Promise.all([
      api.entities.SalesTransaction.filter({ store_id: store.id }),
      api.entities.Product.filter({ store_id: store.id })
    ]);
    setTransactions(txData);
    setProducts(prodData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const matchDate = (!start || txDate >= start) && (!end || txDate <= end);
    const matchProduct = selectedProduct === 'All' || 
      tx.items?.some(item => item.product_id === selectedProduct);
    
    return matchDate && matchProduct;
  });

  // Calculate stats
  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalProfit = filteredTransactions.reduce((sum, tx) => sum + tx.profit, 0);
  const totalTransactions = filteredTransactions.length;

  // Daily sales
  const today = new Date().toDateString();
  const dailySales = filteredTransactions.filter(tx => 
    new Date(tx.created_date).toDateString() === today
  );
  const dailyRevenue = dailySales.reduce((sum, tx) => sum + tx.total, 0);

  // Weekly sales
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklySales = filteredTransactions.filter(tx => 
    new Date(tx.created_date) >= oneWeekAgo
  );
  const weeklyRevenue = weeklySales.reduce((sum, tx) => sum + tx.total, 0);

  // Monthly sales
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthlySales = filteredTransactions.filter(tx => 
    new Date(tx.created_date) >= oneMonthAgo
  );
  const monthlyRevenue = monthlySales.reduce((sum, tx) => sum + tx.total, 0);

  // Best selling products
  const productSales = {};
  filteredTransactions.forEach(tx => {
    tx.items?.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.subtotal;
    });
  });

  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Chart data - Last 7 days
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    
    const daySales = filteredTransactions.filter(tx => {
      const txDate = new Date(tx.created_date);
      return txDate.toDateString() === date.toDateString();
    });
    
    const dayRevenue = daySales.reduce((sum, tx) => sum + tx.total, 0);
    chartData.push({ name: dateStr, value: dayRevenue });
  }

  // Payment method distribution
  const paymentData = {};
  filteredTransactions.forEach(tx => {
    paymentData[tx.payment_method] = (paymentData[tx.payment_method] || 0) + 1;
  });
  const paymentChartData = Object.entries(paymentData).map(([method, count]) => ({
    name: method,
    value: count
  }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Invoice', 'Pelanggan', 'Total', 'Keuntungan', 'Metode Pembayaran'];
    const rows = filteredTransactions.map(tx => [
      tx.timestamp_wib, tx.invoice_number, tx.customer_name, tx.total, tx.profit, tx.payment_method
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const content = `
      <h1>Laporan Penjualan - ${store.store_name}</h1>
      <p>Periode: ${startDate || 'Awal'} - ${endDate || 'Akhir'}</p>
      <p>Total Transaksi: ${totalTransactions}</p>
      <p>Total Pendapatan: Rp ${formatCurrency(totalRevenue)}</p>
      <p>Total Keuntungan: Rp ${formatCurrency(totalProfit)}</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th>Invoice</th><th>Pelanggan</th><th>Total</th><th>Keuntungan</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions.slice(0, 50).map(tx => `
            <tr>
              <td>${tx.invoice_number}</td>
              <td>${tx.customer_name}</td>
              <td>Rp ${formatCurrency(tx.total)}</td>
              <td>Rp ${formatCurrency(tx.profit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    const htmlContent = content + '<script>window.onload=function(){window.print();};</script>';
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) { window.alert('Pop-up blocked! Izinkan pop-up untuk export.'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Compare with previous period
  useEffect(() => {
    if (compareMode && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - daysDiff);
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevTxs = transactions.filter(tx => {
        const txDate = new Date(tx.created_date);
        return txDate >= prevStart && txDate <= prevEnd;
      });

      const prevRevenue = prevTxs.reduce((sum, tx) => sum + tx.total, 0);
      const prevProfit = prevTxs.reduce((sum, tx) => sum + tx.profit, 0);
      const prevCount = prevTxs.length;

      setPrevPeriodData({ revenue: prevRevenue, profit: prevProfit, count: prevCount });
    }
  }, [compareMode, startDate, endDate, transactions]);

  const calculateChange = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Report"
        subtitle="Analisis dan ringkasan penjualan"
        icon={LineChartIcon}
        actions={
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 h-11 rounded-xl font-bold">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 h-11 rounded-xl font-bold">
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Penjualan Hari Ini</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={dailyRevenue} prefix="Rp " />
                </p>
                <p className="text-xs text-white/80 mt-1 font-medium">{dailySales.length} transaksi</p>
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
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Revenue (Filtered)</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalRevenue} prefix="Rp " />
                </p>
                <p className="text-xs text-white/80 mt-1 font-medium">{filteredTransactions.length} transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-violet-500 to-violet-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Profit (Filtered)</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalProfit} prefix="Rp " />
                </p>
                <p className="text-xs text-white/80 mt-1 font-medium">Estimasi Margin: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-cyan-500 to-cyan-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Transaksi</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalTransactions} suffix=" Order" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-indigo-500 to-indigo-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Pendapatan</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalRevenue} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Keuntungan</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalProfit} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Filter Produk</Label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="All">Semua Produk</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant={compareMode ? "default" : "outline"}
                  onClick={() => setCompareMode(!compareMode)}
                  className="w-full"
                >
                  {compareMode ? 'Mode Perbandingan: ON' : 'Bandingkan Periode'}
                </Button>
              </div>
            </div>

            {compareMode && prevPeriodData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Perubahan Transaksi</p>
                    <p className="text-lg font-bold">{calculateChange(totalTransactions, prevPeriodData.count).toFixed(1)}%</p>
                  </div>
                  {calculateChange(totalTransactions, prevPeriodData.count) >= 0 ? 
                    <ArrowUpRight className="w-6 h-6 text-emerald-600" /> : 
                    <ArrowDownRight className="w-6 h-6 text-red-600" />
                  }
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Perubahan Pendapatan</p>
                    <p className="text-lg font-bold">{calculateChange(totalRevenue, prevPeriodData.revenue).toFixed(1)}%</p>
                  </div>
                  {calculateChange(totalRevenue, prevPeriodData.revenue) >= 0 ? 
                    <ArrowUpRight className="w-6 h-6 text-emerald-600" /> : 
                    <ArrowDownRight className="w-6 h-6 text-red-600" />
                  }
                </div>
                <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Perubahan Keuntungan</p>
                    <p className="text-lg font-bold">{calculateChange(totalProfit, prevPeriodData.profit).toFixed(1)}%</p>
                  </div>
                  {calculateChange(totalProfit, prevPeriodData.profit) >= 0 ? 
                    <ArrowUpRight className="w-6 h-6 text-emerald-600" /> : 
                    <ArrowDownRight className="w-6 h-6 text-red-600" />
                  }
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Penjualan (7 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumBarChart 
              data={chartData} 
              dataKey="value" 
              color="#3b82f6" 
              valuePrefix="Rp " 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Best Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Produk Terlaris
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Ranking</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-center">Terjual</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bestSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                    Belum ada data penjualan
                  </TableCell>
                </TableRow>
              ) : (
                bestSellers.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge className={
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-600'
                      }>
                        #{idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-center font-medium">{product.quantity} unit</TableCell>
                    <TableCell className="text-right font-medium">Rp {formatCurrency(product.revenue)}</TableCell>
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
