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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import ProductForm from '@/components/products/ProductForm';
import BarcodePrintModal from '@/components/products/BarcodePrintModal';
import { formatNumber } from '@/components/utils/currencyFormatter';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import DataTablePagination from '@/components/ui/DataTablePagination';
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
  const [expandedRows, setExpandedRows] = useState({});
  const [printProducts, setPrintProducts] = useState([]); // Products to pass to modal
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalData, setTotalData] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { selectedDate, formattedDate } = useGlobalDate();
  const { toast } = useToast();

  const [showAddProductGuide, setShowAddProductGuide] = useState(false);
  const [showActionColumnGuide, setShowActionColumnGuide] = useState(false);
  const [readyForActionGuide, setReadyForActionGuide] = useState(false);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery !== debouncedSearch) setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
  }, [store, currentPage, pageSize, debouncedSearch, sortBy, filterCategory, filterStatus]);

  useEffect(() => {
    if (isLoading || !store?.id) return;
    const step = localStorage.getItem(`erp_tour_step_${store.id}`);
    if (step === '2') {
      const timer = setTimeout(() => setShowAddProductGuide(true), 1000);
      return () => clearTimeout(timer);
    } else if (step === '3' && products.length > 0 && !showForm) {
      if (window.innerWidth < 768) {
        localStorage.setItem(`erp_tour_step_${store.id}`, 'completed');
        return;
      }
      const timer = setTimeout(() => setReadyForActionGuide(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, products.length, store, showForm]);

  const dismissAddProductGuide = () => {
    setShowAddProductGuide(false);
    localStorage.setItem(`erp_tour_step_${store.id}`, 'completed');
  };

  const dismissActionGuide = () => {
    setShowActionColumnGuide(false);
    setReadyForActionGuide(false); // Fix: Mencegah popover muncul lagi terus-terusan
    if (store?.id) {
      localStorage.setItem(`erp_tour_step_${store.id}`, 'completed');
    }
  };

  useEffect(() => {
    if (readyForActionGuide && !showActionColumnGuide) {
      // Auto-scroll the table to the right on mobile so the Aksi column is visible FIRST
      const tableContainer = document.getElementById('print-products');
      if (tableContainer && window.innerWidth < 1024) {
        tableContainer.scrollTo({ left: tableContainer.scrollWidth, behavior: 'smooth' });
      }
      
      // Give it time to scroll before rendering the popover, avoiding collision math bugs
      const timer = setTimeout(() => setShowActionColumnGuide(true), 600);
      return () => clearTimeout(timer);
    }
  }, [readyForActionGuide, showActionColumnGuide]);

  const loadProducts = async () => {
    setIsLoading(true);

    const queryFilters = { store_id: store.id };
    if (filterCategory !== 'all') queryFilters.category = filterCategory;
    if (filterStatus !== 'all') queryFilters.status = filterStatus;

    const { data, totalCount } = await api.entities.Product.filter(
      queryFilters,
      sortBy,
      {
        page: currentPage,
        pageSize,
        ...(debouncedSearch ? { search: debouncedSearch, searchColumns: ['name', 'sku', 'barcode'] } : {})
      }
    );
    setProducts(data || []);
    setTotalData(totalCount || 0);

    const limits = getEffectiveLimits(store);
    if (limits.maxProducts !== Infinity) {
      const { totalCount: allTimeCount } = await api.entities.Product.filter(
        { store_id: store.id },
        null,
        { page: 1, pageSize: 1 }
      );
      setTotalProductCount(allTimeCount || 0);
    }
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

  const groupedProducts = [];
  const skuMap = {};
  
  currentProducts.forEach(p => {
    const key = p.sku || p.name || p.id;
    if (!skuMap[key]) {
      skuMap[key] = {
        masterId: p.id, // ID representatif untuk aksi master
        key: key,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        sell_price: p.sell_price,
        status: p.status,
        image_url: p.image_url,
        tracking_type: p.tracking_type,
        timestamp_wib: p.timestamp_wib,
        created_at: p.created_at,
        totalStock: 0,
        locations: []
      };
      groupedProducts.push(skuMap[key]);
    }
    skuMap[key].totalStock += Number(p.stock) || 0;
    skuMap[key].locations.push(p);
  });

  const toggleExpand = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredProducts = groupedProducts;

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
            
            store={store}
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
                  if (limits.maxProducts !== Infinity && totalProductCount >= limits.maxProducts) {
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
                <div className="absolute top-full right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-0 mt-4 w-[calc(100vw-2rem)] max-w-[300px] sm:w-[300px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-[60] cursor-default border border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 text-left">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-[20px] sm:translate-x-0 w-3 h-3 bg-slate-900 border-t border-l border-slate-700/50 rotate-45" />
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
                        className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg active:scale-95"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-slate-50 border-slate-200"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-11 bg-slate-50 border-slate-200 text-slate-600">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">A-Z (Nama)</SelectItem>
                  <SelectItem value="-created_at">Terbaru</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 px-4 bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 relative">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    {(filterCategory !== 'all' || filterStatus !== 'all') && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 leading-none">Filter Data</h4>
                    <p className="text-sm text-slate-500">Saring tabel master produk.</p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Kategori</label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            <SelectItem value="Sembako">Sembako</SelectItem>
                            <SelectItem value="Minuman">Minuman</SelectItem>
                            <SelectItem value="Makanan">Makanan</SelectItem>
                            <SelectItem value="Kebutuhan Rumah">Kebutuhan Rumah</SelectItem>
                            <SelectItem value="Produk Beku">Produk Beku</SelectItem>
                            <SelectItem value="Kosmetik">Kosmetik</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Status Stok</label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="In Stock">In Stock</SelectItem>
                            <SelectItem value="Low Stock">Low Stock</SelectItem>
                            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="w-full mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setFilterCategory('all');
                          setFilterStatus('all');
                        }}
                      >
                        Reset Filter
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
                  <TableHead>Gudang Utama</TableHead>
                  <TableHead>Rak Penyimpanan</TableHead>
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
                      <TableCell colSpan={12}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Boxes className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Tidak ada produk ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((group, idx) => (
                    <React.Fragment key={group.key}>
                      <TableRow className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${showActionColumnGuide && idx === 0 ? "relative z-[60] bg-white dark:bg-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.15)] ring-2 ring-blue-500/20" : ""}`}>
                        <TableCell>
                          {showActionColumnGuide && idx === 0 && (
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] animate-in fade-in duration-300" onClick={dismissActionGuide} style={{margin: 0}} />
                          )}
                          <Checkbox 
                            checked={selectedProductIds.includes(group.masterId)}
                            onCheckedChange={() => toggleSelectProduct(group.masterId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>
                          {group.image_url ? (
                            <img src={group.image_url} alt={group.name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                              No Img
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{group.sku || '-'}</TableCell>
                        <TableCell>{group.barcode || '-'}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white relative">
                          <div className="flex items-center relative">
                            {group.locations.length > 1 && (
                              <Button variant="ghost" size="icon" className="absolute -left-7 h-6 w-6 shrink-0" onClick={() => toggleExpand(group.key)}>
                                <ChevronRight className={`w-4 h-4 transition-transform ${expandedRows[group.key] ? 'rotate-90' : ''}`} />
                              </Button>
                            )}
                            <span>{group.name}</span>
                          </div>
                          <div className="mt-1">
                            {group.tracking_type === 'Batch' ? (
                              <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase tracking-widest py-0.5 px-1.5 rounded-sm whitespace-nowrap">
                                Batch Tracking
                              </Badge>
                            ) : group.tracking_type === 'Serial' ? (
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
                        <TableCell className="text-slate-600 dark:text-slate-300">{group.category}</TableCell>
                        <TableCell>
                          {(() => {
                            const uniqueWhs = [...new Set(group.locations.map(l => l.warehouse_name).filter(Boolean))];
                            if (uniqueWhs.length > 1) return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 shadow-sm text-[10px]">Multi-Gudang</Badge>;
                            if (uniqueWhs.length === 1) return uniqueWhs[0];
                            return '-';
                          })()}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {(() => {
                            const uniqueRacks = [...new Set(group.locations.map(l => l.location_name).filter(Boolean))];
                            if (uniqueRacks.length > 1) return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 shadow-sm text-[10px]">Multi-Rak</Badge>;
                            if (uniqueRacks.length === 1) return uniqueRacks[0];
                            return '-';
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-medium">Rp {formatCurrency(group.sell_price)}</TableCell>
                        <TableCell className={`text-center font-bold ${group.totalStock === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {group.totalStock}
                        </TableCell>
                        <TableCell>{getStatusBadge(group.status)}</TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{group.timestamp_wib || group.created_at?.split('T')[0] || '-'}</TableCell>
                        <TableCell>
                          <Popover open={showActionColumnGuide && idx === 0}>
                            <PopoverTrigger asChild>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setPrintProducts([group.locations[0]])} title="Cetak Barcode">
                                  <Printer className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setViewingProduct(group.locations[0])}>
                                  <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(group.locations[0]); setShowForm(true); }}>
                                  <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(group.locations[0])}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent 
                              side="left" 
                              align="center" 
                              sideOffset={16}
                              className="z-[70] w-[calc(100vw-2rem)] sm:w-[320px] max-w-[320px] bg-slate-900 text-white p-4 rounded-xl shadow-2xl border-slate-700/50 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto"
                              collisionPadding={16}
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
                                    className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                  >
                                    Mengerti & Selesai
                                  </button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>

                      {expandedRows[group.key] && group.locations.length > 1 && group.locations.map((loc, childIdx) => (
                        <TableRow key={loc.id} className="bg-slate-50/80 dark:bg-slate-800/30 border-l-[3px] border-l-slate-400 shadow-inner">
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="pl-6 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-serif">↳</span>
                              <span className="italic">Varian Lokasi</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">{loc.warehouse_name || '-'}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{loc.location_name || '-'}</TableCell>
                          <TableCell className="text-right text-sm">Rp {formatCurrency(loc.sell_price)}</TableCell>
                          <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">{loc.stock}</TableCell>
                          <TableCell>{getStatusBadge(loc.status)}</TableCell>
                          <TableCell className="text-xs text-slate-500">{loc.timestamp_wib || loc.created_at?.split('T')[0] || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                               <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(loc); setShowForm(true); }} className="h-8 w-8 hover:bg-white">
                                 <Pencil className="w-3.5 h-3.5 text-slate-500" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(loc)} className="h-8 w-8 hover:bg-red-50">
                                 <Trash2 className="w-3.5 h-3.5 text-red-500" />
                               </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {!isLoading && (
            <DataTablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalData={totalData}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
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
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Gudang Utama</p><p className="font-medium">{viewingProduct.warehouse_name || '-'}</p></div>
                <div><p className="text-sm text-slate-500 dark:text-slate-400">Rak Penyimpanan</p><p className="font-medium">{viewingProduct.location_name || '-'}</p></div>
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

              {/* Multi-UoM Pricing Table */}
              {viewingProduct.uom_prices && viewingProduct.uom_prices.length > 1 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl space-y-3">
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm border-b border-emerald-200 dark:border-emerald-700 pb-2 flex items-center gap-2">
                    <Boxes className="w-4 h-4" /> Harga Jual Multi-UoM (Grosir)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-emerald-200 dark:border-emerald-700">
                          <th className="pb-2 font-medium">Satuan</th>
                          <th className="pb-2 font-medium text-center">Isi per Base</th>
                          <th className="pb-2 font-medium text-right">Harga Jual</th>
                          <th className="pb-2 font-medium text-right">HPP</th>
                          <th className="pb-2 font-medium text-right">Margin</th>
                          <th className="pb-2 font-medium text-right">Per {viewingProduct.sell_unit || 'Pcs'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingProduct.uom_prices.map((uom, idx) => {
                          const hppPerBase = (viewingProduct.buy_price || 0) / (viewingProduct.conversion_rate || 1);
                          const hppForUom = hppPerBase * (uom.qty_per_base || 1);
                          const marginForUom = (uom.sell_price || 0) - hppForUom;
                          const pricePerBase = uom.qty_per_base > 0 ? (uom.sell_price / uom.qty_per_base) : 0;
                          return (
                            <tr key={idx} className={`border-b border-emerald-100 dark:border-emerald-800 last:border-0 ${idx === 0 ? 'bg-emerald-100/50 dark:bg-emerald-900/50 font-semibold' : ''}`}>
                              <td className="py-2">
                                {uom.unit}
                                {idx === 0 && <span className="ml-1.5 text-[10px] bg-emerald-200 dark:bg-emerald-700 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full">Base</span>}
                              </td>
                              <td className="py-2 text-center">{uom.qty_per_base} {viewingProduct.sell_unit || 'Pcs'}</td>
                              <td className="py-2 text-right">Rp {formatCurrency(uom.sell_price)}</td>
                              <td className="py-2 text-right text-slate-500">Rp {formatCurrency(hppForUom)}</td>
                              <td className={`py-2 text-right font-medium ${marginForUom < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                Rp {formatCurrency(marginForUom)}
                              </td>
                              <td className="py-2 text-right text-slate-500">Rp {formatCurrency(pricePerBase)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
            {currentProducts.map((p) => (
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
