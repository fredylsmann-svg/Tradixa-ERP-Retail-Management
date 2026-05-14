import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Calendar, TrendingUp, Package, DollarSign, Loader2 } from 'lucide-react';
import moment from 'moment';
import PageHeader from '@/components/layout/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import { BarChart3 } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export default function Reports({ store }) {
  const [reportType, setReportType] = useState('sales');
  const [dateFrom, setDateFrom] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

  const generateReport = async () => {
    if (!store?.id) return;
    
    setIsLoading(true);
    
    try {
      if (reportType === 'sales') {
        const transactions = await api.entities.SalesTransaction.filter({ store_id: store.id });
        const filtered = transactions.filter(t => {
          const tDate = moment(t.created_date);
          return tDate.isBetween(dateFrom, dateTo, 'day', '[]');
        });

        const totalRevenue = filtered.reduce((sum, t) => sum + (t.total || 0), 0);
        const totalProfit = filtered.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalOrders = filtered.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const productSales = {};
        filtered.forEach(t => {
          t.items?.forEach(item => {
            if (!productSales[item.product_name]) {
              productSales[item.product_name] = { qty: 0, revenue: 0 };
            }
            productSales[item.product_name].qty += item.quantity || 0;
            productSales[item.product_name].revenue += item.subtotal || 0;
          });
        });

        const topProducts = Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        setReportData({
          summary: { totalRevenue, totalProfit, totalOrders, avgOrderValue },
          transactions: filtered,
          topProducts
        });
      } else if (reportType === 'inventory') {
        const products = await api.entities.Product.filter({ store_id: store.id });
        const movements = await api.entities.StockMovement.filter({ store_id: store.id });
        
        const filtered = movements.filter(m => {
          const mDate = moment(m.created_date);
          return mDate.isBetween(dateFrom, dateTo, 'day', '[]');
        });

        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.buy_price || 0), 0);
        const lowStock = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock').length;
        const totalStockIn = filtered.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (m.quantity || 0), 0);
        const totalStockOut = filtered.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + (m.quantity || 0), 0);

        setReportData({
          summary: { totalProducts, totalValue, lowStock, totalStockIn, totalStockOut },
          products,
          movements: filtered
        });
      } else if (reportType === 'financial') {
        const [transactions, receivables, payables, bankTransactions] = await Promise.all([
          api.entities.SalesTransaction.filter({ store_id: store.id }),
          api.entities.Receivable.filter({ store_id: store.id }),
          api.entities.Payable.filter({ store_id: store.id }),
          api.entities.BankTransaction.filter({ store_id: store.id })
        ]);

        const filteredTrans = transactions.filter(t => {
          const tDate = moment(t.created_date);
          return tDate.isBetween(dateFrom, dateTo, 'day', '[]');
        });

        const filteredBank = bankTransactions.filter(b => {
          const bDate = moment(b.created_date);
          return bDate.isBetween(dateFrom, dateTo, 'day', '[]');
        });

        const totalRevenue = filteredTrans.reduce((sum, t) => sum + (t.total || 0), 0);
        const totalReceivable = receivables.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);
        const totalPayable = payables.reduce((sum, p) => sum + (p.remaining_amount || 0), 0);
        const cashIn = filteredBank.filter(b => b.transaction_type === 'Credit').reduce((sum, b) => sum + (b.amount || 0), 0);
        const cashOut = filteredBank.filter(b => b.transaction_type === 'Debit').reduce((sum, b) => sum + (b.amount || 0), 0);

        setReportData({
          summary: { totalRevenue, totalReceivable, totalPayable, cashIn, cashOut },
          transactions: filteredTrans,
          bankTransactions: filteredBank
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (store?.id) generateReport();
  }, [store, reportType]);

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    let filename = `${reportType}_report_${dateFrom}_to_${dateTo}.csv`;

    if (reportType === 'sales') {
      csvContent = 'Invoice,Customer,Date,Total,Profit,Status\n';
      reportData.transactions.forEach(t => {
        csvContent += `${t.invoice_number},${t.customer_name},${moment(t.created_date).format('YYYY-MM-DD')},${t.total},${t.profit},${t.payment_status}\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent = 'Product,SKU,Category,Stock,Buy Price,Sell Price,Status\n';
      reportData.products.forEach(p => {
        csvContent += `${p.name},${p.sku || ''},${p.category},${p.stock},${p.buy_price},${p.sell_price},${p.status}\n`;
      });
    } else if (reportType === 'financial') {
      csvContent = 'Type,Date,Description,Amount,Balance\n';
      reportData.bankTransactions.forEach(b => {
        csvContent += `${b.transaction_type},${moment(b.created_date).format('YYYY-MM-DD')},${b.description || ''},${b.amount},${b.balance_after}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <PageHeader
        title="Reports"
        subtitle="Generate and export business reports"
        icon={FileText}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={generateReport} disabled={isLoading} className="flex-1 text-sm">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Generate
              </Button>
              <PremiumGate feature="Export CSV" iconType="action" store={store}>
                <Button onClick={exportToCSV} disabled={!reportData} variant="outline" className="text-sm">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </PremiumGate>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {reportType === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Total Revenue</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-slate-900">
                      <AnimatedNumber value={reportData.summary.totalRevenue} prefix="Rp " />
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-xs">Total Profit</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-green-600">
                      <AnimatedNumber value={reportData.summary.totalProfit} prefix="Rp " />
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <FileText className="w-4 h-4" />
                      <p className="text-xs">Total Orders</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">
                      <AnimatedNumber value={reportData.summary.totalOrders} />
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Avg Order</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-purple-600">
                      <AnimatedNumber value={reportData.summary.avgOrderValue} prefix="Rp " />
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead >Product</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProducts.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm font-medium">{product.name}</TableCell>
                            <TableCell className="text-sm text-right">{product.qty}</TableCell>
                            <TableCell className="text-sm text-right font-semibold">Rp {formatCurrency(product.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {reportType === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <Package className="w-4 h-4" />
                      <p className="text-xs">Total Products</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-slate-900">{reportData.summary.totalProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Stock Value</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">Rp {formatCurrency(reportData.summary.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                      <Package className="w-4 h-4" />
                      <p className="text-xs">Low Stock</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-red-600">{reportData.summary.lowStock}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-xs">Stock In</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-green-600">{reportData.summary.totalStockIn}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-500 mb-2">
                      <TrendingUp className="w-4 h-4 rotate-180" />
                      <p className="text-xs">Stock Out</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-orange-600">{reportData.summary.totalStockOut}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {reportType === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Revenue</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-green-600">Rp {formatCurrency(reportData.summary.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Receivable</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-orange-600">Rp {formatCurrency(reportData.summary.totalReceivable)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <p className="text-xs">Payable</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-red-600">Rp {formatCurrency(reportData.summary.totalPayable)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-xs">Cash In</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-green-600">Rp {formatCurrency(reportData.summary.cashIn)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                      <TrendingUp className="w-4 h-4 rotate-180" />
                      <p className="text-xs">Cash Out</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold text-red-600">Rp {formatCurrency(reportData.summary.cashOut)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
