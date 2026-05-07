import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Edit, Trash2, Users, TrendingUp, Layers, PieChart as PieChartIcon,
  Zap, AlertCircle, Award, History, ArrowRight, Target, Info
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid
} from 'recharts';
import moment from 'moment';

const SEGMENT_CONFIG = {
  'Champions': { color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Award, action: 'Beri Reward VIP', actionDesc: 'Berikan akses eksklusif atau diskon khusus sebagai apresiasi kepada pelanggan terbaik Anda agar mereka merasa dihargai.' },
  'Loyal Customers': { color: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-700', icon: Zap, action: 'Tawarkan Membership/Bundle Rutin', actionDesc: 'Tawarkan program keanggotaan VIP atau paket belanja rutin bulanan. Karena mereka sering berbelanja barang Anda, ini akan mengunci loyalitas mereka agar tidak beralih ke kompetitor.' },
  'Potential Loyalist': { color: '#7c3aed', bg: 'bg-violet-50', text: 'text-violet-700', icon: TrendingUp, action: 'Kirim Kupon Upsell', actionDesc: 'Tawarkan potongan harga khusus untuk pembelian produk dengan nilai yang lebih tinggi (upselling) agar nilai belanja mereka meningkat.' },
  'New Customers': { color: '#0891b2', bg: 'bg-cyan-50', text: 'text-cyan-700', icon: Plus, action: 'Kirim Welcome Promo', actionDesc: 'Berikan kesan pertama yang baik dengan diskon khusus untuk pembelian kedua mereka agar mereka kembali berbelanja.' },
  'At Risk': { color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle, action: 'Kirim Promo Win-Back', actionDesc: 'Kirimkan email personal dengan penawaran spesial atau diskon besar untuk memancing mereka berbelanja kembali.' },
  'Lost': { color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700', icon: History, action: 'Coba Re-engagement', actionDesc: 'Kirimkan survei, email sapaan, atau penawaran cuci gudang terakhir sebelum mereka benar-benar dihapus dari target promosi.' },
};

const CustomTooltip = ({ children, text }) => (
  <Popover>
    <PopoverTrigger asChild>
      <span className="cursor-pointer inline-flex items-center">
        {children}
      </span>
    </PopoverTrigger>
    <PopoverContent side="top" align="center" sideOffset={8} className="w-64 p-3 bg-slate-900 text-slate-200 border-slate-700 text-xs shadow-2xl z-[99999]" style={{ lineHeight: '1.5' }}>
      {text}
    </PopoverContent>
  </Popover>
);

export default function CustomerSegmentation({ store }) {
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [formData, setFormData] = useState({
    segment_name: '',
    description: '',
    min_spending: '',
    max_spending: '',
    loyalty_tier: '',
    category_preference: ''
  });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    try {
      const [segData, custData, transData, loyalData] = await Promise.all([
        api.entities.CustomerSegment.filter({ store_id: store.id }),
        api.entities.Customer.filter({ store_id: store.id }),
        api.entities.SalesTransaction.filter({ store_id: store.id }),
        api.entities.CustomerLoyalty.filter({ store_id: store.id })
      ]);
      setSegments(segData);
      setCustomers(custData);
      setTransactions(transData);
      setLoyaltyData(loyalData);
    } catch (err) {
      console.error('Error loading segmentation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // === PROFESSIONAL RFM LOGIC ===
  const rfmSegments = useMemo(() => {
    if (!customers.length || !transactions.length) return [];

    const now = moment();

    const customerStats = customers.map(customer => {
      const custTrans = transactions.filter(t => t.customer_id === customer.id);
      const totalSpend = custTrans.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const lastTrans = custTrans.length ? moment(custTrans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at) : null;
      const recency = lastTrans ? now.diff(lastTrans, 'days') : 999;
      const frequency = custTrans.length;

      // Basic RFM Scoring (1-5)
      let r = recency <= 30 ? 5 : recency <= 60 ? 4 : recency <= 120 ? 3 : recency <= 180 ? 2 : 1;
      let f = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
      let m = totalSpend >= 5000000 ? 5 : totalSpend >= 2000000 ? 4 : totalSpend >= 1000000 ? 3 : totalSpend >= 500000 ? 2 : 1;

      // Mapping Logic
      let segment = 'New Customers';
      if (r >= 4 && f >= 4 && m >= 4) segment = 'Champions';
      else if (r >= 3 && f >= 3) segment = 'Loyal Customers';
      else if (r >= 3 && f >= 1) segment = 'Potential Loyalist';
      else if (recency > 180 || r < 1) segment = 'Lost';
      else if (r <= 2) segment = 'At Risk';

      return { ...customer, recency, frequency, monetary: totalSpend, segment };
    });

    // Group by segment for visualization
    const groups = Object.keys(SEGMENT_CONFIG).map(name => {
      const members = customerStats.filter(c => c.segment === name);
      return {
        name,
        value: members.length,
        avgMonetary: members.length ? members.reduce((s, m) => s + m.monetary, 0) / members.length : 0,
        color: SEGMENT_CONFIG[name].color,
        customers: members
      };
    }).filter(g => g.value > 0);

    return groups;
  }, [customers, transactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const criteria = {
      min_spending: Number(formData.min_spending) || 0,
      max_spending: Number(formData.max_spending) || null,
      loyalty_tier: formData.loyalty_tier || null,
      category_preference: formData.category_preference || null
    };

    const data = {
      store_id: store.id,
      segment_name: formData.segment_name,
      description: formData.description,
      criteria,
      customer_count: 0 // Will be calculated on display
    };

    editingSegment
      ? await api.entities.CustomerSegment.update(editingSegment.id, data)
      : await api.entities.CustomerSegment.create(data);

    setShowForm(false);
    setEditingSegment(null);
    setFormData({ segment_name: '', description: '', min_spending: '', max_spending: '', loyalty_tier: '', category_preference: '' });
    loadData();
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

  if (isLoading) return <div className="space-y-4 p-8"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Marketing Intelligence"
        subtitle="Analisis RFM & Segmentasi Pelanggan Otomatis"
        icon={Target}
        actions={
          <Button onClick={() => { setEditingSegment(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold rounded-xl text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4 mr-2" />
            Buat Segmen Manual
          </Button>
        }
      />

      {/* RFM INFO PANEL */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm mb-2">Cara Kerja Segmentasi RFM</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-blue-100">
                <div className="flex gap-2"><span className="font-black text-white">R</span> <span><b>Recency</b> — Kapan terakhir pelanggan berbelanja? Semakin baru = skor lebih tinggi.</span></div>
                <div className="flex gap-2"><span className="font-black text-white">F</span> <span><b>Frequency</b> — Berapa sering pelanggan bertransaksi? Semakin sering = skor lebih tinggi.</span></div>
                <div className="flex gap-2"><span className="font-black text-white">M</span> <span><b>Monetary</b> — Berapa total belanja pelanggan? Semakin besar = skor lebih tinggi.</span></div>
              </div>
              <p className="text-[10px] text-blue-200 mt-2 flex items-center flex-wrap gap-x-2">
                Sistem otomatis menghitung skor 1-5 untuk setiap pelanggan, lalu mengelompokkan mereka ke segmen seperti Champions, Loyal, At Risk, dll. Klik card segmen untuk melihat daftar pelanggan.
                <CustomTooltip text="Pelanggan yang tidak melakukan transaksi selama lebih dari 180 hari akan otomatis dipindahkan ke segmen 'Lost'.">
                  <span className="inline-flex items-center gap-1 font-bold text-white bg-white/10 px-1.5 py-0.5 rounded transition-colors hover:bg-white/20">
                    <Info className="w-3 h-3" /> Info Tambahan
                  </span>
                </CustomTooltip>
              </p>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
      </Card>

      {/* DASHBOARD INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={120} /></div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-black tracking-tight"><PieChartIcon className="w-5 h-5 text-blue-400" /> Distribusi Pelanggan</CardTitle>
            <CardDescription className="text-slate-400">Berdasarkan skor RFM (Recency, Frequency, Monetary)</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rfmSegments}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {rfmSegments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6 grid grid-cols-2 gap-2">
            {rfmSegments.slice(0, 4).map(s => (
              <div key={s.name} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300 truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-black tracking-tight text-slate-800"><TrendingUp className="w-5 h-5 text-emerald-500" /> Performa Nilai Belanja</CardTitle>
            <CardDescription>Rata-rata pengeluaran per segmen pelanggan</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rfmSegments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="avgMonetary" radius={[6, 6, 0, 0]}>
                  {rfmSegments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automated" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="automated" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Auto-RFM Segments</TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Custom Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="automated">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rfmSegments.map(seg => {
              const config = SEGMENT_CONFIG[seg.name];
              const Icon = config.icon;
              return (
                <Card key={seg.name} className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]" onClick={() => setSelectedSegment(seg)}>
                  <div className={`h-1.5 w-full`} style={{ backgroundColor: config.color }} />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${config.text}`} />
                      </div>
                      <Badge variant="outline" className="font-black">{seg.value} Customers</Badge>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-1">{seg.name}</h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Avg. Spend: <span className="font-bold text-slate-700">{formatCurrency(seg.avgMonetary)}</span>
                    </p>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recomended Action</span>
                      <span className={`text-[11px] font-black ${config.text} flex items-center gap-1`}>
                        {config.action} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-none">
                    <TableHead >Segment Name</TableHead>
                    <TableHead >Criteria</TableHead>
                    <TableHead className="text-center">Audience</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 flex flex-col items-center gap-3">
                      <Info size={40} className="opacity-20" />
                      Belum ada segmen manual dibuat
                    </TableCell></TableRow>
                  ) : (
                    segments.map(seg => (
                      <TableRow key={seg.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <p className="font-black text-slate-800">{seg.segment_name}</p>
                          <p className="text-xs text-slate-500 italic">{seg.description || 'No description'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {seg.criteria?.min_spending > 0 && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">Spend &gt; {formatCurrency(seg.criteria.min_spending)}</Badge>}
                            {seg.criteria?.loyalty_tier && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none">Tier: {seg.criteria.loyalty_tier}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-black text-slate-800">{seg.customer_count || 0}</span>
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Users</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="hover:bg-blue-50 rounded-full" onClick={() => handleEdit(seg)}><Edit className="w-4 h-4 text-slate-400" /></Button>
                            <Button variant="ghost" size="icon" className="hover:bg-red-50 rounded-full" onClick={() => handleDelete(seg.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl rounded-3xl p-8 border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">{editingSegment ? 'Edit Segmen Manual' : 'Buat Segmen Manual'}</DialogTitle>
            <p className="text-sm text-slate-500">Tentukan kriteria khusus untuk mengelompokkan pelanggan Anda.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Segmen</Label>
                <Input className="h-12 rounded-xl border-slate-200 bg-slate-50/50" value={formData.segment_name} onChange={(e) => setFormData({ ...formData, segment_name: e.target.value })} required placeholder="Misal: Big Spenders Jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Deskripsi</Label>
                <Input className="h-12 rounded-xl border-slate-200 bg-slate-50/50" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Keterangan singkat segmen..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Min. Spending</Label>
                  <Input type="number" className="h-12 rounded-xl border-slate-200 bg-slate-50/50" value={formData.min_spending} onChange={(e) => setFormData({ ...formData, min_spending: e.target.value })} placeholder="Rp 0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tier Loyalitas</Label>
                  <select value={formData.loyalty_tier} onChange={(e) => setFormData({ ...formData, loyalty_tier: e.target.value })} className="w-full h-12 px-4 border border-slate-200 bg-slate-50/50 rounded-xl text-sm mt-0 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Semua Tier</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white">Simpan Segmen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SEGMENT DETAIL DIALOG */}
      <Dialog open={!!selectedSegment} onOpenChange={() => setSelectedSegment(null)}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedSegment && (() => {
            const config = SEGMENT_CONFIG[selectedSegment.name];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                      <config.icon className={`w-5 h-5 ${config.text}`} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black">{selectedSegment.name}</DialogTitle>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedSegment.value} pelanggan · Avg. Spend: {formatCurrency(selectedSegment.avgMonetary)}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto mt-4">
                  <div className="p-3 rounded-xl mb-4 flex items-center justify-between" style={{ backgroundColor: config.color + '15' }}>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold" style={{ color: config.color }}>
                        💡 Recommended Action: {config.action}
                      </p>
                      <CustomTooltip text={config.actionDesc}>
                        <Info className="w-4 h-4 transition-opacity hover:opacity-70" style={{ color: config.color }} />
                      </CustomTooltip>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead >Nama</TableHead>
                        <TableHead >Kontak</TableHead>
                        <TableHead className="text-center">Frekuensi</TableHead>
                        <TableHead className="text-center">Recency</TableHead>
                        <TableHead className="text-right">Total Belanja</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSegment.customers?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Tidak ada pelanggan dalam segmen ini</TableCell></TableRow>
                      ) : (
                        selectedSegment.customers?.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-bold text-sm">{c.name}</TableCell>
                            <TableCell className="text-xs text-slate-500">{c.phone || c.email || '-'}</TableCell>
                            <TableCell className="text-center font-bold">{c.frequency}x</TableCell>
                            <TableCell className="text-center text-xs">{c.recency} hari lalu</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(c.monetary)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
