import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Upload, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { Package } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { getEffectiveLimits } from '@/planConfig';

const STOCK_OUT_TYPES = ['Sales', 'Damaged', 'Return', 'Adjustment', 'Transfer'];

export default function StockOut({ store }) {
  const [allMovements, setAllMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();
  const [formData, setFormData] = useState({
    stock_type: 'Sales',
    product_id: '',
    quantity: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (store?.id) {
      loadData();
    }
  }, [store]);

  const handleOpenForm = () => {
    const limits = getEffectiveLimits(store);
    if (limits.maxStockOut !== Infinity && allMovements.length >= limits.maxStockOut) {
      sonnerToast.error(`Kuota Stock Out habis (${allMovements.length}/${limits.maxStockOut}). Silakan upgrade paket Anda untuk menambah kuota.`, { duration: 5000 });
      return;
    }
    setShowForm(true);
  };

  const loadData = async () => {
    const [movementsData, productsData] = await Promise.all([
      api.entities.StockMovement.filter({ store_id: store.id, movement_type: 'out' }, '-created_date'),
      api.entities.Product.filter({ store_id: store.id })
    ]);
    setAllMovements(movementsData);
    setProducts(productsData);
    setIsLoading(false);
  };

  const movements = allMovements.filter(m => matchesDate(m, selectedDate));

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
    return `OUT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const reference = formData.reference || generateReference();

    await api.entities.StockMovement.create({
      store_id: store.id,
      reference,
      product_id: formData.product_id,
      product_name: selectedProduct?.name || '',
      movement_type: 'out',
      stock_type: formData.stock_type,
      quantity: Number(formData.quantity),
      notes: formData.notes,
      timestamp_wib: getWIBTimestamp()
    });

    const newStock = Math.max(0, (selectedProduct?.stock || 0) - Number(formData.quantity));
    const status = newStock <= 0 ? 'Out of Stock' : newStock <= selectedProduct?.reorder_level ? 'Low Stock' : 'In Stock';
    await api.entities.Product.update(formData.product_id, { stock: newStock, status });

    setIsSaving(false);
    setShowForm(false);
    setFormData({ stock_type: 'Sales', product_id: '', quantity: '', reference: '', notes: '' });
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Out"
        subtitle="Catat barang keluar dari inventory"
        icon={Upload}
        actions={
          <>
            <ExportToolbar
              title="Laporan Stok Keluar"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-stock-out-detailed"
            
            store={store}
          />
            <Button onClick={handleOpenForm} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Stok Keluar
            </Button>
          </>
        }
      />
      <PageDatePicker />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-stockout">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Tanggal (WIB)</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Belum ada stok keluar
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.reference}</TableCell>
                      <TableCell>{item.timestamp_wib}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-medium">- {item.quantity}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">{item.stock_type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => setViewingItem(item)}>
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stok Keluar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.stock_type} onValueChange={(v) => setFormData({ ...formData, stock_type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STOCK_OUT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produk</Label>
              <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name} (Stok: {product.stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah</Label>
              <NumberInput value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="mt-1.5" required />
            </div>
            <div>
              <Label>Referensi (Auto-generate)</Label>
              <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Kosongkan untuk auto-generate" className="mt-1.5" />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1.5" rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !formData.product_id}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Stok Keluar</DialogTitle></DialogHeader>
          {viewingItem && (
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-slate-500">Referensi</p><p className="font-medium">{viewingItem.reference}</p></div>
              <div><p className="text-sm text-slate-500">Tanggal</p><p className="font-medium">{viewingItem.timestamp_wib}</p></div>
              <div><p className="text-sm text-slate-500">Produk</p><p className="font-medium">{viewingItem.product_name}</p></div>
              <div><p className="text-sm text-slate-500">Quantity</p><p className="font-medium text-red-600">-{viewingItem.quantity}</p></div>
              <div><p className="text-sm text-slate-500">Type</p><p className="font-medium">{viewingItem.stock_type}</p></div>
              {viewingItem.notes && <div className="col-span-2"><p className="text-sm text-slate-500">Catatan</p><p className="font-medium">{viewingItem.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-stock-out-detailed" className="hidden">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Referensi</th>
              <th>Produk</th>
              <th>Qty</th>
              <th>Tipe</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.timestamp_wib}</td>
                <td>{m.reference}</td>
                <td>{m.product_name}</td>
                <td>-{m.quantity}</td>
                <td>{m.stock_type}</td>
                <td>{m.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
