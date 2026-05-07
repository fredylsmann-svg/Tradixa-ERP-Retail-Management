import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, Scan, Loader2, X, PackageOpen, LayoutGrid, Info, Plus, Boxes, Calendar, Clock, ArrowDownUp } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { NumberInput } from '@/components/ui/number-input';

const CATEGORIES = ['Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Kesehatan', 'Kecantikan', 'Rumah Tangga', 'Alat Tulis', 'Rokok', 'Sembako', 'Lainnya'];
const UNITS = ['Pcs', 'Batang', 'Bungkus', 'Sachet', 'Dus', 'Pack', 'Bal', 'Karton', 'Kg', 'Liter'];

export default function ProductForm({ open, onClose, product, storeId, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || null);
  const [showScanner, setShowScanner] = useState(false);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    barcode: product?.barcode || '', 
    sku: product?.sku || '', 
    name: product?.name || '',
    category: product?.category || 'Sembako', 
    location_name: product?.location_name || '',
    buy_unit: product?.buy_unit || 'Dus', 
    sell_unit: product?.sell_unit || 'Pcs',
    conversion_rate: product?.conversion_rate || 24,
    buy_price: product?.buy_price || 0,
    sell_price: product?.sell_price || 0,
    stock: product?.stock || 0,
    reorder_level: product?.reorder_level || 10, 
    tracking_type: product?.tracking_type || 'None',
    track_expiry: product?.track_expiry || false,
    default_shelf_life: product?.default_shelf_life || 365,
    issue_method: product?.issue_method || 'FIFO'
  });

  // Auto Generate SKU
  useEffect(() => {
    if (open && !product && (!formData.sku || formData.sku.startsWith('SKU-'))) {
      const catPrefix = formData.category.substring(0, 3).toUpperCase();
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      setFormData(prev => ({ ...prev, sku: `SKU-${catPrefix}-${randomStr}` }));
    }
  }, [open, product, formData.category]);

  useEffect(() => {
    if (open && storeId) {
      loadLocations();
    }
  }, [open, storeId]);

  const loadLocations = async () => {
    const data = await api.entities.ProductLocation.filter({ store_id: storeId });
    setLocations(data);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const getProductStatus = (stock, reorderLevel) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    let imageUrl = product?.image_url || '';
    if (imageFile) {
      const _uploadRes = await api.storage.upload(imageFile, 'product');
      imageUrl = _uploadRes.url;
    }
    
    const cogsPerUnit = Number(formData.buy_price) / Number(formData.conversion_rate); // HPP Eceran
    const status = getProductStatus(formData.stock, formData.reorder_level);
    
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 60 * 60000));
    const timestamp_wib = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()}, ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
    
    const productData = { 
      ...formData, 
      store_id: storeId, 
      image_url: imageUrl, 
      status, 
      conversion_rate: Number(formData.conversion_rate),
      buy_price: Number(formData.buy_price), 
      sell_price: Number(formData.sell_price), 
      cogs_per_unit: cogsPerUnit,
      stock: Number(formData.stock), 
      reorder_level: Number(formData.reorder_level),
      timestamp_wib
    };

    if (product?.id) {
      await api.entities.Product.update(product.id, productData);
    } else {
      await api.entities.Product.create(productData);
    }
    setIsLoading(false);
    onSuccess();
    onClose();
  };

  const [dynamicCategories, setDynamicCategories] = useState(CATEGORIES);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName && newCategoryName.trim()) {
      const trimmedCat = newCategoryName.trim();
      if (!dynamicCategories.includes(trimmedCat)) {
        setDynamicCategories(prev => [...prev, trimmedCat]);
      }
      setFormData(prev => ({ ...prev, category: trimmedCat }));
      setNewCategoryName('');
      setShowCustomCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          <DialogDescription>Masukkan detail barang belanjaan, atur konversi dari harga grosir ke eceran.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Barcode</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan atau input manual" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)}><Scan className="w-4 h-4" /></Button>
            </div>
          </div>
          <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onBarcodeScanned={(barcode) => setFormData({ ...formData, barcode })} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SKU (Kode Barang)</Label>
              <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="mt-1.5 font-mono text-sm" />
            </div>
            <div>
              <Label>Nama Produk *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Kategori</Label>
              <div className="mt-1.5">
                {showCustomCategory ? (
                  <div className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                    <Input 
                      placeholder="Nama kategori baru..." 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 border-blue-200 focus-visible:ring-blue-500"
                      autoFocus
                    />
                    <Button 
                      type="button" 
                      className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                      onClick={handleAddCategory}
                    >
                      Tambah
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => { setShowCustomCategory(false); setNewCategoryName(''); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{dynamicCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      title="Tambah Kategori Baru"
                      onClick={() => setShowCustomCategory(true)}
                      className="border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Lokasi / Rak Penyimpanan</Label>
              <Select value={formData.location_name} onValueChange={(v) => setFormData({ ...formData, location_name: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Pilih Lokasi Utama..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Lokasi</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                Metode Pelacakan Stok
                <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                  <div className="hidden group-hover:block absolute z-50 w-64 p-3 mt-1 text-[11px] text-white bg-slate-800 rounded-xl shadow-xl left-1/2 -translate-x-1/2 top-full">
                    <p className="font-bold mb-1">Batch Management:</p>
                    Cocok untuk makanan/obat. Memungkinkan pelacakan tanggal kadaluwarsa (Expired) per kloter barang masuk.
                  </div>
                </div>
              </Label>
              <Select value={formData.tracking_type} onValueChange={(v) => setFormData({ ...formData, tracking_type: v })}>
                <SelectTrigger className="mt-1.5 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Tanpa Pelacakan (Standard)</SelectItem>
                  <SelectItem value="Batch">Pelacakan Per Batch (Expired Date)</SelectItem>
                  <SelectItem value="Serial" disabled className="text-slate-400 italic">Serial Tracking (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === BATCH TRACKING RULES === */}
          {formData.tracking_type === 'Batch' && (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
              <h4 className="text-sm font-bold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <Boxes className="w-4 h-4" />
                Aturan Pelacakan Batch
              </h4>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 -mt-2 italic">
                Pengaturan ini menentukan bagaimana batch diperlakukan saat barang masuk dan keluar gudang.
              </p>

              <div className="grid grid-cols-3 gap-4">
                {/* Track Expiry */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Lacak Kadaluarsa?
                  </Label>
                  <Select value={formData.track_expiry ? 'yes' : 'no'} onValueChange={(v) => setFormData({ ...formData, track_expiry: v === 'yes' })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-900 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Ya — Wajib Input Expiry</SelectItem>
                      <SelectItem value="no">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Shelf Life */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Umur Simpan Default (Hari)
                  </Label>
                  <NumberInput
                    value={formData.default_shelf_life}
                    onChange={(e) => setFormData({ ...formData, default_shelf_life: e.target.value })}
                    className="mt-1.5 bg-white dark:bg-slate-900"
                    placeholder="365"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Auto-hitung expiry dari tanggal produksi</p>
                </div>

                {/* Issue Method */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <ArrowDownUp className="w-3 h-3" /> Metode Pengeluaran
                  </Label>
                  <Select value={formData.issue_method} onValueChange={(v) => setFormData({ ...formData, issue_method: v })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-900 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIFO">FIFO (First In First Out)</SelectItem>
                      <SelectItem value="FEFO">FEFO (First Expiry First Out)</SelectItem>
                      <SelectItem value="LIFO">LIFO (Last In First Out)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 mt-0.5">Prioritas batch saat stock out</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600"/> 
              Konversi & Harga Dasar
              <div className="group relative ml-1 inline-block">
                <Info className="w-4 h-4 text-slate-400 cursor-pointer hover:text-blue-500" />
                <div className="hidden group-hover:block absolute z-50 w-80 p-3 mt-1 text-xs text-white bg-slate-800 rounded shadow-lg left-1/2 -translate-x-1/2 top-full text-left space-y-2">
                  <p><strong>Panduan Pengisian:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Beli Box/Dus:</strong> Satuan Beli "Dus", Satuan Jual "Pcs", Konversi "24". Isi Harga Beli per Dus.</li>
                    <li><strong>Beli Pcs:</strong> Satuan Beli "Pcs", Satuan Jual "Pcs", Konversi "1". Isi Harga Beli per Pcs.</li>
                  </ul>
                  <p className="text-slate-300">HPP dan Margin dihitung otomatis per satuan jual.</p>
                </div>
              </div>
            </h4>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-4">
              <div>
                <Label className="text-xs">Satuan Kulakan (Beli)</Label>
                <Select value={formData.buy_unit} onValueChange={(v) => setFormData({ ...formData, buy_unit: v })}>
                  <SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-end pb-1 text-center text-slate-400 font-bold">
                DIKEMAS MENJADI &rarr;
              </div>
              <div>
                <Label className="text-xs">Satuan Jual (Eceran)</Label>
                <Select value={formData.sell_unit} onValueChange={(v) => setFormData({ ...formData, sell_unit: v })}>
                  <SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Harga Beli (per {formData.buy_unit})</Label>
                <NumberInput value={formData.buy_price} onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })} className="mt-1.5 bg-white" placeholder="Rp / Grosir" required />
              </div>
              <div>
                <Label className="text-xs text-blue-700 font-semibold">Konversi: 1 {formData.buy_unit} = X {formData.sell_unit}</Label>
                <NumberInput value={formData.conversion_rate} onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })} className="mt-1.5 bg-blue-50 border-blue-200 focus-visible:ring-blue-500" required />
              </div>
              <div>
                <Label className="text-xs">Harga Jual (1 {formData.sell_unit})</Label>
                <NumberInput value={formData.sell_price} onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })} className="mt-1.5 bg-white font-bold" placeholder="Rp / Eceran" required />
              </div>
            </div>

            {formData.buy_unit === 'Pcs' && Number(formData.conversion_rate) > 1 && (
              <div className="bg-amber-50 text-amber-600 p-3 rounded-lg text-xs flex items-start gap-2 border border-amber-200">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p><strong>Peringatan:</strong> Anda mengisi harga per Pcs tetapi konversi lebih dari 1. Ini bisa menyebabkan perhitungan HPP tidak akurat.</p>
              </div>
            )}
            
            <div className="text-xs text-slate-500 flex justify-between bg-white p-2 rounded border">
              <span>HPP Modal 1 {formData.sell_unit}: <b>Rp {Number(formData.conversion_rate) > 0 ? (Number(formData.buy_price) / Number(formData.conversion_rate)).toLocaleString('id-ID') : 0}</b></span>
              <span>Margin 1 {formData.sell_unit}: <b className={(Number(formData.sell_price) - (Number(formData.buy_price) / Number(formData.conversion_rate))) < 0 ? 'text-red-500' : 'text-emerald-500'}>Rp {(Number(formData.sell_price) - (Number(formData.buy_price) / Number(formData.conversion_rate))).toLocaleString('id-ID')}</b></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Stok Barang Aktif (Dalam {formData.sell_unit})</Label>
              <NumberInput value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Peringatan Sisa Stok Menipis</Label>
              <NumberInput value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Foto Produk</Label>
            <div className="mt-1.5">
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="product-image" />
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label htmlFor="product-image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="mt-2 text-sm text-slate-500">Upload Foto</span>
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Simpan Produk
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
