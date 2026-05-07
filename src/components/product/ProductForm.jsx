import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Scan, Loader2, X } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { NumberInput } from '@/components/ui/number-input';
import { useToast } from '@/components/ui/use-toast';
import { getPlanLimits } from '@/planConfig';

const CATEGORIES = ['Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Kesehatan', 'Kecantikan', 'Rumah Tangga', 'Alat Tulis', 'Lainnya'];
const UNITS = ['Pcs', 'Box', 'Kg', 'Liter', 'Pack', 'Lusin', 'Rim'];

export default function ProductForm({ open, onClose, product, storeId, onSuccess }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || null);
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    barcode: product?.barcode || '',
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || 'Lainnya',
    unit: product?.unit || 'Pcs',
    buy_price: product?.buy_price || 0,
    sell_price: product?.sell_price || 0,
    stock: product?.stock || 0,
    reorder_level: product?.reorder_level || 10,
    expired_date: product?.expired_date || ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeMB = 2; // Fixed limit as per requirements
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: `Maksimal ukuran foto adalah ${maxSizeMB}MB.`,
          variant: "destructive"
        });
        e.target.value = ''; // Reset input
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBarcodeScanned = (barcode) => {
    setFormData({ ...formData, barcode });
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
      const file_url = _uploadRes.url;
      imageUrl = file_url;
    }

    const status = getProductStatus(formData.stock, formData.reorder_level);
    const productData = {
      ...formData,
      store_id: storeId,
      image_url: imageUrl,
      status,
      buy_price: Number(formData.buy_price),
      sell_price: Number(formData.sell_price),
      stock: Number(formData.stock),
      reorder_level: Number(formData.reorder_level)
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Barcode</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan atau input manual"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setShowScanner(true)}
              >
                <Scan className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <BarcodeScanner 
            open={showScanner} 
            onClose={() => setShowScanner(false)}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Nama Produk *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama produk"
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Harga Beli</Label>
              <NumberInput
                value={formData.buy_price}
                onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                className="mt-1.5"
                placeholder="0"
              />
            </div>
            <div>
              <Label>Harga Jual *</Label>
              <NumberInput
                value={formData.sell_price}
                onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                className="mt-1.5"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Stok</Label>
              <NumberInput
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="mt-1.5"
                placeholder="0"
              />
            </div>
            <div>
              <Label>Reorder Level</Label>
              <NumberInput
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="mt-1.5"
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Expired (Opsional)</Label>
              <Input
                type="date"
                value={formData.expired_date}
                onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status Produk (Otomatis)</Label>
              <div className="mt-1.5 p-2.5 bg-slate-50 rounded-lg text-sm text-slate-500 italic">
                Status akan ditentukan berdasarkan stok
              </div>
            </div>
          </div>

          <div>
            <Label>Foto Produk</Label>
            <div className="mt-1.5">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="product-image"
              />
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="product-image"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="mt-2 text-sm text-slate-500">Upload Foto</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
