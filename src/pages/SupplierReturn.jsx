import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, ArrowRightLeft, Trash2, Loader2, Search, Camera, ImageIcon, ExternalLink, Download as DownloadIcon, Copy, History, CheckCircle2, XCircle, MessageSquare, Maximize2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';

export default function SupplierReturn({ store }) {
  const [suppliers, setSuppliers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingReturn, setViewingReturn] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [allGRNs, setAllGRNs] = useState([]);
  const { selectedDate, formattedDate } = useGlobalDate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ supplier_id: '', items: [], notes: '', bank_account_id: '' });
  const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, reason: 'Rusak', photo_url: '' });
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [manualProductName, setManualProductName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [returnsData, suppliersData, productsData, banksData, grnsData] = await Promise.all([
        api.entities.SupplierReturn.filter({ store_id: store.id }, '-created_date'),
        api.entities.Supplier.filter({ store_id: store.id }),
        api.entities.Product.filter({ store_id: store.id }),
        api.entities.BankAccount.filter({ store_id: store.id }),
        api.entities.GoodsReceipt.filter({ store_id: store.id }, '-created_date')
      ]);
      setReturns(returnsData || []);
      setSuppliers(suppliersData || []);
      setProducts(productsData || []);
      setBankAccounts(banksData || []);
      setAllGRNs(grnsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filteredReturns = returns.filter(r => matchesDate(r, selectedDate));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // For demonstration, we use a data URL as a "public" link
      // In a real app, you would upload to a cloud bucket like S3 or Cloudinary
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, photo_url: reader.result }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast({
        title: "Gagal Unggah",
        description: "Terjadi kesalahan saat memproses foto.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const addItem = () => {
    // Validation for photo if reason is critical
    const needsPhoto = ['Rusak', 'Kadaluarsa', 'Salah Kirim'].includes(newItem.reason);
    if (needsPhoto && !newItem.photo_url) {
      toast({
        title: "Bukti Foto Wajib",
        description: `Harap lampirkan foto untuk alasan "${newItem.reason}"`,
        variant: "destructive"
      });
      return;
    }

    if (isManualProduct) {
      if (!manualProductName || newItem.quantity <= 0) return;
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          product_id: `manual-${Date.now()}`,
          product_name: manualProductName,
          quantity: Number(newItem.quantity),
          reason: newItem.reason,
          photo_url: newItem.photo_url
        }]
      }));
      setManualProductName('');
    } else {
      if (!newItem.product_id || newItem.quantity <= 0) return;
      const product = products.find(p => p.id === newItem.product_id);

      // Get latest price from GRN
      let latestPrice = product?.purchase_price || 0;
      const grnItem = allGRNs.flatMap(g => g.items || []).find(it => it.product_id === newItem.product_id);
      if (grnItem) latestPrice = grnItem.unit_price || grnItem.price || latestPrice;

      const updatedItems = [...formData.items, {
        product_id: newItem.product_id,
        product_name: product?.name || '',
        sku: product?.sku || '',
        quantity: Number(newItem.quantity),
        reason: newItem.reason,
        photo_url: newItem.photo_url,
        unit_price: latestPrice,
        total_price: latestPrice * Number(newItem.quantity)
      }];

      setFormData(prev => ({
        ...prev,
        items: updatedItems,
        total_value: updatedItems.reduce((sum, it) => sum + (it.total_price || 0), 0)
      }));
    }
    setNewItem({ product_id: '', quantity: 1, reason: 'Rusak', photo_url: '' });
  };

  const removeItem = (idx) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.supplier_id || formData.items.length === 0) return;
    setIsSaving(true);

    try {
      const supplier = suppliers.find(v => v.id === formData.supplier_id);
      const returnNumber = `SLR-${Date.now().toString().slice(-6)}`;
      const totalValue = formData.items.reduce((sum, it) => sum + (it.total_price || 0), 0);

      await api.entities.SupplierReturn.create({
        store_id: store.id,
        return_number: returnNumber,
        supplier_id: formData.supplier_id,
        supplier_name: supplier?.name || '',
        bank_account_id: formData.bank_account_id,
        items: formData.items,
        notes: formData.notes,
        status: 'Pending',
        total_value: totalValue,
        activity_log: [{
          action: 'Created',
          note: `Pengajuan retur dibuat (Estimasi: Rp ${totalValue.toLocaleString('id-ID')}) dan menunggu review supplier.`,
          timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
          actor: 'Sistem'
        }],
        timestamp_wib: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      });

      // Update Stock and Create Movements
      for (const item of formData.items) {
        // 1. Update Product Stock (if item is from master)
        if (!item.product_id.startsWith('manual-')) {
          const prods = await api.entities.Product.filter({ id: item.product_id });
          if (prods.length > 0) {
            const product = prods[0];
            const newStock = (product.stock || 0) - Number(item.quantity);
            const status = newStock <= 0 ? 'Out of Stock' : newStock <= (product.reorder_level || 10) ? 'Low Stock' : 'In Stock';
            await api.entities.Product.update(item.product_id, { stock: newStock, status });
          }
        }

        // 2. Create Stock Movement (Stock Out)
        await api.entities.StockMovement.create({
          store_id: store.id,
          reference: returnNumber,
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: 'out',
          stock_type: 'RETURN',
          quantity: Number(item.quantity),
          notes: `Retur Supplier: ${item.reason}`,
          timestamp_wib: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        });
      }

      setShowForm(false);
      setFormData({ supplier_id: '', items: [], notes: '' });
      loadData();
      toast({
        title: "Retur Berhasil",
        description: "Data pengembalian barang telah disimpan.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Gagal Simpan",
        description: err.message,
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const handleSendToWA = (retur) => {
    const supplier = suppliers.find(s => s.id === retur.supplier_id);
    if (!supplier?.phone) {
      toast({
        title: "Kontak Tidak Ditemukan",
        description: "Nomor WhatsApp supplier tidak tersedia di data master.",
        variant: "destructive"
      });
      return;
    }

    const itemText = retur.items.map((it, idx) =>
      `${idx + 1}. *${it.product_name}*\n   - Qty: ${it.quantity}\n   - Kondisi: ${it.reason}`
    ).join('\n');

    const reviewLink = `${window.location.origin}/public/return/${retur.id}/review`;

    const message = `Halo ${retur.supplier_name},\n\nKami mengajukan pengembalian barang (Retur) dengan No: ${retur.return_number}.\n\nSilakan klik tautan berikut untuk melihat rincian, bukti foto, dan melakukan konfirmasi (Setujui/Tolak):\n${reviewLink}\n\n*Daftar Barang:*\n${itemText}\n\nTerima kasih.`;

    const cleanPhone = supplier.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleVerifyRefund = async (retur) => {
    setConfirmDialog({
      open: true,
      title: "Verifikasi Dana Masuk",
      description: `Apakah Anda yakin telah menerima dana refund sebesar Rp ${Number(retur.final_refund_amount || retur.total_value || 0).toLocaleString('id-ID')} di rekening Anda?`,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const bank = bankAccounts.find(b => b.id === retur.bank_account_id);
          const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

          const refundAmount = Number(retur.final_refund_amount || retur.total_value || 0);
          const currentBalance = Number(bank?.balance || 0);
          const newBalance = currentBalance + refundAmount;

          await api.entities.BankTransaction.create({
            store_id: store.id,
            bank_account_id: retur.bank_account_id,
            bank_name: bank?.bank_name || '',
            reference: retur.return_number,
            transaction_type: 'Credit',
            category: 'Return Refund',
            amount: refundAmount,
            description: `Refund retur ${retur.return_number} dari ${retur.supplier_name}`,
            balance_after: newBalance,
            status: 'Approved',
            timestamp_wib: timestamp
          });

          await api.entities.BankAccount.update(retur.bank_account_id, {
            balance: newBalance
          });

          // Create Journal Entry
          await api.entities.JournalEntry.create({
            store_id: store.id,
            date: timestamp.split(',')[0].split('/').reverse().join('-'),
            description: `Refund retur ${retur.return_number} dari ${retur.supplier_name}`,
            reference: retur.return_number,
            entries: [
              { account_name: `Bank - ${bank?.bank_name}`, debit: refundAmount, credit: 0 },
              { account_name: 'Persediaan Barang Dagang', debit: 0, credit: refundAmount }
            ],
            total_amount: refundAmount,
            status: 'Posted'
          });

          const updatedLogs = [...(retur.activity_log || []), {
            action: 'Completed',
            note: 'Dana refund telah diverifikasi dan diterima oleh toko.',
            timestamp: timestamp,
            actor: 'Admin'
          }];

          await api.entities.SupplierReturn.update(retur.id, {
            status: 'Completed',
            activity_log: updatedLogs
          });

          toast({ title: "Verifikasi Berhasil", description: "Dana telah masuk dan saldo bank diperbarui." });
          setViewingReturn(null);
          loadData();
        } catch (err) {
          console.error(err);
          toast({ title: "Gagal", description: "Gagal memproses verifikasi dana.", variant: "destructive" });
        } finally {
          setIsSaving(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleReceiveReplacement = async (retur) => {
    setConfirmDialog({
      open: true,
      title: "Konfirmasi Terima Barang",
      description: "Apakah Anda yakin telah menerima barang pengganti ini? Stok produk akan otomatis bertambah sesuai jumlah yang disepakati.",
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
          const itemsToProcess = retur.replacement_items || retur.items;

          for (const item of itemsToProcess) {
            // 1. Update Product Stock
            if (!item.product_id.startsWith('manual-')) {
              const prods = await api.entities.Product.filter({ id: item.product_id });
              if (prods.length > 0) {
                const product = prods[0];
                const qtyToAdd = Number(item.replacement_qty !== undefined ? item.replacement_qty : item.quantity);
                const newStock = (product.stock || 0) + qtyToAdd;
                await api.entities.Product.update(item.product_id, { stock: newStock });
              }
            }

            // 2. Create Stock Movement (Stock In)
            await api.entities.StockMovement.create({
              store_id: store.id,
              reference: retur.return_number,
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'in',
              stock_type: 'REPLACEMENT',
              quantity: Number(item.replacement_qty !== undefined ? item.replacement_qty : item.quantity),
              notes: `Penerimaan Barang Pengganti (Retur ${retur.return_number})`,
              timestamp_wib: timestamp
            });
          }

          // 3. Update Status
          const updatedLogs = [...(retur.activity_log || []), {
            action: 'Completed',
            note: 'Barang pengganti telah diterima dan stok telah diperbarui.',
            timestamp: timestamp,
            actor: 'Admin'
          }];

          await api.entities.SupplierReturn.update(retur.id, {
            status: 'Completed',
            activity_log: updatedLogs
          });

          toast({ title: "Selesai", description: "Barang telah diterima dan stok telah diperbarui." });
          setViewingReturn(null);
          loadData();
        } catch (err) {
          console.error(err);
          toast({ title: "Gagal", description: "Terjadi kesalahan saat memperbarui stok.", variant: "destructive" });
        } finally {
          setIsSaving(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Return"
        subtitle="Kelola pengembalian barang (retur) ke supplier"
        icon={ArrowRightLeft}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar
              title="Laporan Retur Pembelian (Supplier)"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-return-detailed"
            />
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Buat Retur Supplier
            </Button>
          </div>
        }
      />
      <PageDatePicker />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6 w-[50px]">No.</TableHead>
                <TableHead>No. Retur</TableHead>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead>Nama Supplier</TableHead>
                <TableHead className="text-center">Total Items</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada riwayat retur untuk tanggal ini
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((r, idx) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 text-slate-400 font-bold">{idx + 1}</TableCell>
                    <TableCell className="font-black text-slate-900">{r.return_number}</TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium">{r.timestamp_wib}</TableCell>
                    <TableCell className="font-bold text-slate-800">{r.supplier_name}</TableCell>
                    <TableCell className="text-center font-bold text-slate-600">{r.items?.length || 0} Produk</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`px-3 py-1 rounded-full text-[10px] font-bold ${r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            r.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                        }`}>
                        {r.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setViewingReturn(r)}><Eye className="w-4 h-4 text-slate-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Buat Retur Supplier Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Supplier Tujuan *</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                    <SelectValue placeholder="Klik untuk pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rekening Bank (Untuk Refund) *</Label>
                <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                    <SelectValue placeholder="Pilih rekening tujuan refund" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number} ({b.account_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-2 border-slate-100 rounded-3xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tambah Barang Retur</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsManualProduct(!isManualProduct)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50"
                >
                  {isManualProduct ? "Pilih dari Master" : "+ Produk Manual"}
                </Button>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-5">
                  {isManualProduct ? (
                    <Input
                      placeholder="Masukkan nama barang manual..."
                      value={manualProductName}
                      onChange={(e) => setManualProductName(e.target.value)}
                      className="h-11 bg-white"
                    />
                  ) : (
                    <Select value={newItem.product_id} onValueChange={(v) => setNewItem({ ...newItem, product_id: v })}>
                      <SelectTrigger className="h-11 bg-white border-slate-200">
                        <SelectValue placeholder="Pilih Produk..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col">
                              <span>{p.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold">SKU: {p.sku || 'No SKU'} | Stok: {p.stock || 0}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="h-11 bg-white text-center font-bold"
                  />
                </div>
                <div className="col-span-8 md:col-span-3">
                  <Select value={newItem.reason} onValueChange={(v) => setNewItem({ ...newItem, reason: v })}>
                    <SelectTrigger className="h-11 bg-white border-slate-200">
                      <SelectValue placeholder="Alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rusak">Rusak</SelectItem>
                      <SelectItem value="Kadaluarsa">Kadaluarsa</SelectItem>
                      <SelectItem value="Salah Kirim">Salah Kirim</SelectItem>
                      <SelectItem value="Lainnya">Lainnya...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-2">
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="return-photo-upload"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full h-11 border-dashed ${newItem.photo_url ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300'}`}
                      onClick={() => document.getElementById('return-photo-upload').click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : newItem.photo_url ? <ImageIcon className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      <span className="ml-2 text-[10px] font-bold">Foto</span>
                    </Button>
                    {newItem.photo_url && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white text-white">
                        <Plus className="w-3 h-3 rotate-45" onClick={() => setNewItem({ ...newItem, photo_url: '' })} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-12">
                  <Button
                    type="button"
                    onClick={addItem}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-bold rounded-xl shadow-md shadow-blue-100"
                  >
                    Tambah Barang Retur
                  </Button>
                </div>
              </div>

              {formData.items.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-left-2 duration-300">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.product_name}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {item.sku && <span className="mr-2">SKU: {item.sku}</span>}
                          <span>QTY: {item.quantity}</span> | <span>ALASAN: {item.reason}</span> | <span className="text-blue-600">Rp {item.unit_price?.toLocaleString('id-ID')}</span>
                        </p>
                        {item.photo_url && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-12 h-12 rounded-lg border overflow-hidden bg-slate-100">
                              <img src={item.photo_url} alt="Evidence" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] font-bold text-blue-600">Bukti Foto Terlampir</span>
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan Tambahan</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Berikan keterangan tambahan jika diperlukan..."
                className="rounded-2xl border-slate-200 min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 -mx-6 px-6 bg-slate-50/50 -mb-6 pb-6">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 font-bold text-slate-500 h-12 rounded-2xl">Batal</Button>
              <Button
                onClick={handleSubmit}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-100 h-12 transition-all active:scale-95 disabled:opacity-50"
                disabled={isSaving || formData.items.length === 0 || !formData.supplier_id}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRightLeft className="w-5 h-5 mr-2" />}
                Selesaikan & Simpan Retur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReturn} onOpenChange={() => setViewingReturn(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="text-xl font-black">Detail Retur #{viewingReturn?.return_number}</DialogTitle>
            {viewingReturn && (
              <Badge className={`px-4 py-1.5 rounded-full text-xs font-bold ${viewingReturn.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  viewingReturn.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                }`}>
                {viewingReturn.status || 'Pending'}
              </Badge>
            )}
          </DialogHeader>
          {viewingReturn && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                {(() => {
                  const supplier = suppliers.find(v => v.id === viewingReturn.supplier_id);
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Tujuan</label>
                      <p className="font-bold text-slate-800 text-lg leading-tight">{viewingReturn.supplier_name}</p>
                      {supplier?.phone && <p className="text-xs text-slate-500 font-medium">{supplier.phone}</p>}
                    </div>
                  );
                })()}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Pengajuan</label>
                  <p className="font-bold text-slate-700">{viewingReturn.timestamp_wib}</p>
                </div>
                {(viewingReturn.status === 'Pending' || !viewingReturn.status) && (
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tautan Review Supplier</label>
                    <div className="flex gap-2">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl flex-1 h-12"
                        onClick={() => handleSendToWA(viewingReturn)}
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Kirim Ke Supplier (WA)
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 rounded-xl h-12"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/public/return/${viewingReturn.id}/review`);
                          toast({
                            title: "Link Tersalin",
                            description: "Tautan review berhasil disalin ke clipboard.",
                          });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 italic font-medium">Kirimkan link di atas ke supplier untuk mendapatkan persetujuan atau penolakan.</p>
                  </div>
                )}
                {viewingReturn.status === 'Approved' && (
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-900 uppercase">Menunggu Verifikasi Anda</p>
                          <p className="text-xs font-bold text-emerald-600">Supplier telah menyetujui kompensasi: {viewingReturn.compensation_type}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {viewingReturn.compensation_type === 'Refund' ? (
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-2xl h-11"
                            onClick={() => handleVerifyRefund(viewingReturn)}
                            disabled={isSaving}
                          >
                            Verifikasi Dana Masuk
                          </Button>
                        ) : (
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 rounded-2xl h-11"
                            onClick={() => handleReceiveReplacement(viewingReturn)}
                            disabled={isSaving}
                          >
                            Konfirmasi Terima Barang
                          </Button>
                        )}
                      </div>
                    </div>

                    {viewingReturn.compensation_type === 'Refund' && viewingReturn.refund_proof_url && (
                      <div className="p-6 bg-blue-600 rounded-2xl text-white space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm">Bukti Transfer Supplier</h5>
                          <span className="text-[10px] font-black uppercase text-slate-400">Total Refund: Rp {viewingReturn.total_value?.toLocaleString('id-ID')}</span>
                        </div>
                        <div
                          className="relative aspect-video rounded-3xl border border-white/10 overflow-hidden cursor-pointer group"
                          onClick={() => setSelectedPhoto({ url: viewingReturn.refund_proof_url, name: "Bukti Transfer Supplier" })}
                        >
                          <img src={viewingReturn.refund_proof_url} className="w-full h-full object-contain" alt="Refund Proof" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {viewingReturn.status === 'Rejected' && (
                  <div className="col-span-1 md:col-span-2 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm font-bold text-red-700">Retur ini telah ditolak oleh supplier.</p>
                  </div>
                )}
                {viewingReturn.status === 'Completed' && (
                  <div className="col-span-1 md:col-span-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    <p className="text-sm font-bold text-blue-700">Transaksi retur ini telah selesai dan diverifikasi.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-slate-400" />
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Item Yang Dikembalikan</h4>
                </div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead >Produk</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead >Alasan & Bukti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingReturn.items?.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/30">
                          <TableCell className="font-bold text-slate-800">{item.product_name}</TableCell>
                          <TableCell className="text-center font-black text-slate-700">{item.quantity}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-100">
                                {item.reason}
                              </Badge>
                              {item.photo_url && (
                                <div
                                  className="relative w-10 h-10 rounded-lg border overflow-hidden cursor-pointer group hover:border-blue-400 transition-all"
                                  onClick={() => setSelectedPhoto({ url: item.photo_url, name: item.product_name })}
                                >
                                  <img src={item.photo_url} alt="Evidence" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
                  <DialogHeader className="p-4 bg-white/10 backdrop-blur-md absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between border-b border-white/10">
                    <DialogTitle className="text-white text-sm font-bold">{selectedPhoto?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="pt-14 pb-4 flex items-center justify-center min-h-[50vh]">
                    <img
                      src={selectedPhoto?.url}
                      alt="Full Evidence"
                      className="max-w-full max-h-[80vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Log Aktivitas</h4>
                </div>
                <div className="space-y-3">
                  {viewingReturn.activity_log?.map((log, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${log.action === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                          log.action === 'Rejected' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {log.action === 'Approved' ? <CheckCircle2 className="w-5 h-5" /> :
                          log.action === 'Rejected' ? <XCircle className="w-5 h-5" /> :
                            <Plus className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-slate-800">
                            {log.action === 'Approved' ? 'Disetujui Supplier' :
                              log.action === 'Rejected' ? 'Ditolak Supplier' :
                                'Pengajuan Dibuat'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">{log.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 italic">"{log.note}"</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Oleh: {log.actor}</p>
                      </div>
                    </div>
                  ))}
                  {(!viewingReturn.activity_log || viewingReturn.activity_log.length === 0) && (
                    <div className="text-center py-6 border border-dashed rounded-2xl text-slate-400">
                      <p className="text-xs italic">Belum ada riwayat aktivitas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div id="print-return-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Retur</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.flatMap((r) =>
              r.items?.map((item, idx) => (
                <TableRow key={`${r.id}-${idx}`}>
                  {idx === 0 ? (
                    <>
                      <TableCell rowSpan={r.items.length || 1} className="font-bold border-r">{r.return_number}</TableCell>
                      <TableCell rowSpan={r.items.length || 1} className="border-r">{r.timestamp_wib}</TableCell>
                      <TableCell rowSpan={r.items.length || 1} className="border-r">
                        <div className="font-black text-slate-900">{r.supplier_name}</div>
                        {suppliers.find(v => v.id === r.supplier_id)?.phone && <div className="text-slate-500">{suppliers.find(v => v.id === r.supplier_id)?.phone}</div>}
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.reason}</TableCell>
                </TableRow>
              )) || []
            )}
          </TableBody>
        </Table>
        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => !isSaving && setConfirmDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                {confirmDialog.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-slate-500 text-sm font-medium">
              {confirmDialog.description}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                disabled={isSaving}
                className="font-bold"
              >
                Batal
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={confirmDialog.onConfirm}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Ya, Konfirmasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
