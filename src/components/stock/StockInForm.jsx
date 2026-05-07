import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Calculator } from 'lucide-react';
import { NumberInput } from '@/components/ui/number-input';

const STOCK_TYPES = ['KULAKAN (Purchase)', 'GRN', 'Return', 'Adjustment'];

export default function StockInForm({ open, onClose, storeId, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    stock_type: 'KULAKAN (Purchase)',
    product_id: '',
    quantity_buy_unit: '',
    deal_total_price: '',
    expired_date: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (open && storeId) {
      loadProducts();
    }
  }, [open, storeId]);

  const loadProducts = async () => {
    const data = await api.entities.Product.filter({ store_id: storeId });
    setProducts(data);
  };

  const handleProductSelect = (pid) => {
    const prod = products.find(p => p.id === pid);
    setSelectedProduct(prod);
    setFormData({ ...formData, product_id: pid, quantity_buy_unit: '', deal_total_price: '' });
  };

  const handleQuantityChange = (val) => {
    const qty = Number(val);
    const standardTotal = selectedProduct ? (selectedProduct.buy_price * qty) : 0;
    setFormData({ ...formData, quantity_buy_unit: val, deal_total_price: standardTotal.toString() });
  };

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    
    const day = String(wibTime.getDate()).padStart(2, '0');
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const year = wibTime.getFullYear();
    const hours = String(wibTime.getHours()).padStart(2, '0');
    const minutes = String(wibTime.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes} WIB`;
  };

  const generateReference = () => {
    const now = new Date();
    return `PO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsLoading(true);

    try {
      const reference = formData.reference || generateReference();
      const qtyBuyUnit = Number(formData.quantity_buy_unit);
      
      // Hitung konversi qty ke eceran (Stok Tersimpan adalah Eceran)
      const isRetailUnit = formData.selected_unit === selectedProduct.sell_unit;
      const convRate = isRetailUnit ? 1 : (selectedProduct.conversion_rate || 1);
      const qtyPcs = qtyBuyUnit * convRate; 
      
      const dealValue = Number(formData.deal_total_price);
      const standardValue = selectedProduct.buy_price * qtyBuyUnit;
      const discount = standardValue - dealValue; // Potongan Nego Dagang
      const actualHppPerPcs = dealValue / qtyPcs;

      await api.entities.StockMovement.create({
        store_id: storeId,
        reference,
        product_id: formData.product_id,
        product_name: selectedProduct.name,
        movement_type: 'in',
        stock_type: formData.stock_type,
        quantity: qtyPcs,
        expired_date: formData.expired_date || null,
        notes: formData.notes + (discount > 0 ? ` (Disc: Rp ${discount.toLocaleString('id-ID')})` : ''),
        timestamp_wib: getWIBTimestamp()
      });

      // Update product stock and re-average the COGS based loosely
      const newStock = (selectedProduct.stock || 0) + qtyPcs;
      const status = newStock <= 0 ? 'Out of Stock' : newStock <= selectedProduct.reorder_level ? 'Low Stock' : 'In Stock';
      
      await api.entities.Product.update(formData.product_id, { 
        stock: newStock, 
        status, 
        cogs_per_unit: actualHppPerPcs // Update HPP real saat ini
      });

      // === INTEGRASI JURNAL AKUNTANSI (PURCHASE LOGIC) ===
      if (formData.stock_type === 'KULAKAN (Purchase)') {
        // [Skenario]: Nilai Persediaan yang dicatat adalah netto (Harga Deal Aktual)
        
        // 1. Debit: Persediaan Barang
        await api.entities.JournalEntry.create({
          transaction_id: reference,
          date: new Date().toISOString().split('T')[0],
          account_name: 'Persediaan Barang Dagang',
          account_type: 'Aset',
          debit: dealValue,
          credit: 0,
          description: `Stok Masuk: ${selectedProduct.name} (${qtyBuyUnit} ${selectedProduct.buy_unit || 'Dus'})`
        });

        // 2. Kredit: Kas
        await api.entities.JournalEntry.create({
          transaction_id: reference,
          date: new Date().toISOString().split('T')[0],
          account_name: 'Kas',
          account_type: 'Aset',
          debit: 0,
          credit: dealValue,
          description: `Pembelian Tunai: ${selectedProduct.name} ${discount > 0 ? '(Harga Nego)' : ''}`
        });

        // Catat sebagai expense khusus inventori untuk Laporan Arus Kas Keluar
        await api.entities.Expense.create({
          date: new Date().toISOString().split('T')[0],
          category: 'Pembelian Produk (HPP)',
          amount: dealValue,
          notes: `Restock: ${selectedProduct.name} - ${reference}`
        });
      }

      console.log('Stok berhasil ditambahkan dan masuk ke Jurnal.');
      setIsLoading(false);
      setFormData({ stock_type: 'KULAKAN (Purchase)', product_id: '', quantity_buy_unit: '', deal_total_price: '', expired_date: '', reference: '', notes: '' });
      setSelectedProduct(null);
      onSuccess();
      onClose();

    } catch (err) {
      window.alert(err.message);
      setIsLoading(false);
    }
  };

  const standardTotal = selectedProduct ? (selectedProduct.buy_price * Number(formData.quantity_buy_unit)) : 0;
  const isNegotiated = standardTotal > 0 && Number(formData.deal_total_price) < standardTotal;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Stok Masuk & Kulakan</DialogTitle>
          <DialogDescription>Tambahkan stok ke gudang. Jurnal akuntansi pembelian akan tercatat secara otomatis menggunakan nilai aktual net.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <Label>Jenis Transaksi</Label>
              <Select value={formData.stock_type} onValueChange={(v) => setFormData({ ...formData, stock_type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pilih Produk (Dari Master)</Label>
              <Select value={formData.product_id} onValueChange={handleProductSelect}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (Stok: {p.stock} {p.sell_unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProduct && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jumlah Dibeli</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <NumberInput
                      value={formData.quantity_buy_unit}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      placeholder="0"
                      required
                      className="flex-1 h-11 text-lg"
                    />
                    <Select 
                      value={formData.selected_unit || selectedProduct.buy_unit || 'pcs'} 
                      onValueChange={(v) => setFormData({ ...formData, selected_unit: v })}
                    >
                      <SelectTrigger className="w-28 h-11 bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const units = new Set();
                          if (selectedProduct.buy_unit) units.add(selectedProduct.buy_unit);
                          if (selectedProduct.sell_unit) units.add(selectedProduct.sell_unit);
                          if (selectedProduct.unit) units.add(selectedProduct.unit);
                          
                          // If no units found at all, add a default
                          if (units.size === 0) units.add('Pcs');
                          
                          return Array.from(units).map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Calculator className="w-3 h-3 mr-1"/> 
                    {formData.selected_unit === selectedProduct.sell_unit ? (
                      `Input dalam satuan eceran (${selectedProduct.sell_unit || selectedProduct.unit || 'Pcs'})`
                    ) : (
                      `Otomatis dikonversi jadi ${(Number(formData.quantity_buy_unit) * (selectedProduct.conversion_rate || 1)).toLocaleString('id-ID')} ${selectedProduct.sell_unit || selectedProduct.unit || 'Pcs'} di gudang`
                    )}
                  </p>
                </div>

                <div>
                  <Label>Total Harga Aktual / Deal (Nego)</Label>
                  <div className="mt-1.5 relative">
                    <NumberInput
                      value={formData.deal_total_price}
                      onChange={(e) => setFormData({ ...formData, deal_total_price: e.target.value })}
                      placeholder="Total Uang Keluar Asli"
                      required
                      className={isNegotiated ? "border-emerald-300 ring-emerald-100 bg-emerald-50 text-emerald-800" : ""}
                    />
                  </div>
                  {isNegotiated ? (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      Potongan Harga: -Rp {(standardTotal - Number(formData.deal_total_price)).toLocaleString('id-ID')} dicatat ke kas!
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Ekspektasi Total Pemasok: Rp {standardTotal.toLocaleString('id-ID')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Expired (Khusus Batch)</Label>
              <Input
                type="date"
                value={formData.expired_date}
                onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Nomor Faktur / Ref (Otomatis)</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Misal: INV-SUP-2023"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Catatan</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading || !formData.product_id || !formData.quantity_buy_unit}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Proses Kulakan ke Jurnal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
