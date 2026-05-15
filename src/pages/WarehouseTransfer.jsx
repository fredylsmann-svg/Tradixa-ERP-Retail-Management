import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowRightLeft, Plus, Search, Truck, Package, MapPin, Loader2, Eye, CheckCircle2,
  XCircle, Clock, Printer, FileText, FileSpreadsheet, Trash2, Send
} from 'lucide-react';
import WarehouseTransferIcon from '@/components/icons/WarehouseTransferIcon';

export default function WarehouseTransfer({ store }) {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    from_location: '',
    to_location: '',
    notes: '',
    items: [{ product_name: '', product_id: '', qty: 1, sku: '' }]
  });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    try {
      const [transferData, locData, prodData] = await Promise.all([
        api.entities.WarehouseTransfer.filter({ store_id: store.id }),
        api.entities.ProductLocation.filter({ store_id: store.id }),
        api.entities.Product.filter({ store_id: store.id })
      ]);
      setTransfers((transferData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLocations(locData || []);
      setProducts(prodData || []);
    } catch (e) {
      console.warn('WMS tables may not exist yet:', e.message);
      setTransfers([]);
    }
    setIsLoading(false);
  };

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const formatCurrency = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product_name: '', product_id: '', qty: 1, sku: '' }] });
  };

  const handleRemoveItem = (idx) => {
    if (formData.items.length <= 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...formData.items];
    newItems[idx][field] = value;
    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === value);
      if (prod) {
        newItems[idx].product_name = prod.name;
        newItems[idx].sku = prod.sku || '';
      }
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (status = 'Draft') => {
    if (!formData.from_location || !formData.to_location) {
      toast({ title: 'Error', description: 'Pilih lokasi asal dan tujuan.', variant: 'destructive' });
      return;
    }
    if (formData.from_location === formData.to_location) {
      toast({ title: 'Error', description: 'Lokasi asal dan tujuan tidak boleh sama.', variant: 'destructive' });
      return;
    }
    if (formData.items.some(i => !i.product_name || i.qty < 1)) {
      toast({ title: 'Error', description: 'Lengkapi semua item dengan nama dan qty.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const transferNum = `TO-${Date.now().toString(36).toUpperCase()}`;
      await api.entities.WarehouseTransfer.create({
        store_id: store.id,
        transfer_number: transferNum,
        from_location: formData.from_location,
        to_location: formData.to_location,
        status: status,
        notes: formData.notes,
        transferred_by: store.owner_name || 'Admin',
        transfer_date: new Date().toISOString().split('T')[0],
        timestamp_wib: getWIBTimestamp(),
        items: formData.items
      });

      toast({ title: '✅ Transfer Order Dibuat', description: `${transferNum} — Status: ${status}` });
      setShowForm(false);
      setFormData({ from_location: '', to_location: '', notes: '', items: [{ product_name: '', product_id: '', qty: 1, sku: '' }] });
      loadData();
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleReceive = async (transfer) => {
    try {
      await api.entities.WarehouseTransfer.update(transfer.id, {
        status: 'Received',
        received_by: store.owner_name || 'Admin',
        received_date: new Date().toISOString().split('T')[0]
      });

      // Update product locations
      for (const item of (transfer.items || [])) {
        if (item.product_id) {
          await api.entities.Product.update(item.product_id, {
            warehouse_name: transfer.to_location
          });
        }
      }

      toast({ title: '✅ Transfer Diterima', description: `Stok dipindahkan ke ${transfer.to_location}` });
      setViewingTransfer(null);
      loadData();
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handleSetInTransit = async (transfer) => {
    await api.entities.WarehouseTransfer.update(transfer.id, { status: 'In Transit' });
    toast({ title: '🚚 Dalam Pengiriman', description: `${transfer.transfer_number} sedang dikirim` });
    setViewingTransfer(null);
    loadData();
  };

  const statusBadge = (status) => {
    const map = {
      'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
      'In Transit': 'bg-amber-100 text-amber-700 border-amber-200',
      'Received': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Cancelled': 'bg-red-100 text-red-700 border-red-200'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  const warehouses = locations.filter(l => l.type === 'store');
  const filteredTransfers = transfers.filter(t => {
    const matchSearch = !searchQuery || t.transfer_number?.toLowerCase().includes(searchQuery.toLowerCase()) || t.from_location?.toLowerCase().includes(searchQuery.toLowerCase()) || t.to_location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-20" id="print-warehouse-transfer">
      <PageHeader
        title="Inter-Warehouse Transfer"
        subtitle="Perpindahan stok antar gudang/lokasi"
        icon={WarehouseTransferIcon}
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Warehouse Transfer', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-warehouse-transfer')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Warehouse Transfer', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-warehouse-transfer')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Warehouse Transfer', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-warehouse-transfer')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" /> Buat Transfer
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari nomor TO, lokasi..." className="pl-10 h-11" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="In Transit">In Transit</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transfer', value: transfers.length, color: 'from-blue-500 to-blue-700', icon: WarehouseTransferIcon },
          { label: 'Draft', value: transfers.filter(t => t.status === 'Draft').length, color: 'from-slate-400 to-slate-600', icon: Clock },
          { label: 'In Transit', value: transfers.filter(t => t.status === 'In Transit').length, color: 'from-amber-500 to-amber-700', icon: Truck },
          { label: 'Received', value: transfers.filter(t => t.status === 'Received').length, color: 'from-emerald-500 to-emerald-700', icon: CheckCircle2 }
        ].map((card, idx) => (
          <Card key={idx} className={`border-none bg-gradient-to-br ${card.color} transition-all hover:-translate-y-1`}>
            <CardContent className="p-4 relative">
              <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-white/80">{card.label}</p>
              <p className="text-2xl font-black text-white mt-1">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>No. Transfer</TableHead>
                <TableHead>Dari</TableHead>
                <TableHead>Ke</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 italic">
                    <WarehouseTransferIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    Belum ada transfer order
                  </TableCell>
                </TableRow>
              ) : filteredTransfers.map((t, idx) => (
                <TableRow key={t.id}>
                  <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-slate-800">{t.transfer_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-sm">{t.from_location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-sm">{t.to_location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{t.items?.length || 0}</TableCell>
                  <TableCell className="text-sm text-slate-500">{t.timestamp_wib || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge(t.status)}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => setViewingTransfer(t)} className="h-8 w-8">
                      <Eye className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarehouseTransferIcon className="w-5 h-5 text-blue-600" />
              Buat Transfer Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Dari Gudang *</Label>
                <Select value={formData.from_location} onValueChange={v => setFormData({ ...formData, from_location: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih asal..." /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">Ke Gudang *</Label>
                <Select value={formData.to_location} onValueChange={v => setFormData({ ...formData, to_location: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih tujuan..." /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.name !== formData.from_location).map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Catatan</Label>
              <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Alasan transfer..." />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-400">Item yang Ditransfer</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="w-3 h-3 mr-1" /> Tambah</Button>
              </div>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="col-span-7 space-y-1">
                    <Label className="text-[10px] text-slate-400">Produk</Label>
                    <Select value={item.product_id} onValueChange={v => handleItemChange(idx, 'product_id', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                      <SelectContent>
                        {products.filter(p => !formData.from_location || p.warehouse_name === formData.from_location).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock || 0})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] text-slate-400">Qty</Label>
                    <Input type="number" min="1" value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)} className="h-9 text-center font-bold" />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="h-9 w-9 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button variant="outline" onClick={() => handleSubmit('Draft')} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Draft
            </Button>
            <Button onClick={() => handleSubmit('In Transit')} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Send className="w-4 h-4 mr-2" /> Kirim Langsung
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingTransfer} onOpenChange={() => setViewingTransfer(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarehouseTransferIcon className="w-5 h-5 text-blue-600" />
              {viewingTransfer?.transfer_number}
            </DialogTitle>
          </DialogHeader>
          {viewingTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-[10px] font-bold text-red-400 uppercase">Dari</p>
                  <p className="font-bold text-red-700 flex items-center gap-1"><MapPin className="w-4 h-4" /> {viewingTransfer.from_location}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Ke</p>
                  <p className="font-bold text-emerald-700 flex items-center gap-1"><MapPin className="w-4 h-4" /> {viewingTransfer.to_location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className={statusBadge(viewingTransfer.status)}>{viewingTransfer.status}</Badge>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{viewingTransfer.timestamp_wib}</span>
              </div>

              {viewingTransfer.notes && (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-xl">{viewingTransfer.notes}</p>
              )}

              <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingTransfer.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{item.sku || '-'}</TableCell>
                      <TableCell className="text-center font-bold">{item.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setViewingTransfer(null)}>Tutup</Button>
                {viewingTransfer.status === 'Draft' && (
                  <Button onClick={() => handleSetInTransit(viewingTransfer)} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Truck className="w-4 h-4 mr-2" /> Set In Transit
                  </Button>
                )}
                {viewingTransfer.status === 'In Transit' && (
                  <Button onClick={() => handleReceive(viewingTransfer)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Terima di Gudang Tujuan
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
