import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, TrendingUp, TrendingDown, BarChart3, Download, Printer, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/layout/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function InventoryReports({ store }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [invReport, setInvReport] = useState({
    total_stock_value: 0,
    total_items: 0,
    total_in: 0,
    total_out: 0,
    category_data: [],
    stock_by_category: [],
    products: [],
    movements: []
  });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const { data: rpcRes, error } = await supabase.rpc('get_inventory_reports', {
        p_store_id: store.id,
        p_timezone: userTimezone
      });

      if (error) {
        console.warn('RPC get_inventory_reports not available yet, falling back:', error.message);
        const [productsData, movementsData] = await Promise.all([
          api.entities.Product.filter({ store_id: store.id }),
          api.entities.StockMovement.filter({ store_id: store.id })
        ]);
        const prods = productsData || [];
        const movs = movementsData || [];
        const totVal = prods.reduce((s, p) => s + ((p.stock || 0) * (p.buy_price || p.price || 0)), 0);
        const totItems = prods.reduce((s, p) => s + (p.stock || 0), 0);
        const totIn = movs.filter(m => m.movement_type === 'in').reduce((s, m) => s + (m.quantity || 0), 0);
        const totOut = movs.filter(m => m.movement_type === 'out').reduce((s, m) => s + (m.quantity || 0), 0);

        setInvReport({
          total_stock_value: totVal,
          total_items: totItems,
          total_in: totIn,
          total_out: totOut,
          category_data: [],
          stock_by_category: [],
          products: prods,
          movements: movs
        });
      } else if (rpcRes) {
        setInvReport(rpcRes);
      }
    } catch (err) {
      console.error('Error loading inventory report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

  const products = invReport.products || [];
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const totalStockValue = invReport.total_stock_value || 0;
  const totalItems = invReport.total_items || 0;
  const totalIn = invReport.total_in || 0;
  const totalOut = invReport.total_out || 0;
  const categoryData = invReport.category_data || [];
  const stockByCategory = invReport.stock_by_category || [];
  const movements = invReport.movements || [];

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredProducts.map(p => ({
        'Nama Produk': p.name,
        'Kategori': p.category,
        'Stok': `${p.stock} ${p.unit}`,
        'Harga Beli': p.buy_price,
        'Nilai Stok': p.stock * p.buy_price,
        'Kadaluarsa': p.expired_date || '-',
        'Status': p.status
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Report");
      XLSX.writeFile(wb, `Inventory_Report_${new Date().getTime()}.xlsx`);
      toast.success('Laporan Excel berhasil diunduh');
    } catch (e) {
      toast.error('Gagal export Excel: ' + e.message);
    }
  };

  const handlePrintPDF = () => {
    try {
      const element = document.getElementById('inventory-report-content');
      if (!element) return;
      
      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `Inventory_Report_${new Date().getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      toast.promise(html2pdf().set(opt).from(element).save(), {
        loading: 'Menyiapkan PDF...',
        success: 'PDF berhasil diunduh!',
        error: 'Gagal mencetak PDF'
      });
    } catch (e) {
      toast.error('Gagal mencetak PDF: ' + e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="inventory-report-content">
      <PageHeader
        title="Inventory Reports"
        subtitle="Laporan dan analisis inventory"
        icon={FileText}
        actions={
          <>
            <PremiumGate store={store} featureName="Export Excel">
              <Button onClick={handleExportExcel} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold h-11 rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </PremiumGate>
            <PremiumGate store={store} featureName="Cetak PDF">
              <Button onClick={handlePrintPDF} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">
                <Printer className="w-4 h-4 mr-2" /> Cetak PDF
              </Button>
            </PremiumGate>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Produk</p>
                <p className="text-xl font-bold">
                  <AnimatedNumber value={products.length} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Item</p>
                <p className="text-xl font-bold">
                  <AnimatedNumber value={totalItems} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Nilai Inventory</p>
                <p className="text-xl font-bold">
                  <AnimatedNumber value={totalStockValue} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Masuk</p>
                <p className="text-xl font-bold text-emerald-600">
                  +<AnimatedNumber value={totalIn} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Keluar</p>
                <p className="text-xl font-bold text-red-600">
                  -<AnimatedNumber value={totalOut} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stok per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumBarChart 
              data={stockByCategory} 
              dataKey="stock" 
              color="#3b82f6" 
              valueSuffix=" Items" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                  label={(props) => {
                    const { cx, cy, midAngle, outerRadius, fill, percent, name, index } = props;
                    if (percent === 0) return null;
                    const RADIAN = Math.PI / 180;
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    
                    const sx = cx + outerRadius * cos;
                    const sy = cy + outerRadius * sin;
                    
                    // Vertical stagger for small slices to prevent overlap without widening chart
                    const stagger = [ -35, 0, 35 ];
                    const verticalStagger = percent < 0.1 ? stagger[index % 3] : 0;
                    
                    const mx = cx + (outerRadius + 15) * cos;
                    const my = cy + (outerRadius + 15) * sin + verticalStagger;
                    
                    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
                    const ey = my;
                    const textAnchor = cos >= 0 ? 'start' : 'end';
                    const textX = ex + (cos >= 0 ? 1 : -1) * 6;
                    
                    const isLong = name.length > 12;

                    return (
                      <g>
                        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1} />
                        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
                        <text x={textX} y={ey} textAnchor={textAnchor} fill={fill} fontSize={15} dominantBaseline="central">
                          {isLong ? (
                            <>
                              <tspan x={textX} dy="-0.4em">{name}</tspan>
                              <tspan x={textX} dy="1.2em">{`${(percent * 100).toFixed(0)}%`}</tspan>
                            </>
                          ) : (
                            `${name} ${(percent * 100).toFixed(0)}%`
                          )}
                        </text>
                      </g>
                    );
                  }}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Detail Inventory</CardTitle>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Nilai Stok</TableHead>
                <TableHead>Kadaluarsa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, idx) => (
                <TableRow key={product.id}>
                  <TableCell className="text-xs font-medium text-slate-400">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{product.stock} {product.unit}</TableCell>
                  <TableCell className="text-right">Rp {formatCurrency(product.buy_price)}</TableCell>
                  <TableCell className="text-right font-medium">Rp {formatCurrency(product.stock * product.buy_price)}</TableCell>
                  <TableCell>{product.expired_date || '-'}</TableCell>
                  <TableCell>
                    <Badge className={
                      product.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' :
                      product.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }>{product.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pergerakan Stok per Produk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Stock In</TableHead>
                <TableHead className="text-center">Stock Out</TableHead>
                <TableHead className="text-center">Sisa Stok</TableHead>
                <TableHead className="text-right">Nilai Sisa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, idx) => {
                const productMovements = movements.filter(m => m.product_id === product.id);
                const stockIn = productMovements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + m.quantity, 0);
                const stockOut = productMovements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + m.quantity, 0);
                
                return (
                  <TableRow key={product.id}>
                    <TableCell className="text-xs font-medium text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-medium">+{stockIn}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">-{stockOut}</TableCell>
                    <TableCell className="text-center font-bold">{product.stock} {product.unit}</TableCell>
                    <TableCell className="text-right font-medium">Rp {formatCurrency(product.stock * product.buy_price)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
