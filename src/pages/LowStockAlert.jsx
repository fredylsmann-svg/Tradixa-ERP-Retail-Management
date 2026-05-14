import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, ArrowRight, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/layout/PageHeader';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';

export default function LowStockAlert({ store }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (store?.id) loadProducts();
  }, [store]);

  const loadProducts = async () => {
    const data = await api.entities.Product.filter({ store_id: store.id });
    const lowStock = data.filter(p => p.stock <= p.reorder_level);
    setProducts(lowStock);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.reorder_level);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="print-low-stock-alert">
      <PageHeader
        title="Low Stock Alert"
        subtitle="Produk yang membutuhkan restock"
        icon={AlertTriangle}
        actions={
          <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Low Stock Alert', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-low-stock-alert')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Low Stock Alert', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-low-stock-alert')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Low Stock Alert', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-low-stock-alert')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-rose-500 to-rose-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 tracking-wide drop-shadow-sm">Out of Stock</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">{outOfStock.length}</p>
                <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-sm">produk habis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-amber-600 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Package className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 tracking-wide drop-shadow-sm">Low Stock</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">{lowStock.length}</p>
                <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-sm">produk hampir habis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <Package className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 tracking-wide drop-shadow-sm">Total Perlu Restock</p>
                <p className="text-3xl font-black text-white mt-1 tracking-tight drop-shadow-md">{products.length}</p>
                <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-sm">produk butuh restock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Daftar Produk Stok Menipis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Semua produk memiliki stok cukup</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Stok Saat Ini</TableHead>
                  <TableHead className="text-center">Reorder Level</TableHead>
                  <TableHead className="text-center">Kekurangan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku || '-'}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className={`text-center font-bold ${product.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {product.stock}
                    </TableCell>
                    <TableCell className="text-center">{product.reorder_level}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {product.reorder_level - product.stock}
                    </TableCell>
                    <TableCell>
                      <Badge className={product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                        {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl('StockIn')}>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          Restock <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
