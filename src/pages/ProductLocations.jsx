import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Pencil, Trash2, MapPin, Loader2, Columns3, Info, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import PremiumGate from '@/components/ui/PremiumGate';

export default function ProductLocations({ store }) {
  const { toast } = useToast();
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deleteLocation, setDeleteLocation] = useState(null);
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    type: 'rack',
    address: '',
    postal_code: '',
    coordinates: '',
    reference: ''
  });

  useEffect(() => {
    if (store?.id) loadLocations();
  }, [store]);

  const loadLocations = async () => {
    const [locData, prodData] = await Promise.all([
      api.entities.ProductLocation.filter({ store_id: store.id }),
      api.entities.Product.filter({ store_id: store.id })
    ]);
    setLocations(locData);
    setProducts(prodData);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const data = { ...formData, store_id: store.id };

    if (editingLocation) {
      await api.entities.ProductLocation.update(editingLocation.id, data);
    } else {
      await api.entities.ProductLocation.create(data);
    }

    setIsSaving(false);
    setShowForm(false);
    setEditingLocation(null);
    setFormData({ name: '', description: '', type: 'rack', address: '', postal_code: '', coordinates: '', reference: '' });
    loadLocations();
  };

  const handleEdit = (loc) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      description: loc.description || '',
      type: loc.type || 'rack',
      address: loc.address || '',
      postal_code: loc.postal_code || '',
      coordinates: loc.coordinates || '',
      reference: loc.reference || ''
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.ProductLocation.delete(deleteLocation.id);
    setDeleteLocation(null);
    loadLocations();
  };

  const captureCoordinates = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolokasi Tidak Didukung",
        description: "Browser Anda tidak mendukung fitur lokasi.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ ...formData, coordinates: `${pos.coords.latitude}, ${pos.coords.longitude}` });
        setIsCapturing(false);
        toast({
          title: "Lokasi Ditemukan",
          description: "Koordinat berhasil didapatkan.",
        });
      },
      (err) => {
        console.error(err);
        let msg = "Gagal mengambil lokasi.";
        if (err.code === 1) msg = "Izin lokasi ditolak. Harap aktifkan izin lokasi di browser.";
        if (err.code === 2) msg = "Posisi tidak tersedia di perangkat ini (Sering terjadi di komputer Desktop/Mac tanpa GPS).";
        if (err.code === 3) msg = "Waktu pengambilan lokasi habis.";
        
        toast({
          title: "Gagal Mengambil Lokasi",
          description: msg,
          variant: "destructive"
        });
        setIsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stores = locations.filter(l => l.type === 'store');
  const racks = locations.filter(l => l.type === 'rack' || !l.type);
  const salesLocations = locations.filter(l => l.type === 'sales');

  const filterList = (list) => list.filter(l =>
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20" id="print-location-settings">
      <PageHeader
        title="Location Settings"
        subtitle="Kelola titik lokasi gudang/toko dan rak penyimpanan internal"
        icon={MapPin}
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Location Settings', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-location-settings')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Location Settings', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-location-settings')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Location Settings', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-location-settings')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            <Button onClick={() => { setEditingLocation(null); setFormData({ name: '', description: '', type: 'store', address: '', postal_code: '', coordinates: '', reference: '' }); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-4 md:px-6 font-semibold rounded-xl text-white whitespace-nowrap w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Gudang/Toko
            </Button>
            <Button onClick={() => { setEditingLocation(null); setFormData({ name: '', description: '', type: 'rack', address: '', postal_code: '', coordinates: '', reference: '' }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-4 md:px-6 font-semibold rounded-xl text-white whitespace-nowrap w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Rak
            </Button>
            <Button onClick={() => { setEditingLocation(null); setFormData({ name: '', description: '', type: 'sales', address: '', postal_code: '', coordinates: '', reference: '' }); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600 h-11 px-4 md:px-6 font-semibold rounded-xl text-white whitespace-nowrap w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Lokasi Penjualan
            </Button>
          </div>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari lokasi atau rak..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Section 1: Lokasi Penyimpanan (Gudang/Toko) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Lokasi Penyimpanan (Gudang/Toko)</h2>
        </div>
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Gudang/Toko</TableHead>
                <TableHead>Alamat & Kode Pos</TableHead>
                <TableHead>Ref / Asal</TableHead>
                <TableHead>Isi Barang</TableHead>
                <TableHead className="text-center">Total Unit</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(2).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filterList(stores).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400 italic text-sm">
                    Belum ada lokasi gudang/toko ditambahkan
                  </TableCell>
                </TableRow>
              ) : (
                filterList(stores).map((loc, idx) => (
                  <TableRow key={loc.id}>
                    <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{loc.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">{loc.address || '-'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{loc.postal_code}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{loc.reference || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const locProducts = products.filter(p => p.warehouse_name === loc.name);
                        if (locProducts.length === 0) return <span className="text-[10px] text-slate-300 italic">Kosong</span>;
                        return (
                          <div className="flex flex-wrap gap-1 max-w-[220px] py-1">
                            {locProducts.slice(0, 2).map(p => (
                              <div key={p.id} className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold whitespace-nowrap uppercase tracking-tighter">
                                {p.name}
                              </div>
                            ))}
                            {locProducts.length > 2 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-black cursor-pointer flex items-center gap-0.5">
                                    <Info className="w-2.5 h-2.5" />
                                    +{locProducts.length - 2}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="w-[200px] p-2 bg-slate-900 text-white border-none rounded-lg shadow-xl z-50">
                                  <p className="text-[10px] font-bold leading-relaxed">
                                    {locProducts.slice(2).map(p => p.name).join(', ')}
                                  </p>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const totalQty = products.filter(p => p.warehouse_name === loc.name).reduce((sum, p) => sum + (p.stock || 0), 0);
                        return <span className={`font-black text-sm ${totalQty > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{totalQty}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {loc.coordinates ? (
                        <a
                          href={`https://www.google.com/maps?q=${loc.coordinates.replace(/\s/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-medium"
                        >
                          <MapPin className="w-3 h-3" /> {loc.coordinates}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(loc)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteLocation(loc)} className="h-8 w-8 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Section 2: Rak Penyimpanan */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Columns3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Rak Penyimpanan</h2>
        </div>
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Rak</TableHead>
                <TableHead>Ref / Asal</TableHead>
                <TableHead>Isi Barang</TableHead>
                <TableHead className="text-center">Total Unit</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(2).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
              ) : filterList(racks).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 italic text-sm">
                    Belum ada rak penyimpanan ditambahkan
                  </TableCell>
                </TableRow>
              ) : (
                filterList(racks).map((loc, idx) => (
                  <TableRow key={loc.id}>
                    <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{loc.name}</TableCell>
                    <TableCell>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{loc.reference || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const locProducts = products.filter(p => p.location_name === loc.name);
                        if (locProducts.length === 0) return <span className="text-[10px] text-slate-300 italic">Kosong</span>;
                        return (
                          <div className="flex flex-wrap gap-1 max-w-[220px] py-1">
                            {locProducts.slice(0, 2).map(p => (
                              <div key={p.id} className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold whitespace-nowrap uppercase tracking-tighter">
                                {p.name}
                              </div>
                            ))}
                            {locProducts.length > 2 && (
                              <div 
                                className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-black cursor-help flex items-center gap-0.5"
                                title={locProducts.slice(2).map(p => p.name).join(', ')}
                              >
                                <Info className="w-2.5 h-2.5" />
                                +{locProducts.length - 2}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const totalQty = products.filter(p => p.location_name === loc.name).reduce((sum, p) => sum + (p.stock || 0), 0);
                        return <span className={`font-black text-sm ${totalQty > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{totalQty}</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-slate-500">{loc.description || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(loc)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteLocation(loc)} className="h-8 w-8 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Section 3: Lokasi Penjualan */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Lokasi Penjualan</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors outline-none">
                <Info className="w-4 h-4 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-4 bg-slate-900 text-white border-none rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="space-y-2">
                <p className="text-xs font-bold text-orange-400">Apa itu Lokasi Penjualan?</p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Digunakan untuk mencatat di mana transaksi terjadi. Cocok untuk:<br/>
                  • <span className="text-white font-bold">Multi-cabang</span> — catat penjualan per outlet/toko<br/>
                  • <span className="text-white font-bold">Sales lapangan</span> — lacak lokasi penjualan berpindah + GPS otomatis
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Lokasi</TableHead>
                <TableHead>Alamat & Kode Pos</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(2).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
              ) : filterList(salesLocations).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic text-sm">
                    Belum ada lokasi penjualan ditambahkan
                  </TableCell>
                </TableRow>
              ) : (
                filterList(salesLocations).map((loc, idx) => (
                  <TableRow key={loc.id}>
                    <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{loc.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">{loc.address || '-'}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{loc.postal_code}</div>
                    </TableCell>
                    <TableCell>
                      {loc.coordinates ? (
                        <a
                          href={`https://www.google.com/maps?q=${loc.coordinates.replace(/\s/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-medium"
                        >
                          <MapPin className="w-3 h-3" /> {loc.coordinates}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">{loc.description || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(loc)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteLocation(loc)} className="h-8 w-8 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.type === 'store' ? <MapPin className="w-5 h-5 text-emerald-500" /> : formData.type === 'sales' ? <Store className="w-5 h-5 text-orange-500" /> : <Columns3 className="w-5 h-5 text-blue-500" />}
              {editingLocation ? 'Edit' : 'Tambah'} {formData.type === 'store' ? 'Gudang/Toko' : formData.type === 'sales' ? 'Lokasi Penjualan' : 'Rak'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">{formData.type === 'store' ? 'Nama Lokasi (Gudang/Toko) *' : formData.type === 'sales' ? 'Nama Lokasi Penjualan *' : 'Nama Rak *'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.type === 'store' ? "Misal: Gudang Pusat" : formData.type === 'sales' ? "Misal: Toko Cabang Utara, Booth Pasar" : "Misal: Rak A-1"}
                required
              />
            </div>

            {(formData.type === 'store' || formData.type === 'sales') ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400">Alamat</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Alamat lengkap lokasi..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Kode Pos</Label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="Contoh: 12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Koordinat</Label>
                    <div className="flex gap-1">
                      <Input
                        value={formData.coordinates}
                        onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                        placeholder="lat, long"
                        className="text-xs"
                      />
                      <Button 
                        type="button" 
                        size="icon" 
                        onClick={captureCoordinates} 
                        variant="outline" 
                        className="shrink-0" 
                        title="Ambil Lokasi Saat Ini"
                        disabled={isCapturing}
                      >
                        {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {formData.type === 'sales' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Keterangan</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Misal: Toko cabang utara, area pasar"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Keterangan</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Misal: Lantai 1, Dekat Pintu"
                />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving} className={formData.type === 'store' ? 'bg-emerald-600 hover:bg-emerald-700' : formData.type === 'sales' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteLocation} onOpenChange={() => setDeleteLocation(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Lokasi</DialogTitle></DialogHeader>
          <p>Yakin ingin menghapus {deleteLocation?.type === 'store' ? 'lokasi' : 'rak'} <strong>{deleteLocation?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLocation(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
