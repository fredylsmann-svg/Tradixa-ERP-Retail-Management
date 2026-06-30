import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Upload, Scan, Loader2, X, PackageOpen, LayoutGrid, Info, Plus, Boxes, Calendar, Clock, ArrowDownUp, Camera, Package, Sparkles, ScanBarcode, Barcode, Calculator, Trash2, DollarSign, Layers } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { NumberInput } from '@/components/ui/number-input';
import imageCompression from 'browser-image-compression';
import { getEffectiveLimits } from '@/planConfig';
import { supabase } from '@/lib/supabase';
import { toast as sonnerToast } from 'sonner';

const CATEGORIES = ['Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Kesehatan', 'Kecantikan', 'Rumah Tangga', 'Alat Tulis', 'Rokok', 'Sembako', 'Lainnya'];
export const UNITS = ['Pcs', 'Batang', 'Bungkus', 'Sachet', 'Dus', 'Pack', 'Bal', 'Karton', 'Kg', 'Liter'];

export default function ProductForm({ open, onClose, product, store, storeId, onSuccess, existingProducts = [] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || null);
  const [showScanner, setShowScanner] = useState(false);
  const [locations, setLocations] = useState([]);
  const [uomPrices, setUomPrices] = useState(product?.uom_prices || []);
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [showUomHelp, setShowUomHelp] = useState(false);
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

  // Sync formData + imagePreview when product changes (edit mode) or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
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
      setUomPrices(product?.uom_prices || []);
      setImagePreview(product?.image_url || null);
      setImageFile(null);
      setCustomUnitInput('');
      setShowCustomUnitInput(false);
    }
  }, [open, product]);

  // Sync base unit entry in uomPrices whenever sell_unit or sell_price changes
  useEffect(() => {
    if (!open) return;
    setUomPrices(prev => {
      const baseEntry = { unit: formData.sell_unit, qty_per_base: 1, sell_price: Number(formData.sell_price) || 0 };
      if (prev.length === 0) return [baseEntry];
      // Always update the first entry (base unit) to match sell_unit/sell_price
      return [baseEntry, ...prev.slice(1)];
    });
  }, [open, formData.sell_unit, formData.sell_price]);

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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // === VALIDASI UKURAN FILE (MAX 2MB) ===
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        sonnerToast.error(`Ukuran file ${sizeMB}MB melebihi batas maksimal 2MB. Silakan pilih foto dengan ukuran lebih kecil.`, { duration: 5000 });
        e.target.value = ''; // Reset input
        return;
      }

      try {
        const options = {
          maxSizeMB: 0.2, // ~200KB
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
        
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const getProductStatus = (stock, reorderLevel) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isDuplicate = existingProducts.some(p => 
      p.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      p.id !== product?.id
    );

    if (isDuplicate) {
      setShowDuplicateWarning(true);
      return;
    }

    await processSubmit();
  };

  const processSubmit = async () => {
    setIsLoading(true);

    // --- PRODUCT LIMIT CHECK (ONLY ON CREATE) ---
    const limits = getEffectiveLimits(store);
    if (!product?.id && limits.maxProducts !== Infinity) {
      if (existingProducts.length >= limits.maxProducts) {
        sonnerToast.error(`Kuota produk habis (${existingProducts.length}/${limits.maxProducts}). Silakan upgrade paket Anda untuk menambah produk.`, { duration: 5000 });
        setIsLoading(false);
        return;
      }
    }
    // ---------------------------------------------

    let imageUrl = product?.image_url || '';
    if (imageFile) {
      // --- PHOTO LIMIT CHECK ---
      if (limits.maxProductPhotos !== Infinity) {
        const { count: photoCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .not('image_url', 'is', null)
          .neq('image_url', '');
        if ((photoCount || 0) >= limits.maxProductPhotos) {
          sonnerToast.error(`Kuota foto produk habis (${photoCount}/${limits.maxProductPhotos}). Silakan upgrade paket Anda untuk menambah kuota.`, { duration: 5000 });
          setIsLoading(false);
          return;
        }
      }
      // --------------------------
      const _uploadRes = await api.storage.upload(imageFile, 'product');
      imageUrl = _uploadRes.url;
    }
    
    const cogsPerUnit = Number(formData.buy_price) / Number(formData.conversion_rate); // HPP Eceran
    const status = getProductStatus(formData.stock, formData.reorder_level);
    
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 60 * 60000));
    const timestamp_wib = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()}, ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
    
    // Clean uom_prices: ensure numbers and filter out invalid entries
    const cleanUomPrices = uomPrices
      .filter(u => u.unit && Number(u.qty_per_base) > 0)
      .map(u => ({
        unit: u.unit,
        qty_per_base: Number(u.qty_per_base),
        sell_price: Number(u.sell_price) || 0
      }));

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
      uom_prices: cleanUomPrices,
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
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          <DialogDescription>Masukkan detail barang belanjaan, atur konversi dari harga grosir ke eceran.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5">
              Barcode / Barcode Scanner
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-blue-500" />
                <div className="hidden group-hover:block absolute z-50 w-64 p-3 mt-1 text-[11px] text-white bg-slate-800 rounded-xl shadow-xl left-1/2 -translate-x-1/2 top-full font-normal">
                  <p className="font-bold mb-1">Integrasi Kasir (POS):</p>
                  Barcode ini terintegrasi penuh dengan modul Kasir (Sales/POS). Anda bisa scan kemasan produk langsung di kasir (pakai alat scanner atau kamera HP), lalu produk otomatis masuk ke keranjang belanja!
                </div>
              </div>
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan atau input manual" className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)}><Scan className="w-4 h-4" /></Button>
            </div>
          </div>
          <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onBarcodeScanned={(barcode) => setFormData({ ...formData, barcode })} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="cursor-pointer p-0.5 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-slate-100 outline-none focus:ring-2 focus:ring-blue-100">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-slate-800 text-white border-slate-700 text-[11px] p-3 shadow-xl rounded-xl z-[100]" side="top" align="center" sideOffset={5}>
                    <div className="space-y-2">
                      <div>
                        <p className="font-bold text-blue-300">Batch Management:</p>
                        <p className="text-slate-200">Cocok untuk makanan/obat. Memungkinkan pelacakan tanggal kadaluwarsa (Expired) per kloter barang masuk.</p>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-300">Serial Tracking (IMEI/SN):</p>
                        <p className="text-slate-200">Pelacakan ketat per unit barang. Membutuhkan <strong>Barcode Scanner</strong> saat barang tiba di <span className="font-semibold text-emerald-200">Inventory GRN</span> dan saat barang keluar di <span className="font-semibold text-emerald-200">Sales Transaction (Kasir)</span>.</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Label>
              <Select 
                value={formData.tracking_type} 
                onValueChange={(v) => {
                  if (v !== 'None') {
                    const isPaidPro = store?.plan === 'pro' && store?.has_used_trial === false;
                    const isPaidPremium = store?.plan === 'premium';
                    const isEnterprise = store?.plan === 'enterprise';
                    
                    if (!(isPaidPro || isPaidPremium || isEnterprise)) {
                      sonnerToast.error('Fitur Pelacakan Batch & Serial terkunci. Silakan upgrade paket Anda untuk menggunakan.', { duration: 5000 });
                      return; // Do not update state
                    }
                  }
                  setFormData({ ...formData, tracking_type: v });
                }}
              >
                <SelectTrigger className="mt-1.5 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Tanpa Pelacakan (Standard)</SelectItem>
                  <SelectItem value="Batch">Pelacakan Per Batch (Expired Date)</SelectItem>
                  <SelectItem value="Serial" className="font-medium">Pelacakan Per Serial (IMEI/SN)</SelectItem>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Satuan Kulakan (Beli)</Label>
                  <Select value={formData.buy_unit} onValueChange={(v) => setFormData({ ...formData, buy_unit: v })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-center items-center py-1 md:pb-1 md:py-0 md:justify-end text-center text-slate-400 font-bold">
                  <span className="md:hidden text-xs bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full mt-2 mb-1 shadow-sm border border-slate-200 dark:border-slate-700">DIKEMAS MENJADI &darr;</span>
                  <span className="hidden md:block">DIKEMAS MENJADI &rarr;</span>
                </div>
                <div>
                  <Label className="text-xs">Satuan Jual (Eceran)</Label>
                  <Select value={formData.sell_unit} onValueChange={(v) => setFormData({ ...formData, sell_unit: v })}>
                    <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Harga Beli (per {formData.buy_unit})</Label>
                  <NumberInput value={formData.buy_price} onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })} className="mt-1.5 bg-white dark:bg-slate-900" placeholder="Rp / Grosir" required />
                </div>
                <div>
                  <Label className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Konversi: 1 {formData.buy_unit} = X {formData.sell_unit}</Label>
                  <NumberInput value={formData.conversion_rate} onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })} className="mt-1.5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500" required />
                </div>
                <div>
                  <Label className="text-xs">Harga Jual (1 {formData.sell_unit})</Label>
                  <NumberInput value={formData.sell_price} onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })} className="mt-1.5 bg-white dark:bg-slate-900 font-bold" placeholder="Rp / Eceran" required />
                </div>
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

          {/* === MULTI-UOM BULK PRICING SECTION === */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
              Harga Grosir / Bulk Pricing
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Opsional</span>
              <div className="relative ml-1 inline-block">
                <Info 
                  className="w-4 h-4 text-slate-400 cursor-pointer hover:text-emerald-500 transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUomHelp(prev => !prev);
                  }}
                />
                {showUomHelp && (
                  <div className="absolute z-50 w-[90vw] md:w-[480px] p-4 mt-1 text-xs text-white bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl left-1/2 -translate-x-1/2 top-full text-left space-y-3 backdrop-blur-sm">
                    <p className="font-semibold text-sm border-b border-slate-700 pb-1.5 text-emerald-400 flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        Panduan Lengkap Konsep Multi-UoM
                      </span>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUomHelp(false);
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs px-2 py-0.5 rounded transition-colors"
                      >
                        ✕ Tutup
                      </button>
                    </p>
                    <div className="space-y-2.5 text-[11px] leading-relaxed">
                      <p className="text-slate-300">
                        Fitur ini memungkinkan Anda menjual produk dalam berbagai jenis satuan kemasan (Eceran, Pack, Dus, dll) secara dinamis, sementara <strong>stok fisik gudang tetap terhitung otomatis dalam satuan terkecil (Base Unit)</strong>.
                      </p>
                      
                      <div className="bg-slate-800/70 p-2.5 rounded-lg border border-slate-700/50 space-y-1">
                        <p className="font-semibold text-emerald-300">Studi Kasus & Contoh Simulasi: "Kopi ABC"</p>
                        
                        <div className="text-[10px] bg-slate-900/60 p-2 rounded text-slate-300 border border-slate-700/30 mb-2 leading-relaxed">
                          <strong>1. Alur Kulakan (Beli) dari Supplier:</strong>
                          <br/>Toko membeli Kopi ABC per <strong>Dus</strong> seharga <strong>Rp 120.000</strong> dengan konversi isi <strong>24 Pcs</strong>.
                          <br/>
                          <span className="text-emerald-400 font-semibold font-mono">&rarr; Modal HPP per Pcs = Rp 120.000 / 24 = Rp 5.000</span>
                        </div>

                        <p className="font-medium text-slate-200 text-[10px] pt-1"><strong>2. Pendaftaran Satuan Jual & Tingkat Grosir:</strong></p>
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                          <li><strong>Eceran (Base)</strong>: Dijual per <strong>Pcs</strong> seharga <strong>Rp 6.000</strong>.
                            <br/><span className="text-[10px] text-slate-400 font-mono">Modal HPP: Rp 5.000 | Untung/Margin: Rp 1.000</span>
                          </li>
                          <li><strong>Grosir Sedang (Pack)</strong>: Isi <strong>6 Pcs</strong> seharga <strong>Rp 33.000</strong>.
                            <br/><span className="text-[10px] text-slate-400 font-mono">Modal HPP: 6 × Rp 5.000 = Rp 30.000 | Untung: Rp 3.000</span>
                          </li>
                          <li><strong>Grosir Besar (Dus)</strong>: Isi <strong>24 Pcs</strong> seharga <strong>Rp 130.000</strong>.
                            <br/><span className="text-[10px] text-slate-400 font-mono">Modal HPP: 24 × Rp 5.000 = Rp 120.000 | Untung: Rp 10.000</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800/80 space-y-1 text-slate-300">
                        <p className="font-semibold text-slate-300">Kenapa Margin Bisa Rp 0 atau Minus?</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Minus (Merah)</strong>: Terjadi jika Anda baru menambah baris satuan tapi <strong>Harga Jual belum diisi</strong> (sistem menghitung: Harga Jual Rp 0 - Modal HPP = Minus/Rugi).</li>
                          <li><strong>Rp 0 (Hijau)</strong>: Terjadi jika Anda menjual barang grosir dengan harga yang <strong>sama persis dengan harga modal kulakan</strong> (Break Even Point / Pulang Modal).</li>
                        </ul>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 italic">
                        *Sistem kasir POS dan pemotongan stok otomatis di gudang akan berjalan sinkron berdasarkan rasio konversi di atas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </h4>

            {/* UoM Pricing Rows */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
              <div className="space-y-2 min-w-[500px] md:min-w-0">
                {uomPrices.map((uom, index) => {
                  const isBase = index === 0;
                  const hppPerBase = Number(formData.buy_price) / Number(formData.conversion_rate || 1);
                  const hppForUom = hppPerBase * Number(uom.qty_per_base || 1);
                  const marginForUom = Number(uom.sell_price || 0) - hppForUom;
                  const hargaPerUnit = Number(uom.qty_per_base) > 0 ? (Number(uom.sell_price) / Number(uom.qty_per_base)) : 0;

                  return (
                    <div key={index} className={`flex items-end gap-2 p-3 rounded-lg border ${
                      isBase 
                        ? 'bg-white/80 dark:bg-slate-900/50 border-emerald-200 dark:border-emerald-800/60' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}>
                      {/* Unit Name */}
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-[11px] text-slate-500">
                          Satuan {isBase && <span className="text-emerald-600 font-bold">(Base)</span>}
                        </Label>
                        {isBase ? (
                          <div className="mt-1.5 h-9 flex items-center px-3 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 rounded-md text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {uom.unit}
                          </div>
                        ) : (
                          <Select value={uom.unit} onValueChange={(v) => {
                            const updated = [...uomPrices];
                            updated[index] = { ...updated[index], unit: v };
                            setUomPrices(updated);
                          }}>
                            <SelectTrigger className="mt-1.5 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Qty per Base */}
                      <div className="w-[90px]">
                        <Label className="text-[11px] text-slate-500">Isi / Base</Label>
                        {isBase ? (
                          <div className="mt-1.5 h-9 flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-md text-sm font-semibold text-emerald-700">1</div>
                        ) : (
                          <NumberInput
                            value={uom.qty_per_base}
                            onChange={(e) => {
                              const updated = [...uomPrices];
                              updated[index] = { ...updated[index], qty_per_base: e.target.value };
                              setUomPrices(updated);
                            }}
                            className="mt-1.5 bg-white h-9 text-sm"
                            placeholder="6"
                          />
                        )}
                      </div>

                      {/* Sell Price */}
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-[11px] text-slate-500">Harga Jual</Label>
                        {isBase ? (
                          <div className="mt-1.5 h-9 flex items-center px-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm font-semibold text-emerald-700">
                            Rp {Number(uom.sell_price || 0).toLocaleString('id-ID')}
                          </div>
                        ) : (
                          <NumberInput
                            value={uom.sell_price}
                            onChange={(e) => {
                              const updated = [...uomPrices];
                              updated[index] = { ...updated[index], sell_price: e.target.value };
                              setUomPrices(updated);
                            }}
                            className="mt-1.5 bg-white h-9 text-sm"
                            placeholder="Rp"
                          />
                        )}
                      </div>

                      {/* Margin Info */}
                      <div className="w-[100px] text-center">
                        <Label className="text-[11px] text-slate-500">Margin</Label>
                        <div className={`mt-1.5 h-9 flex items-center justify-center rounded-md text-xs font-semibold ${
                          marginForUom < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                        }`}>
                          Rp {marginForUom.toLocaleString('id-ID')}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="w-[36px]">
                        {!isBase ? (
                          <button
                            type="button"
                            onClick={() => setUomPrices(prev => prev.filter((_, i) => i !== index))}
                            className="h-9 w-9 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : <div className="h-9" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Harga Per Unit Perbandingan */}
            {uomPrices.length > 1 && (
              <div className="text-[11px] text-slate-500 bg-white/60 rounded-lg p-2 border border-slate-100 space-y-0.5">
                <p className="font-medium text-slate-600 mb-1">Perbandingan harga per {formData.sell_unit}:</p>
                {uomPrices.map((uom, i) => {
                  const pricePerBase = Number(uom.qty_per_base) > 0 ? (Number(uom.sell_price) / Number(uom.qty_per_base)) : 0;
                  const basePrice = Number(uomPrices[0]?.sell_price) || 1;
                  const discount = basePrice > 0 ? ((1 - (pricePerBase / basePrice)) * 100) : 0;
                  return (
                    <div key={i} className="flex justify-between">
                      <span>{uom.unit} ({uom.qty_per_base} {formData.sell_unit})</span>
                      <span>
                        Rp {pricePerBase.toLocaleString('id-ID')}/{formData.sell_unit}
                        {i > 0 && discount > 0 && (
                          <span className="ml-1 text-emerald-600 font-medium">(-{discount.toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add UoM Row Button */}
            <div className="flex items-center gap-2">
              {!showCustomUnitInput ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setUomPrices(prev => [...prev, { unit: 'Pack', qty_per_base: '', sell_price: '' }]);
                    }}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-semibold py-1.5 px-3 rounded-lg hover:bg-emerald-100 transition-colors border border-dashed border-emerald-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Satuan Grosir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomUnitInput(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Satuan Custom
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <Input
                    value={customUnitInput}
                    onChange={(e) => setCustomUnitInput(e.target.value)}
                    placeholder="Ketik nama satuan baru (misal: Slop, Renceng)"
                    className="h-8 text-sm flex-1 bg-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customUnitInput.trim()) {
                          setUomPrices(prev => [...prev, { unit: customUnitInput.trim(), qty_per_base: '', sell_price: '' }]);
                          setCustomUnitInput('');
                          setShowCustomUnitInput(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      if (customUnitInput.trim()) {
                        setUomPrices(prev => [...prev, { unit: customUnitInput.trim(), qty_per_base: '', sell_price: '' }]);
                        setCustomUnitInput('');
                        setShowCustomUnitInput(false);
                      }
                    }}
                  >
                    Tambah
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => { setShowCustomUnitInput(false); setCustomUnitInput(''); }}
                  >
                    Batal
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* === END MULTI-UOM SECTION === */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

    {/* Duplicate Warning Dialog */}
    <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-600 flex items-center gap-2">
            <Info className="w-5 h-5" /> Peringatan
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Nama produk <strong>{formData.name}</strong> sudah terdaftar di sistem. Apakah Anda yakin ingin melanjutkan dan membuat duplikat?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDuplicateWarning(false)}>
            No, Batal
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
            setShowDuplicateWarning(false);
            processSubmit();
          }}>
            Yes, Lanjutkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
