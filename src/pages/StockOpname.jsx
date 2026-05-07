import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import {
  ClipboardCheck, Plus, Search, Eye, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle,
  MinusCircle, Loader2, ScanLine, FileText, ChevronRight, Package, AlertTriangle, Info, Calendar, MapPin, UserCheck, X,
  Download, Printer, RefreshCw, Shield
} from 'lucide-react';
import { DialogTrigger } from '@/components/ui/dialog';

const STATUS_COLORS = {
  'Draft': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-amber-100 text-amber-700',
  'Approved': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-red-100 text-red-700',
};

// === PROFESSIONAL FLOWCHART ===
function OpnameFlowchart() {
  const [showInfo, setShowInfo] = useState(false);
  const steps = [
    { icon: ClipboardCheck, label: 'Buat Sesi Opname', desc: 'Tentukan lokasi, tanggal, dan petugas penghitungan', gradient: 'from-blue-500 to-blue-600' },
    { icon: Package, label: 'Muat Data Produk', desc: 'Sistem memuat seluruh produk beserta stok tercatat saat ini', gradient: 'from-indigo-500 to-indigo-600' },
    { icon: ScanLine, label: 'Input Stok Fisik', desc: 'Scan barcode atau input manual jumlah stok aktual di lokasi', gradient: 'from-violet-500 to-violet-600' },
    { icon: FileText, label: 'Analisis Selisih', desc: 'Sistem menghitung variance: Surplus, Deficit, atau Match', gradient: 'from-amber-500 to-amber-600' },
    { icon: CheckCircle2, label: 'Verifikasi & Approve', desc: 'Owner/Manager memverifikasi dan menyetujui hasil opname', gradient: 'from-emerald-500 to-emerald-600' },
    { icon: ArrowUpCircle, label: 'Penyesuaian Otomatis', desc: 'Auto Stock In/Out + Journal Entry selisih persediaan', gradient: 'from-teal-500 to-teal-600' },
  ];
  return (
    <Card className="border-slate-200 dark:border-slate-700 mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-300 transition-colors" onClick={() => setShowInfo(!showInfo)} /> Alur Kerja Stock Opname
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Proses standar verifikasi stok dalam sistem ERP</p>
        </div>
        {showInfo && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-300">Klik langkah untuk detail</p>
            <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="relative">
          {/* Connector Line */}
          <div className="absolute top-7 left-[calc(8.33%)] right-[calc(8.33%)] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 via-amber-200 to-emerald-200 z-0 hidden md:block" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-0">
            {steps.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center group">
                {i < steps.length - 1 && (
                  <div className="absolute top-[28px] right-0 translate-x-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="relative z-10 mb-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-slate-700 shadow-sm">
                    {i + 1}
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{s.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1 px-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StockOpname({ store }) {
  const { toast } = useToast();
  const [opnames, setOpnames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ location: '', notes: '', pic: '', opname_date: new Date().toLocaleDateString('en-CA') });
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const activeInputRef = useRef(null);

  useEffect(() => {
    if (store?.id) {
      loadData();
      api.auth.me().then(setCurrentUser).catch(() => { });
    }
  }, [store]);

  const canApproveOpname = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'owner') return true;
    return currentUser.authorities?.includes('APPROVE_ADJUSTMENT') || currentUser.role === 'admin';
  };

  const loadData = async () => {
    setIsLoading(true);
    const data = await api.entities.StockOpname.filter({ store_id: store.id });
    setOpnames(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setIsLoading(false);
  };

  const generateNumber = () => `SO-${Date.now().toString(36).toUpperCase()}`;

  // Load locations & employees when create dialog opens
  useEffect(() => {
    if (showCreate && store?.id) {
      api.entities.ProductLocation.filter({ store_id: store.id }).then(setLocations).catch(() => { });
      api.entities.Employee.filter({ store_id: store.id }).then(setEmployees).catch(() => { });
    }
  }, [showCreate, store]);

  // === CREATE SESSION ===
  const handleCreateSession = async () => {
    setIsSaving(true);
    try {
      const allProducts = await api.entities.Product.filter({ store_id: store.id });
      const user = await api.auth.me();
      // Filter products by selected location (match by warehouse_name)
      let filteredProducts = allProducts;
      if (formData.location && formData.location !== 'Semua Lokasi') {
        filteredProducts = allProducts.filter(p => p.warehouse_name === formData.location || p.location_name === formData.location);
      }
      const opname = await api.entities.StockOpname.create({
        store_id: store.id,
        opname_number: generateNumber(),
        location: formData.location || 'Semua Lokasi',
        opname_date: formData.opname_date || new Date().toLocaleDateString('en-CA'),
        status: 'In Progress',
        notes: formData.pic ? `Petugas: ${formData.pic}${formData.notes ? ` | ${formData.notes}` : ''}` : formData.notes,
        total_items: filteredProducts.length,
        created_by: formData.pic || user.full_name || user.email,
      });

      for (const p of filteredProducts) {
        await api.entities.StockOpnameItem.create({
          opname_id: opname.id,
          product_id: p.id,
          product_name: p.name,
          sku: p.sku,
          barcode: p.barcode || '',
          unit: p.unit || 'pcs',
          system_stock: p.stock || 0,
          physical_stock: null,
          variance: 0,
          variance_type: 'Match',
          unit_cost: p.buy_price || p.cost_price || 0,
        });
      }

      toast({ title: "✅ Sesi Opname Dibuat", description: `${opname.opname_number} siap diisi.` });
      setShowCreate(false);
      setFormData({ location: '', notes: '', pic: '', opname_date: new Date().toLocaleDateString('en-CA') });
      loadData();
    } catch (e) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  // === OPEN DETAIL ===
  const openDetail = async (opname) => {
    const opnameItems = await api.entities.StockOpnameItem.filter({ opname_id: opname.id });
    setItems(opnameItems);
    setShowDetail(opname);
  };

  // === UPDATE PHYSICAL STOCK ===
  const updatePhysicalStock = (itemId, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const physical = value === '' ? null : Number(value);
      const variance = physical !== null ? physical - item.system_stock : 0;
      const type = physical === null ? 'Match' : variance > 0 ? 'Surplus' : variance < 0 ? 'Deficit' : 'Match';
      return { ...item, physical_stock: physical, variance, variance_type: type, variance_value: Math.abs(variance) * (item.unit_cost || 0) };
    }));
  };

  // === BARCODE SCAN ===
  const handleBarcodeScan = (code) => {
    const found = items.find(i => i.barcode === code || i.sku === code);
    if (found) {
      const el = document.getElementById(`input-${found.id}`);
      if (el) { el.focus(); el.select(); }
      toast({ title: `📦 ${found.product_name}`, description: `Stok sistem: ${found.system_stock}` });
    } else {
      toast({ title: "Tidak Ditemukan", description: `Barcode ${code} tidak ada dalam daftar.`, variant: "destructive" });
    }
  };

  // === SAVE PROGRESS ===
  const saveProgress = async () => {
    setIsSaving(true);
    try {
      for (const item of items) {
        await api.entities.StockOpnameItem.update(item.id, {
          physical_stock: item.physical_stock,
          variance: item.variance,
          variance_type: item.variance_type,
          variance_value: item.variance_value,
        });
      }
      const matched = items.filter(i => i.variance_type === 'Match' && i.physical_stock !== null).length;
      const surplus = items.filter(i => i.variance_type === 'Surplus').length;
      const deficit = items.filter(i => i.variance_type === 'Deficit').length;
      const totalVar = items.reduce((s, i) => s + (i.variance_value || 0), 0);
      const allFilled = items.every(i => i.physical_stock !== null);

      await api.entities.StockOpname.update(showDetail.id, {
        matched_items: matched, surplus_items: surplus, deficit_items: deficit,
        total_variance_value: totalVar,
        status: allFilled ? 'Completed' : 'In Progress',
      });
      toast({ title: "✅ Tersimpan" });
      setShowDetail(prev => ({ ...prev, status: allFilled ? 'Completed' : 'In Progress', matched_items: matched, surplus_items: surplus, deficit_items: deficit }));
      loadData();
    } catch (e) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  // === APPROVE ===
  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const user = await api.auth.me();
      // Create Stock Adjustments
      for (const item of items) {
        if (item.variance === 0 || item.physical_stock === null) continue;
        await api.entities.StockMovement.create({
          store_id: store.id, product_id: item.product_id, product_name: item.product_name,
          sku: item.sku, type: item.variance > 0 ? 'Stock In' : 'Stock Out',
          quantity: Math.abs(item.variance), unit: item.unit,
          reference: showDetail.opname_number,
          reason: `Adjustment - Stock Opname (${item.variance > 0 ? 'Surplus' : 'Deficit'})`,
          created_date: new Date().toLocaleDateString('en-CA'),
        });
        // Update product stock
        const product = await api.entities.Product.get(item.product_id);
        if (product) {
          await api.entities.Product.update(item.product_id, { stock: item.physical_stock });
        }
      }
      // Create Journal Entry
      const totalVarianceValue = items.reduce((s, i) => s + (i.variance_value || 0), 0);
      if (totalVarianceValue > 0) {
        const journal = await api.entities.JournalEntry.create({
          store_id: store.id,
          entry_number: `JE-SO-${Date.now().toString(36).toUpperCase()}`,
          date: new Date().toLocaleDateString('en-CA'),
          description: `Penyesuaian Stock Opname ${showDetail.opname_number}`,
          status: 'Posted', total_debit: totalVarianceValue, total_credit: totalVarianceValue,
        });
        await api.entities.JournalLine.create({
          journal_entry_id: journal.id, store_id: store.id,
          account_code: '5900', account_name: 'Selisih Persediaan',
          debit: totalVarianceValue, credit: 0, description: 'Selisih stock opname',
        });
        await api.entities.JournalLine.create({
          journal_entry_id: journal.id, store_id: store.id,
          account_code: '1300', account_name: 'Persediaan Barang Dagang',
          debit: 0, credit: totalVarianceValue, description: 'Penyesuaian persediaan',
        });
      }
      const approverRole = user.position || user.role || 'Staff';
      const formattedApprover = `${user.full_name || user.email} (${approverRole})`;
      await api.entities.StockOpname.update(showDetail.id, {
        status: 'Approved', approved_by: formattedApprover, approved_at: new Date().toISOString(),
      });
      toast({ title: "✅ Opname Disetujui", description: "Stok & jurnal telah disesuaikan otomatis." });
      setShowDetail(null);
      loadData();
    } catch (e) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleRefreshSystemStock = async () => {
    if (!confirm('Perbarui stok sistem dengan data terbaru dari Master Produk? Ini akan mereset selisih yang sudah dihitung.')) return;
    setIsSaving(true);
    try {
      const latestProducts = await api.entities.Product.filter({ store_id: store.id });
      const updatedItems = items.map(item => {
        const p = latestProducts.find(lp => lp.id === item.product_id);
        if (!p) return item;

        const systemStock = p.stock || 0;
        const physical = item.physical_stock;
        const variance = physical !== null ? physical - systemStock : 0;
        const type = physical === null ? 'Match' : variance > 0 ? 'Surplus' : variance < 0 ? 'Deficit' : 'Match';

        return {
          ...item,
          system_stock: systemStock,
          variance,
          variance_type: type,
          variance_value: Math.abs(variance) * (item.unit_cost || 0)
        };
      });

      // Update in DB
      for (const item of updatedItems) {
        await api.entities.StockOpnameItem.update(item.id, {
          system_stock: item.system_stock,
          variance: item.variance,
          variance_type: item.variance_type,
          variance_value: item.variance_value
        });
      }

      setItems(updatedItems);
      toast({ title: "✅ Stok Sistem Diperbarui", description: "Data disinkronkan dengan Master Produk terbaru." });
    } catch (e) {
      toast({ title: "Gagal Sinkronisasi", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const filteredItems = items.filter(i =>
    !search || i.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode?.includes(search)
  );

  const summary = {
    total: items.length,
    filled: items.filter(i => i.physical_stock !== null).length,
    match: items.filter(i => i.variance_type === 'Match' && i.physical_stock !== null).length,
    surplus: items.filter(i => i.variance_type === 'Surplus').length,
    deficit: items.filter(i => i.variance_type === 'Deficit').length,
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  // === EXPORT FUNCTIONS ===
  const exportOpnameCSV = (data) => {
    const headers = ['No', 'No. Opname', 'Tanggal', 'Lokasi', 'Dibuat Oleh', 'Total Items', 'Match', 'Surplus', 'Deficit', 'Status'];
    const rows = data.map((o, i) => [i + 1, o.opname_number, o.opname_date, o.location, o.created_by || '-', o.total_items, o.matched_items || 0, o.surplus_items || 0, o.deficit_items || 0, o.status]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-opname-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportOpnamePDF = (data) => {
    let content = `<html><head><title>Stock Opname Report</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:bold}h1{font-size:18px;color:#1e293b}h2{font-size:14px;color:#64748b;font-weight:normal;margin-top:-10px}.meta{color:#64748b;font-size:11px;margin-top:10px}</style></head><body>`;
    content += `<h1>Stock Opname Report</h1><h2>Tradixa ERP System</h2><p class="meta">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`;
    content += '<table><tr><th>No</th><th>No. Opname</th><th>Tanggal</th><th>Lokasi</th><th>Dibuat Oleh</th><th>Items</th><th>Match</th><th>Surplus</th><th>Deficit</th><th>Status</th></tr>';
    data.forEach((o, i) => {
      content += `<tr><td>${i + 1}</td><td>${o.opname_number}</td><td>${o.opname_date}</td><td>${o.location}</td><td>${o.created_by || '-'}</td><td>${o.total_items}</td><td>${o.matched_items || 0}</td><td>${o.surplus_items || 0}</td><td>${o.deficit_items || 0}</td><td>${o.status}</td></tr>`;
    });
    content += '</table><script>window.onload=function(){window.print();};</script></body></html>';

    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) { window.alert('Pop-up blocked! Izinkan pop-up untuk export.'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Stock Opname</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verifikasi stok fisik vs stok sistem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportOpnameCSV(opnames)} className="h-9 px-3 text-xs font-semibold">
            <Download className="w-3.5 h-3.5 mr-1.5" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportOpnamePDF(opnames)} className="h-9 px-3 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-3 text-xs font-semibold">
            <Printer className="w-3.5 h-3.5 mr-1.5" />Print
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Buat Opname
          </Button>
        </div>
      </div>

      <OpnameFlowchart />

      {/* LIST */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>No. Opname</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Dibuat Oleh</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-center">Match</TableHead>
                <TableHead className="text-center">Surplus</TableHead>
                <TableHead className="text-center">Deficit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opnames.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12 text-slate-400">Belum ada sesi opname</TableCell></TableRow>
              ) : opnames.map((o, idx) => (
                <TableRow key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => openDetail(o)}>
                  <TableCell className="text-center text-slate-500 dark:text-slate-400 font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-blue-600">{o.opname_number}</TableCell>
                  <TableCell>{o.opname_date}</TableCell>
                  <TableCell>{o.location}</TableCell>
                  <TableCell className="text-sm text-slate-600">{o.created_by || '-'}</TableCell>
                  <TableCell className="text-center">{o.total_items}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-bold">{o.matched_items || 0}</TableCell>
                  <TableCell className="text-center text-amber-600 font-bold">{o.surplus_items || 0}</TableCell>
                  <TableCell className="text-center text-red-600 font-bold">{o.deficit_items || 0}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[o.status]}>{o.status}</Badge></TableCell>
                  <TableCell><Eye className="w-4 h-4 text-slate-400" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-600" /> Buat Sesi Opname Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal Opname</Label>
                <Input type="date" value={formData.opname_date} onChange={e => setFormData(p => ({ ...p, opname_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Lokasi Penyimpanan</Label>
                <Select value={formData.location} onValueChange={v => setFormData(p => ({ ...p, location: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih lokasi..." /></SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}{loc.address ? ` — ${loc.address}` : ''}</SelectItem>
                    ))}
                    {locations.length === 0 && <SelectItem value="-" disabled>Belum ada lokasi</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Petugas Penghitung</Label>
              <Select value={formData.pic} onValueChange={v => setFormData(p => ({ ...p, pic: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih petugas..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.name || emp.full_name}>{emp.name || emp.full_name}{emp.position ? ` — ${emp.position}` : ''}</SelectItem>
                  ))}
                  {employees.length === 0 && <SelectItem value="-" disabled>Belum ada karyawan</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan tambahan untuk sesi opname ini..." rows={3} />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">Sistem akan memuat <strong>seluruh produk</strong> beserta stok tercatat saat ini. Anda kemudian dapat menginput stok fisik secara manual atau menggunakan scan barcode.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreateSession} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Mulai Opname
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent hideFullscreen={true} className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{showDetail?.opname_number} — {showDetail?.location}</span>
              <Badge className={STATUS_COLORS[showDetail?.status]}>{showDetail?.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">Total</p><p className="text-xl font-black">{summary.total}</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-xs text-blue-500">Terisi</p><p className="text-xl font-black text-blue-700">{summary.filled}</p></div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-emerald-500">Match</p><p className="text-xl font-black text-emerald-700">{summary.match}</p></div>
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-xs text-amber-500">Surplus</p><p className="text-xl font-black text-amber-700">{summary.surplus}</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xs text-red-500">Deficit</p><p className="text-xl font-black text-red-700">{summary.deficit}</p></div>
          </div>

          {/* Search + Scan + Refresh */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..." className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                    <Info className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> Prinsip Snapshot Stok</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                    <p>
                      <strong>Kenapa stok sistem tidak berkurang otomatis?</strong><br />
                      Sistem menggunakan prinsip <em>"Snapshot"</em>. Saat sesi opname dibuat, sistem mengunci data stok saat itu sebagai referensi pembanding.
                    </p>
                    <p>
                      Jika terjadi transaksi (Stock Out/In) saat opname sedang berjalan, angka di tabel master akan berubah, namun angka di sesi opname tetap pada angka awal agar perhitungan selisih tetap konsisten.
                    </p>
                    <p className="p-3 bg-blue-50 rounded-lg text-blue-800 text-xs border border-blue-100">
                      Gunakan tombol <strong>"Refresh Stok"</strong> jika Anda ingin menyinkronkan data sistem dengan Master Produk terbaru sebelum melakukan verifikasi akhir.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              {(showDetail?.status === 'In Progress' || showDetail?.status === 'Draft') && (
                <Button variant="outline" size="sm" onClick={handleRefreshSystemStock} disabled={isSaving} className="h-10 px-3 border-blue-200 text-blue-600 hover:bg-blue-50">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} /> Refresh Stok
                </Button>
              )}

              {(showDetail?.status === 'In Progress' || showDetail?.status === 'Draft') && (
                <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} className="h-10 px-3"><ScanLine className="w-4 h-4 mr-2" /> Scan</Button>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center w-24">Stok Sistem</TableHead>
                  <TableHead className="text-center w-28">Stok Fisik</TableHead>
                  <TableHead className="text-center w-20">Selisih</TableHead>
                  <TableHead className="text-center w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, idx) => (
                  <TableRow key={item.id} className={item.variance_type === 'Surplus' ? 'bg-amber-50/50' : item.variance_type === 'Deficit' ? 'bg-red-50/50' : ''}>
                    <TableCell className="text-xs text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-slate-400">{item.sku}{item.barcode ? ` · ${item.barcode}` : ''}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold">{item.system_stock}</TableCell>
                    <TableCell className="text-center">
                      {showDetail?.status === 'In Progress' || showDetail?.status === 'Draft' ? (
                        <Input id={`input-${item.id}`} type="number" min="0" value={item.physical_stock ?? ''} onChange={e => updatePhysicalStock(item.id, e.target.value)}
                          className="w-20 mx-auto text-center h-8 font-bold" placeholder="—" />
                      ) : (
                        <span className="font-bold">{item.physical_stock ?? '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.physical_stock !== null && (
                        <span className={`font-black ${item.variance > 0 ? 'text-amber-600' : item.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.variance > 0 ? `+${item.variance}` : item.variance}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.physical_stock !== null && (
                        item.variance_type === 'Match' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
                          item.variance_type === 'Surplus' ? <ArrowUpCircle className="w-4 h-4 text-amber-500 mx-auto" /> :
                            <ArrowDownCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4">
            {(showDetail?.status === 'In Progress' || showDetail?.status === 'Draft') && (
              <Button onClick={saveProgress} disabled={isSaving} variant="outline">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Progress
              </Button>
            )}
            {showDetail?.status === 'Completed' && (
              canApproveOpname() ? (
                <>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={async () => {
                      await api.entities.StockOpname.update(showDetail.id, { status: 'Rejected' });
                      toast({ title: "Opname Ditolak" }); setShowDetail(null); loadData();
                    }}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button onClick={handleApprove} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Adjust
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold">Anda tidak memiliki otoritas untuk menyetujui opname ini.</span>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onBarcodeScanned={handleBarcodeScan} />
    </div>
  );
}
