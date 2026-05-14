import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { useToast } from '@/components/ui/use-toast';
import {
  ClipboardList, Plus, Search, Package, CheckCircle2, Clock, Loader2, Eye,
  Printer, FileText, FileSpreadsheet, MapPin, User, ArrowRight
} from 'lucide-react';

export default function PickList({ store }) {
  const { toast } = useToast();
  const [pickLists, setPickLists] = useState([]);
  const [outbounds, setOutbounds] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingPick, setViewingPick] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    try {
      const [pickData, outData, prodData] = await Promise.all([
        api.entities.PickList?.filter({ store_id: store.id }).catch(() => []),
        api.entities.OutboundDelivery.filter({ store_id: store.id }),
        api.entities.Product.filter({ store_id: store.id })
      ]);
      setPickLists((pickData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setOutbounds(outData || []);
      setProducts(prodData || []);
    } catch (e) {
      console.warn('PickList load error:', e.message);
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

  // Eligible outbounds (Pending status, not already in a pick list)
  const usedOrderIds = pickLists.flatMap(pl => (pl.source_orders || []).map(o => o.id));
  const eligibleOutbounds = outbounds.filter(o =>
    o.status === 'Pending' && !usedOrderIds.includes(o.id)
  );

  const toggleOrder = (outbound) => {
    setSelectedOrders(prev => {
      const exists = prev.find(o => o.id === outbound.id);
      if (exists) return prev.filter(o => o.id !== outbound.id);
      return [...prev, outbound];
    });
  };

  // Consolidate items from selected orders
  const consolidatedItems = () => {
    const map = {};
    selectedOrders.forEach(order => {
      const items = order.items || [];
      items.forEach(item => {
        const key = item.product_id || item.product_name;
        if (map[key]) {
          map[key].qty += item.qty || 1;
          map[key].orders.push(order.id?.substring(0, 8));
        } else {
          map[key] = {
            product_name: item.product_name || item.name || '-',
            product_id: item.product_id,
            sku: item.sku || '',
            qty: item.qty || 1,
            location: products.find(p => p.id === item.product_id)?.warehouse_name || '-',
            orders: [order.id?.substring(0, 8)]
          };
        }
      });
    });
    return Object.values(map);
  };

  const handleCreatePickList = async () => {
    if (selectedOrders.length === 0) {
      toast({ title: 'Error', description: 'Pilih minimal 1 order untuk pick list.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const pickNum = `PL-${Date.now().toString(36).toUpperCase()}`;
      const items = consolidatedItems();
      await api.entities.PickList.create({
        store_id: store.id,
        pick_number: pickNum,
        status: 'Open',
        assigned_to: assignedTo || 'Unassigned',
        items: items,
        source_orders: selectedOrders.map(o => ({ id: o.id, customer: o.customers?.name || '-' })),
        timestamp_wib: getWIBTimestamp()
      });

      toast({ title: '✅ Pick List Dibuat', description: `${pickNum} — ${items.length} item dari ${selectedOrders.length} order` });
      setShowForm(false);
      setSelectedOrders([]);
      setAssignedTo('');
      loadData();
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleCompletePick = async (pick) => {
    await api.entities.PickList.update(pick.id, {
      status: 'Completed',
      picked_at: new Date().toISOString()
    });
    toast({ title: '✅ Picking Selesai', description: `${pick.pick_number} telah selesai dipicking` });
    setViewingPick(null);
    loadData();
  };

  const statusBadge = (status) => {
    const map = {
      'Open': 'bg-blue-100 text-blue-700 border-blue-200',
      'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
      'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  const filteredLists = pickLists.filter(pl => {
    const matchSearch = !searchQuery || pl.pick_number?.toLowerCase().includes(searchQuery.toLowerCase()) || pl.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || pl.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-20" id="print-pick-list">
      <PageHeader
        title="Pick List"
        subtitle="Gabungkan beberapa order jadi 1 daftar pengambilan barang"
        icon={ClipboardList}
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Pick List', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-pick-list')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Pick List', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-pick-list')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Pick List', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-pick-list')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" /> Buat Pick List
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari nomor pick list, picker..." className="pl-10 h-11" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Status</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Pick List', value: pickLists.length, color: 'from-blue-500 to-blue-700', icon: ClipboardList },
          { label: 'Open / In Progress', value: pickLists.filter(p => p.status !== 'Completed').length, color: 'from-amber-500 to-amber-700', icon: Clock },
          { label: 'Selesai', value: pickLists.filter(p => p.status === 'Completed').length, color: 'from-emerald-500 to-emerald-700', icon: CheckCircle2 }
        ].map((card, idx) => (
          <Card key={idx} className={`border-none bg-gradient-to-br ${card.color} hover:-translate-y-1 transition-all`}>
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
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>No. Pick List</TableHead>
                <TableHead>Picker</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredLists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400 italic">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    Belum ada pick list
                  </TableCell>
                </TableRow>
              ) : filteredLists.map((pl, idx) => (
                <TableRow key={pl.id}>
                  <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-slate-800">{pl.pick_number}</TableCell>
                  <TableCell className="text-sm flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {pl.assigned_to}</TableCell>
                  <TableCell className="text-center font-bold">{pl.items?.length || 0}</TableCell>
                  <TableCell className="text-center">{pl.source_orders?.length || 0}</TableCell>
                  <TableCell className="text-sm text-slate-500">{pl.timestamp_wib}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(pl.status)}>{pl.status}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => setViewingPick(pl)} className="h-8 w-8">
                      <Eye className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Buat Pick List — Pilih Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Ditugaskan ke (Picker)</Label>
              <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Nama picker / staff gudang..." />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Pilih Outbound Orders ({eligibleOutbounds.length} tersedia)</Label>
              {eligibleOutbounds.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl">Tidak ada order yang bisa di-pick saat ini</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {eligibleOutbounds.map(ob => {
                    const isSelected = selectedOrders.some(o => o.id === ob.id);
                    return (
                      <div key={ob.id} onClick={() => toggleOrder(ob)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{ob.customers?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{ob.id?.substring(0, 8)} — {ob.items?.length || 0} item</p>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">{ob.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedOrders.length > 0 && (
              <div>
                <Label className="text-xs font-bold uppercase text-slate-400 mb-2 block">
                  Preview Consolidated Items ({consolidatedItems().length} produk unik)
                </Label>
                <Table className="border rounded-xl">
                  <TableHeader className="bg-blue-50">
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead className="text-center">Total Qty</TableHead>
                      <TableHead>Dari Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedItems().map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                        <TableCell className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{item.location}</TableCell>
                        <TableCell className="text-center font-black text-blue-600">{item.qty}</TableCell>
                        <TableCell className="text-xs text-slate-400">{item.orders.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setSelectedOrders([]); }}>Batal</Button>
            <Button onClick={handleCreatePickList} disabled={isSaving || selectedOrders.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Buat Pick List ({selectedOrders.length} order)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingPick} onOpenChange={() => setViewingPick(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              {viewingPick?.pick_number}
            </DialogTitle>
          </DialogHeader>
          {viewingPick && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusBadge(viewingPick.status)}>{viewingPick.status}</Badge>
                <span className="text-sm text-slate-500">Picker: <strong>{viewingPick.assigned_to}</strong></span>
                <span className="text-xs text-slate-400 ml-auto">{viewingPick.timestamp_wib}</span>
              </div>

              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Source Orders</div>
              <div className="flex flex-wrap gap-2">
                {viewingPick.source_orders?.map((o, idx) => (
                  <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-600 text-xs">{o.id?.substring(0, 8)} — {o.customer}</Badge>
                ))}
              </div>

              <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingPick.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-sm flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{item.location || '-'}</TableCell>
                      <TableCell className="text-center font-bold">{item.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setViewingPick(null)}>Tutup</Button>
                {viewingPick.status !== 'Completed' && (
                  <Button onClick={() => handleCompletePick(viewingPick)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Selesai Picking
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
