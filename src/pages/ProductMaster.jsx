import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Eye, Pencil, Trash2, Package, Boxes, Printer, X, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import ProductForm from '@/components/products/ProductForm';
import BarcodePrintModal from '@/components/products/BarcodePrintModal';
import { formatNumber } from '@/components/utils/currencyFormatter';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { getEffectiveLimits } from '@/planConfig';
import { useToast } from '@/components/ui/use-toast';

export default function ProductMaster({ store }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [printProducts, setPrintProducts] = useState([]); // Products to pass to modal
  const { selectedDate, formattedDate } = useGlobalDate();
  const { toast } = useToast();

  const [showAddProductGuide, setShowAddProductGuide] = useState(false);
  const [showActionColumnGuide, setShowActionColumnGuide] = useState(false);

  useEffect(() => {
    if (store?.id) loadProducts();

    // Listener untuk tombol refresh di Header
    const handleRefreshEvent = () => {
      loadProducts();
    };
    window.addEventListener('refresh_data', handleRefreshEvent);

    return () => {
      window.removeEventListener('refresh_data', handleRefreshEvent);
    };
  }, [store]);

  useEffect(() => {
    if (isLoading || !store?.id) return;
    const step = localStorage.getItem(`erp_tour_step_${store.id}`);
    if (step === '2') {
      const timer = setTimeout(() => setShowAddProductGuide(true), 1000);
      return () => clearTimeout(timer);
    } else if (step === '3' && products.length > 0) {
      const timer = setTimeout(() => setShowActionColumnGuide(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, products.length]);

  const dismissAddProductGuide = () => {
    setShowAddProductGuide(false);
    if (store?.id) {
      localStorage.setItem(`erp_tour_step_${store.id}`, '3');
    }
    if (products.length > 0) {
      setTimeout(() => setShowActionColumnGuide(true), 500);
    }
  };

  const dismissActionGuide = () => {
    setShowActionColumnGuide(false);
    if (store?.id) {
      localStorage.setItem(`erp_tour_step_${store.id}`, 'completed');
    }
  };

  const loadProducts = async () => {
    const data = await api.entities.Product.filter({ store_id: store.id });
    setProducts(data);
    setIsLoading(false);
  };

  // Master data should typically show all items
  const currentProducts = products;
  const handleDelete = async () => {
    if (!deleteProduct) return;
    await api.entities.Product.delete(deleteProduct.id);
    setDeleteProduct(null);
    loadProducts();
  };

  const formatCurrency = (value) => formatNumber(value || 0);

  const filteredProducts = currentProducts.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      'In Stock': 'bg-emerald-100 text-emerald-700',
      'Low Stock': 'bg-amber-100 text-amber-700',
      'Out of Stock': 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-slate-100'}>{status}</Badge>;
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master"
        subtitle="Kelola data produk Anda"
        icon={Boxes}
        actions={
          <>
            <ExportToolbar
              title="Daftar Master Produk"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-products-detailed"
            />
            {selectedProductIds.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setPrintProducts(products.filter(p => selectedProductIds.includes(p.id)))}
                className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 h-11"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak {selectedProductIds.length} Barcode
              </Button>
            )}
            
            <div className={`relative ${showAddProductGuide ? 'z-[60]' : ''}`}>
              {showAddProductGuide && (
                <div 
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] animate-in fade-in duration-300" 
                  onClick={dismissAddProductGuide}
                  style={{ margin: 0 }}
                />
              )}
              <Button
                onClick={() => {
                  if (showAddProductGuide) dismissAddProductGuide();
                  const limits = getEffectiveLimits(store);
                  if (limits.maxProducts !== Infinity && products.length >= limits.maxProducts) {
                    toast({
                      title: "Batas Produk Tercapai",
                      description: `Paket ${store?.plan || 'Free'} maksimal ${limits.maxProducts} produk. Silakan upgrade paket Anda.`,
                      variant: "destructive"
                    });
                    return;
                  }
                  setShowForm(true);
                }}
                className={`h-11 rounded-xl font-bold relative transition-all ${showAddProductGuide ? 'z-[60] bg-white text-blue-600 shadow-xl ring-4 ring-white/20 hover:bg-slate-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Produk
              </Button>

              {showAddProductGuide && (
                <div className="absolute top-full right-0 mt-4 w-[300px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[60] cursor-default border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 text-left">
                  <div className="absolute -top-1.5 right-[20px] w-3 h-3 bg-slate-900 border-t border-l border-slate-700/50 rotate-45" />
                  <div className="flex flex-col gap-3">
                    <div className="relative z-10 space-y-2">
                      <h4 className="text-xs font-black text-white tracking-wider uppercase">Input Data Master</h4>
                      <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                        Tombol ini digunakan untuk membuat atau menginput data master baru di sistem. Silakan klik tombol ini untuk mulai menambahkan produk Anda.
                      </p>
                    </div>
                    <div className="flex justify-end mt-2 relative z-10 pt-2 border-t border-slate-800">
                      <button 
                        onClick={dismissAddProductGuide} 
                        className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                      >
                        Mengerti <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className={showActionColumnGuide ? "" : "overflow-x-auto"} id="print-products">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Lokasi/Rak</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu Terdaftar</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Boxes className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Tidak ada produk ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, idx) => (
                    <TableRow key={product.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${showActionColumnGuide && idx === 0 ? "relative z-[60] bg-white dark:bg-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.15)] ring-2 ring-blue-500/20" : ""}`}>
                      <TableCell>
                        {showActionColumnGuide && idx === 0 && (
                          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] animate-in fade-in duration-300" onClick={dismissActionGuide} style={{margin: 0}} />
                        )}
                        <Checkbox 
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                            No Img
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>{product.barcode || '-'}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {product.name}
                        <div className="mt-1">
                          {product.tracking_type === 'Batch' ? (
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded-sm whitespace-nowrap">
                              Batch Tracking
                            </Badge>
                          ) : product.tracking_type === 'Serial' ? (
                            <Badge className="bg-purple-50 text-purple-600 border-purple-100 text-[9px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded-sm whitespace-nowrap">
                              Serial Tracking
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-400 border-slate-100 text-[9px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded-sm whitespace-nowrap">
                              Standard
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.location_name || '-'}</TableCell>
                      <TableCell className="text-right">Rp {formatCurrency(product.sell_price)}</TableCell>
                      <TableCell className={`text-center ${product.stock === 0 ? 'text-red-600' : ''}`}>
                        {product.stock}
                      </TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">{product.timestamp_wib || product.created_at?.split('T')[0] || '-'}</TableCell>
                      <TableCell>
                        <Popover open={showActionColumnGuide && idx === 0}>
                          <PopoverTrigger asChild>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setPrintProducts([product])} title="Cetak Barcode">
                                <Printer className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setViewingProduct(product)}>
                                <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(product); setShowForm(true); }}>
                                <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(product)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            side="bottom" 
                            align="end" 
                            sideOffset={12}
                            className="z-[70] w-[320px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto"
                            onPointerDownOutside={(e) => e.preventDefault()}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="relative z-10 space-y-2">
                                <h4 className="text-xs font-black text-white tracking-wider uppercase">Tindakan Lanjutan (Aksi)</h4>
                                <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                                  Setelah data tersimpan, Anda dapat mengelolanya langsung di tabel ini.
                                  <span className="block mt-2.5 space-y-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <span className="flex items-center gap-2.5 text-[11px]"><Eye className="w-3.5 h-3.5 text-blue-400"/> Melihat detail / pengisian data lanjutan</span>
                                    <span className="flex items-center gap-2.5 text-[11px]"><Pencil className="w-3.5 h-3.5 text-emerald-400"/> Merubah data langsung (Edit)</span>
                                    <span className="flex items-center gap-2.5 text-[11px]"><Trash2 className="w-3.5 h-3.5 text-red-400"/> Menghapus data (Hanya modul tertentu)</span>
                                  </span>
                                </p>
                              </div>
                              <div className="flex justify-end mt-2 relative z-10 pt-2 border-t border-slate-800">
                                <button 
                                  onClick={dismissActionGuide} 
                                  className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                                >
                                  Mengerti & Selesai
                                </button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingProduct(null); }}
        product={editingProduct}
        existingProducts={products}
        store={store}
        storeId={store?.id}
        onSuccess={loadProducts}
      />

      {/* Barcode Print Modal */}
      <BarcodePrintModal 
        open={printProducts.length > 0} 
        onClose={() => setPrintProducts([])} 
        products={printProducts} 
        store={store} 
      />

      {/* View Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={() => setViewingProduct(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Produk</DialogTitle>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-6">
              {viewingProduct.image_url && (
                <img src={viewingProduct.image_url} alt={viewingProduct.name} className="w-full h-48 object-cover rounded-lg" />
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700">
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Nama</p><p className="font-medium">{viewingProduct.name}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">SKU / Barcode</p><p className="font-medium">{viewingProduct.sku || '-'} / {viewingProduct.barcode || '-'}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Kategori</p><p className="font-medium">{viewingProduct.category}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Lokasi / Rak</p><p className="font-medium">{viewingProduct.location_name || '-'}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Stok</p><p className="font-medium">{viewingProduct.stock} {viewingProduct.sell_unit || viewingProduct.unit}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Metode Pelacakan</p>
                  <p className="font-medium">
                    {viewingProduct.tracking_type === 'Batch' ? '📦 Batch Tracking' : viewingProduct.tracking_type === 'Serial' ? '🔢 Serial Tracking' : '📋 Standard'}
                  </p>
                </div>
                {viewingProduct.tracking_type === 'Batch' && (
                  <>
                    <div><p className="text-sm text-slate-500 dark:text-slate-400">Issue Method</p><p className="font-bold text-blue-700">{viewingProduct.issue_method || 'FIFO'}</p></div>
                    <div><p className="text-sm text-slate-500 dark:text-slate-400">Lacak Expiry</p><p className="font-medium">{viewingProduct.track_expiry ? 'Ya ✅' : 'Tidak'}</p></div>
                    <div><p className="text-sm text-slate-500 dark:text-slate-400">Umur Simpan Default</p><p className="font-medium">{viewingProduct.default_shelf_life || 365} hari</p></div>
                  </>
                )}
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Status</p>{getStatusBadge(viewingProduct.status)}</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-xl space-y-4">
                <h4 className="font-semibold text-blue-900 text-sm border-b border-blue-200 pb-2">Informasi Harga & Konversi</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Harga Beli (per {viewingProduct.buy_unit || 'Dus'})</p>
                    <p className="font-medium">Rp {formatCurrency(viewingProduct.buy_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Konversi</p>
                    <p className="font-medium">1 {viewingProduct.buy_unit || 'Dus'} = {viewingProduct.conversion_rate || 1} {viewingProduct.sell_unit || viewingProduct.unit || 'Pcs'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">HPP (per {viewingProduct.sell_unit || viewingProduct.unit || 'Pcs'})</p>
                    <p className="font-medium">Rp {formatCurrency((viewingProduct.buy_price || 0) / (viewingProduct.conversion_rate || 1))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Harga Jual (per {viewingProduct.sell_unit || viewingProduct.unit || 'Pcs'})</p>
                    <p className="font-medium">Rp {formatCurrency(viewingProduct.sell_price)}</p>
                  </div>
                  <div className="col-span-2 bg-white dark:bg-slate-800 p-2 rounded border border-blue-100 dark:border-blue-800 flex justify-between items-center mt-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Margin per {viewingProduct.sell_unit || viewingProduct.unit || 'Pcs'}:</span>
                    <span className={`font-bold ${((viewingProduct.sell_price || 0) - ((viewingProduct.buy_price || 0) / (viewingProduct.conversion_rate || 1))) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Rp {formatCurrency((viewingProduct.sell_price || 0) - ((viewingProduct.buy_price || 0) / (viewingProduct.conversion_rate || 1)))}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Produk</DialogTitle>
          </DialogHeader>
          <p>Apakah Anda yakin ingin menghapus produk <strong>{deleteProduct?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-products-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga Beli</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.sku || '-'}</TableCell>
                <TableCell>{p.barcode || '-'}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>Rp {formatCurrency(p.buy_price)}</TableCell>
                <TableCell>Rp {formatCurrency(p.sell_price)}</TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell>{p.unit || 'pcs'}</TableCell>
                <TableCell>{p.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
