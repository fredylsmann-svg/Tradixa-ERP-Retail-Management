import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Package, TrendingDown, DollarSign, AlertTriangle, Search, Download, FileDown, Loader2, Boxes, Info } from 'lucide-react';
import moment from 'moment';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PageHeader from '@/components/layout/PageHeader';
import { BarChart3 } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

// Info Tooltip component
const InfoTip = ({ text }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onClick={() => setOpen(!open)}
          className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0 ml-1.5 cursor-pointer">
          <Info className="w-2.5 h-2.5 pointer-events-none" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3 bg-white border-none shadow-2xl rounded-2xl z-[100]">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
             <Info className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 font-medium">{text}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function StockReport({ store }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [batches, setBatches] = useState([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const data = await api.entities.Product.filter({ store_id: store.id });
    setProducts(data);
    setIsLoading(false);
    loadBatches();
  };

  const loadBatches = async () => {
    setIsBatchLoading(true);
    const data = await api.entities.InventoryBatch.filter({ store_id: store.id, status: 'Available' });
    setBatches(data);
    setIsBatchLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.sell_price), 0);
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= p.reorder_level);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const exportToCSV = () => {
    const headers = ['SKU', 'Nama Produk', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Nilai Stok', 'Status'];
    const rows = filteredProducts.map(p => [
      p.sku, p.name, p.category, p.stock, p.buy_price, p.sell_price, p.stock * p.sell_price, p.status
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = async () => {
    const content = `
      <h1>Laporan Stok Produk - ${store.store_name}</h1>
      <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th>SKU</th><th>Nama</th><th>Stok</th><th>Harga Jual</th><th>Nilai</th>
          </tr>
        </thead>
        <tbody>
          ${filteredProducts.map(p => `
            <tr>
              <td>${p.sku}</td>
              <td>${p.name}</td>
              <td>${p.stock}</td>
              <td>Rp ${formatCurrency(p.sell_price)}</td>
              <td>Rp ${formatCurrency(p.stock * p.sell_price)}</td>
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

  if (isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Report"
        subtitle="Ringkasan dan detail stok produk"
        icon={Package}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => { setActiveTab(activeTab === 'general' ? 'batch' : 'general'); }}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 h-11 rounded-xl font-bold px-6"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {activeTab === 'general' ? 'View Batches' : 'General View'}
            </Button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Produk</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={totalProducts} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Stok Rendah</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={lowStockProducts.length} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Stok Kosong</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={outOfStockProducts.length} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Nilai Stok</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={totalStockValue} prefix="Rp " />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Produk Dengan Stok Rendah ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-sm text-slate-500">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-600 font-medium">Stok: {p.stock}</p>
                    <p className="text-xs text-slate-500">Reorder: {p.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Content */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b bg-slate-50/30 flex items-center justify-between">
            <div className="flex gap-2 p-1 bg-white border rounded-2xl shadow-sm overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'general' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                General Stock
                <InfoTip text="Laporan stok keseluruhan yang merangkum total saldo barang di semua gudang tanpa membedakan batch." />
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'batch' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                Batch Breakdown (FEFO)
                <InfoTip text="Detail rincian stok per nomor batch, tanggal produksi, dan kadaluarsa. Membantu pelacakan metode First Expired First Out." />
              </button>
              <button
                onClick={() => setActiveTab('expiry')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'expiry' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                Expiry Monitor
                <InfoTip text="Pemantauan khusus untuk barang yang mendekati tanggal kadaluarsa. Memudahkan pencegahan kerugian akibat barang expired." />
              </button>
              <button
                onClick={() => setActiveTab('slow_moving')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${activeTab === 'slow_moving' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                Slow Moving
                <InfoTip text="Daftar barang dengan perputaran stok rendah (tidak terjual dalam 30+ hari terakhir). Berguna untuk strategi cuci gudang." />
              </button>
            </div>

            <div className="flex-1 max-w-md ml-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari nama, SKU, atau batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {activeTab === 'general' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white border-b">
                    <TableHead className="w-12 text-center pl-8">No.</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-right pr-8">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-slate-400 italic">
                        Tidak ada produk ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50 group">
                        <TableCell className="text-center text-slate-400 font-bold pl-8">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-slate-800">{p.sku}</TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                          {p.tracking_type === 'Batch' && <Badge className="mt-1 bg-blue-50 text-blue-600 border-none text-[9px] h-4">BATCH TRACKED</Badge>}
                        </TableCell>
                        <TableCell className="font-medium text-slate-500">{p.category}</TableCell>
                        <TableCell className="text-center font-black text-slate-900">{p.stock}</TableCell>
                        <TableCell className="text-right font-medium text-slate-500">Rp {formatCurrency(p.buy_price)}</TableCell>
                        <TableCell className="text-right font-black text-blue-700">Rp {formatCurrency(p.sell_price)}</TableCell>
                        <TableCell className="pr-8">
                          <Badge className={
                            p.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600' :
                              p.status === 'Low Stock' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-600'
                          }>
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {activeTab === 'batch' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b">
                  <TableRow>
                    <TableHead className="w-12 text-center pl-8">No.</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Mfg Date</TableHead>
                    <TableHead>Expired Date</TableHead>
                    <TableHead className="text-center">Sisa Stok</TableHead>
                    <TableHead className="text-center">Initial</TableHead>
                    <TableHead className="text-center pr-8">Status FEFO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isBatchLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
                  ) : batches.filter(b => b.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-slate-400 italic">
                        Belum ada data batch yang aktif.
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches
                      .filter(b => b.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                      .map((b, idx) => {
                        const isExpired = moment(b.expiry_date).isBefore(moment());
                        const isNearExpiry = moment(b.expiry_date).isBefore(moment().add(3, 'months')) && !isExpired;

                        return (
                          <TableRow key={b.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center text-slate-400 font-bold pl-8">{idx + 1}</TableCell>
                            <TableCell className="font-black text-slate-800">{b.batch_number}</TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-900">{b.product_name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{b.grn_number}</p>
                            </TableCell>
                            <TableCell className="text-center text-slate-400 text-xs">
                              {b.manufacture_date ? moment(b.manufacture_date).format('DD MMM YYYY') : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-slate-700">
                              {moment(b.expiry_date).format('DD MMM YYYY')}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-base font-black ${b.qty_on_hand <= 0 ? 'text-slate-300' : 'text-blue-700'}`}>{b.qty_on_hand}</span>
                            </TableCell>
                            <TableCell className="text-center text-slate-400 font-medium">{b.qty_received}</TableCell>
                            <TableCell className="pr-8 text-center">
                              {isExpired ? (
                                <Badge className="bg-red-600 text-white border-none font-black text-[9px] uppercase tracking-tighter">EXPIRED</Badge>
                              ) : isNearExpiry ? (
                                <Badge className="bg-amber-500 text-white border-none font-black text-[9px] uppercase tracking-tighter">NEAR EXPIRY</Badge>
                              ) : (
                                <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase tracking-tighter">GOOD (FEFO OK)</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'expiry' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b">
                  <TableRow>
                    <TableHead className="w-12 text-center pl-8">No.</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Expired Date</TableHead>
                    <TableHead className="text-center">Sisa Stok</TableHead>
                    <TableHead className="text-center">Initial</TableHead>
                    <TableHead className="text-center pr-8">Status Peringatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isBatchLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></TableCell></TableRow>
                  ) : batches.filter(b => b.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())).filter(b => moment(b.expiry_date).isBefore(moment().add(3, 'months'))).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-slate-400 italic">
                        Tidak ada batch yang expired atau mendekati masa kadaluarsa (3 bulan).
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches
                      .filter(b => b.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .filter(b => moment(b.expiry_date).isBefore(moment().add(3, 'months')))
                      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                      .map((b, idx) => {
                        const isExpired = moment(b.expiry_date).isBefore(moment());

                        return (
                          <TableRow key={b.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center text-slate-400 font-bold pl-8">{idx + 1}</TableCell>
                            <TableCell className="font-black text-slate-800">{b.batch_number}</TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-900">{b.product_name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{b.grn_number}</p>
                            </TableCell>
                            <TableCell className="font-bold text-slate-700">
                              {moment(b.expiry_date).format('DD MMM YYYY')}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-base font-black ${b.qty_on_hand <= 0 ? 'text-slate-300' : 'text-blue-700'}`}>{b.qty_on_hand}</span>
                            </TableCell>
                            <TableCell className="text-center text-slate-400 font-medium">{b.qty_received}</TableCell>
                            <TableCell className="pr-8 text-center">
                              {isExpired ? (
                                <Badge className="bg-red-600 text-white border-none font-black text-[9px] uppercase tracking-tighter">EXPIRED</Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white border-none font-black text-[9px] uppercase tracking-tighter">NEAR EXPIRY</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'slow_moving' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white border-b">
                    <TableHead className="w-12 text-center pl-8">No.</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead className="text-center">Stok Tertahan</TableHead>
                    <TableHead className="text-right">Nilai Modal</TableHead>
                    <TableHead className="text-right pr-8">Peringatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.filter(p => p.stock > (p.reorder_level * 3) || p.stock > 100).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400 italic">
                        Stok terlihat sehat. Tidak ada produk slow-moving/overstock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts
                      .filter(p => p.stock > (p.reorder_level * 3) || p.stock > 100)
                      .sort((a, b) => b.stock - a.stock)
                      .map((p, idx) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50 group">
                          <TableCell className="text-center text-slate-400 font-bold pl-8">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-800">{p.sku}</TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Kategori: {p.category}</p>
                          </TableCell>
                          <TableCell className="text-center font-black text-slate-900">{p.stock}</TableCell>
                          <TableCell className="text-right font-medium text-slate-500">Rp {formatCurrency(p.buy_price * p.stock)}</TableCell>
                          <TableCell className="pr-8 text-right">
                            <Badge className="bg-purple-50 text-purple-600 border-none">Overstock</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
