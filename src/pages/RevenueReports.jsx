import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, ShoppingCart, Percent, Printer, BarChart3, PackageX, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PremiumBarChart, PremiumAreaChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/layout/PageHeader';

export default function RevenueReports({ store }) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7days');

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [txData, prodData] = await Promise.all([
      api.entities.SalesTransaction.filter({ store_id: store.id }, '-created_date'),
      api.entities.Product.filter({ store_id: store.id })
    ]);
    setTransactions(txData);
    setProducts(prodData || []);
    setIsLoading(false);
  };

  const handleExport = () => {
    window.print();
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);
  const formatDateFull = (date) => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

  const getDaysData = (days) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
      const fullDateStr = formatDateFull(date);

      const dayTx = transactions.filter(t => {
        const txDate = new Date(t.created_date);
        return txDate.toDateString() === date.toDateString() && t.payment_status === 'Paid';
      });

      const revenue = dayTx.reduce((sum, t) => sum + (t.total || 0), 0);
      const profit = dayTx.reduce((sum, t) => sum + (t.profit || 0), 0);
      const orders = dayTx.length;

      // Filter out days with zero activity as requested
      if (revenue > 0 || profit > 0 || orders > 0) {
        data.push({
          name: dateStr,
          fullName: fullDateStr,
          revenue,
          profit,
          orders
        });
      }
    }
    return data;
  };

  const chartData = period === '7days' ? getDaysData(7) : period === '14days' ? getDaysData(14) : getDaysData(30);

  // Totals based on selected period's chartData
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = chartData.reduce((sum, d) => sum + d.profit, 0);
  const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Page appears instantly, numbers animate as they load

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Reports"
        subtitle="Analisis pendapatan dan keuntungan"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="h-11 px-6 rounded-xl border-slate-200 bg-white hover:bg-slate-50 gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="font-bold">Export Report</span>
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44 h-11 rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                <SelectItem value="14days">14 Hari Terakhir</SelectItem>
                <SelectItem value="30days">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="sales" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Ringkasan Penjualan</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Analisis Dead Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-5 md:p-6 relative z-10">
            <div className="relative min-h-[3.5rem]">
              <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-12 md:pr-14">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Pendapatan</p>
                <p className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalRevenue} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-emerald-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-5 md:p-6 relative z-10">
            <div className="relative min-h-[3.5rem]">
              <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-12 md:pr-14">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Keuntungan</p>
                <p className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalProfit} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-violet-500 to-violet-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-5 md:p-6 relative z-10">
            <div className="relative min-h-[3.5rem]">
              <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-12 md:pr-14">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Order</p>
                <p className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalOrders} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-amber-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-5 md:p-6 relative z-10">
            <div className="relative min-h-[3.5rem]">
              <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Percent className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-12 md:pr-14">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Rata-rata Order</p>
                <p className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  <AnimatedNumber value={avgOrderValue} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Pendapatan Harian</CardTitle></CardHeader>
          <CardContent>
            <PremiumAreaChart
              data={chartData}
              dataKey="revenue"
              color="#3b82f6"
              valuePrefix="Rp "
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Keuntungan Harian</CardTitle></CardHeader>
          <CardContent>
            <PremiumBarChart
              data={chartData}
              dataKey="profit"
              color="#10b981"
              valuePrefix="Rp "
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Trend Order</CardTitle></CardHeader>
        <CardContent>
          <PremiumAreaChart
            data={chartData}
            dataKey="orders"
            color="#8b5cf6"
            valueSuffix=" Order"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produk Terlaris dengan Margin Keuntungan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">No</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Qty Terjual</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
                <TableHead className="text-right">Keuntungan</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const productStats = {};
                transactions.filter(t => t.payment_status === 'Paid').forEach(tx => {
                  tx.items?.forEach(item => {
                    if (!productStats[item.product_id]) {
                      productStats[item.product_id] = {
                        name: item.product_name,
                        qty: 0,
                        revenue: 0,
                        cost: 0
                      };
                    }
                    productStats[item.product_id].qty += item.quantity;
                    productStats[item.product_id].revenue += item.subtotal;
                    productStats[item.product_id].cost += (item.buy_price || 0) * item.quantity;
                  });
                });

                const sortedProducts = Object.values(productStats)
                  .sort((a, b) => b.qty - a.qty)
                  .slice(0, 10);

                return sortedProducts.map((product, idx) => {
                  const profit = product.revenue - product.cost;
                  const margin = product.revenue > 0 ? (profit / product.revenue * 100) : 0;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-center">{product.qty}</TableCell>
                      <TableCell className="text-right">Rp {formatCurrency(product.revenue)}</TableCell>
                      <TableCell className="text-right text-red-600">Rp {formatCurrency(product.cost)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">Rp {formatCurrency(profit)}</TableCell>
                      <TableCell className={`text-right font-medium ${margin >= 20 ? 'text-emerald-600' : margin >= 10 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {margin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={(() => {
                    const methods = {};
                    transactions.filter(t => t.payment_status === 'Paid').forEach(tx => {
                      methods[tx.payment_method] = (methods[tx.payment_method] || 0) + 1;
                    });
                    return Object.entries(methods).map(([name, value]) => ({ name, value }));
                  })()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[1, 2, 3, 4, 5].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <span className="text-slate-600">Total Pendapatan</span>
              <span className="font-bold text-lg">Rp {formatCurrency(totalRevenue)}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-lg flex items-center justify-between">
              <span className="text-red-600">Total Biaya</span>
              <span className="font-bold text-lg text-red-600">Rp {formatCurrency((() => {
                let totalCost = 0;
                transactions.filter(t => t.payment_status === 'Paid').forEach(tx => {
                  tx.items?.forEach(item => {
                    totalCost += (item.buy_price || 0) * item.quantity;
                  });
                });
                return totalCost;
              })())}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
              <span className="text-emerald-600">Total Keuntungan</span>
              <span className="font-bold text-lg text-emerald-600">Rp {formatCurrency(totalProfit)}</span>
            </div>
            <div className="p-3 bg-violet-50 rounded-lg flex items-center justify-between">
              <span className="text-violet-600">Margin Keuntungan</span>
              <span className="font-bold text-lg text-violet-600">
                {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-blue-600">Rata-rata per Transaksi</span>
              <span className="font-bold text-lg text-blue-600">Rp {formatCurrency(avgOrderValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </TabsContent>

        <TabsContent value="inventory">
          {(() => {
            const days = period === '7days' ? 7 : period === '14days' ? 14 : 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const prodStats = products.map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku || '-',
              stock: p.stock || 0,
              buy_price: p.purchase_price || p.price || 0,
              qtySold: 0
            }));

            transactions.filter(t => t.payment_status === 'Paid').forEach(tx => {
              const txDate = new Date(tx.created_date);
              if (txDate >= cutoffDate) {
                tx.items?.forEach(item => {
                  const p = prodStats.find(x => x.id === item.product_id);
                  if (p) p.qtySold += item.quantity;
                });
              }
            });

            // Filter out items with 0 stock that also didn't sell (just empty items)
            const activeInventory = prodStats.filter(p => p.stock > 0 || p.qtySold > 0);
            
            const deadStock = activeInventory.filter(p => p.stock > 0 && p.qtySold === 0)
                                             .sort((a,b) => (b.stock * b.buy_price) - (a.stock * a.buy_price)); // sort by locked value
            
            const slowMoving = activeInventory.filter(p => p.stock > 0 && p.qtySold > 0 && p.qtySold <= 2)
                                              .sort((a,b) => (b.stock * b.buy_price) - (a.stock * a.buy_price));

            const totalDeadValue = deadStock.reduce((sum, p) => sum + (p.stock * p.buy_price), 0);
            const totalSlowValue = slowMoving.reduce((sum, p) => sum + (p.stock * p.buy_price), 0);

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="relative overflow-hidden border-none bg-gradient-to-br from-red-500 to-red-700 transition-all hover:-translate-y-1">
                    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                    <CardContent className="p-5 md:p-6 relative z-10">
                      <div className="relative min-h-[3.5rem]">
                        <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                          <PackageX className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
                        </div>
                        <div className="text-white pr-12 md:pr-14">
                          <p className="text-xs md:text-sm font-medium text-white/90 tracking-wide drop-shadow-sm uppercase mb-1 flex items-center gap-2">Dead Stock ({days} Hari)</p>
                          <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-md mb-2">{deadStock.length} <span className="text-sm font-bold text-white/80">Produk</span></h3>
                          <p className="text-[10px] md:text-xs font-bold text-white bg-black/20 inline-block px-2 py-1 rounded backdrop-blur-sm border border-white/10">Nilai Tertahan: Rp {formatCurrency(totalDeadValue)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/70 mt-4 font-medium leading-relaxed">Barang dengan stok tersedia namun tidak pernah terjual sama sekali dalam periode {days} hari terakhir.</p>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-amber-600 transition-all hover:-translate-y-1">
                    <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                    <CardContent className="p-5 md:p-6 relative z-10">
                      <div className="relative min-h-[3.5rem]">
                        <div className="absolute right-0 top-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
                        </div>
                        <div className="text-white pr-12 md:pr-14">
                          <p className="text-xs md:text-sm font-medium text-white/90 tracking-wide drop-shadow-sm uppercase mb-1 flex items-center gap-2">Slow Moving ({days} Hari)</p>
                          <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-md mb-2">{slowMoving.length} <span className="text-sm font-bold text-white/80">Produk</span></h3>
                          <p className="text-[10px] md:text-xs font-bold text-white bg-black/20 inline-block px-2 py-1 rounded backdrop-blur-sm border border-white/10">Nilai Tertahan: Rp {formatCurrency(totalSlowValue)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/70 mt-4 font-medium leading-relaxed">Barang dengan penjualan sangat minim (≤ 2 unit) dalam periode {days} hari terakhir.</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-black text-slate-800">Daftar Produk Dead Stock</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-12">No</TableHead>
                          <TableHead >SKU & Produk</TableHead>
                          <TableHead className="text-center">Sisa Stok</TableHead>
                          <TableHead className="text-right">Harga Beli</TableHead>
                          <TableHead className="text-right">Modal Tertahan</TableHead>
                          <TableHead className="text-right pr-6">Rekomendasi Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deadStock.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-emerald-600 font-bold">
                              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              Luar biasa! Tidak ada Dead Stock untuk periode ini.
                            </TableCell>
                          </TableRow>
                        ) : (
                          deadStock.slice(0, 50).map((product, idx) => {
                            const lockedValue = product.stock * product.buy_price;
                            return (
                              <TableRow key={idx} className="hover:bg-red-50/20">
                                <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="font-bold text-slate-800">{product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{product.sku}</div>
                                </TableCell>
                                <TableCell className="text-center font-black text-red-600">{product.stock}</TableCell>
                                <TableCell className="text-right text-slate-600">Rp {formatCurrency(product.buy_price)}</TableCell>
                                <TableCell className="text-right font-bold text-red-700">Rp {formatCurrency(lockedValue)}</TableCell>
                                <TableCell className="text-right pr-6">
                                  <Badge 
                                    className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer text-[10px]"
                                    onClick={() => navigate('/DiscountManagement', { state: { initialProduct: product.name } })}
                                  >
                                    Buat Diskon Clearance <ArrowRight className="w-3 h-3 ml-1" />
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
