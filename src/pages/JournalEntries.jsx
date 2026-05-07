import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, Loader2, Filter, Eye, CheckCircle2, XCircle, FileText, ArrowRight, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react';
import { api } from '@/api/client';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import { useNavigate } from 'react-router-dom';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';

export default function JournalEntries({ store }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { selectedDate, formattedDate } = useGlobalDate();
  const navigate = useNavigate();

  // Manual Journal Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    lines: [
      { account_name: '', description: '', debit: 0, credit: 0 },
      { account_name: '', description: '', debit: 0, credit: 0 }
    ]
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    if (!store?.id) return;
    setIsLoading(true);
    try {
      const entriesData = await api.entities.JournalEntry.filter({ store_id: store.id }, '-created_at');

      // Filter by global date
      const dateFiltered = entriesData.filter(e => matchesDate(e, selectedDate));
      setEntries(dateFiltered);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCOA = async () => {
    if (store?.id) {
      const data = await api.entities.COA.filter({ store_id: store.id }, 'code');
      setCoaAccounts(data);
    }
  };

  const openManualForm = () => {
    loadCOA();
    setManualForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      lines: [
        { account_name: '', description: '', debit: 0, credit: 0 },
        { account_name: '', description: '', debit: 0, credit: 0 }
      ]
    });
    setShowManualForm(true);
  };

  const addLine = () => {
    setManualForm(prev => ({
      ...prev,
      lines: [...prev.lines, { account_name: '', description: '', debit: 0, credit: 0 }]
    }));
  };

  const removeLine = (idx) => {
    if (manualForm.lines.length <= 2) return;
    setManualForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  };

  const updateLine = (idx, field, value) => {
    setManualForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => i === idx ? { ...line, [field]: value } : line)
    }));
  };

  const totalDebit = manualForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = manualForm.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSaveManualJournal = async () => {
    if (!manualForm.description) {
      toast({ title: "Validation Error", description: "Deskripsi wajib diisi", variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: "Validation Error", description: "Total Debit dan Credit harus sama (balance)", variant: "destructive" });
      return;
    }
    if (manualForm.lines.some(l => !l.account_name)) {
      toast({ title: "Validation Error", description: "Semua baris harus memiliki akun", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const reference = `MAN-${Date.now()}`;
      const journal = await api.entities.JournalEntry.create({
        store_id: store?.id,
        transaction_id: reference,
        date: manualForm.date,
        description: manualForm.description,
        type: 'Manual',
        status: 'Draft',
        total_debit: totalDebit,
        total_credit: totalCredit,
        created_by: 'Administrator',
        notes: manualForm.notes
      });

      await Promise.all(manualForm.lines.map(line =>
        api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: line.account_name,
          description: line.description,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0
        })
      ));

      setShowManualForm(false);
      loadData();
      toast.success('Jurnal manual berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = entries.filter(entry => {
    const matchesSearch =
      entry.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
      entry.description?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || entry.type?.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || entry.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAcceptAll = async () => {
    const draftEntries = filteredData.filter(e => e.status === 'Draft');
    if (draftEntries.length === 0) {
      toast.error('Tidak ada jurnal Draft yang perlu diposting pada tanggal ini.');
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(draftEntries.map(entry =>
        api.entities.JournalEntry.update(entry.id, { status: 'Posted' })
      ));
      toast.success(`${draftEntries.length} Jurnal berhasil diposting (Accepted All)`);
      loadData();
    } catch (err) {
      toast.error('Gagal memposting jurnal: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'posted': return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 rounded-full font-bold">Posted</Badge>;
      case 'void': return <Badge className="bg-red-100 text-red-700 border-none px-3 py-1 rounded-full font-bold">Void</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 rounded-full font-bold">Draft</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      receipt: 'bg-blue-50 text-blue-600',
      payment: 'bg-orange-50 text-orange-600',
      grn: 'bg-purple-50 text-purple-600',
      sales: 'bg-emerald-50 text-emerald-600',
      receivable: 'bg-cyan-50 text-cyan-600',
      payable: 'bg-rose-50 text-rose-600',
      manual: 'bg-slate-100 text-slate-700'
    };
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${colors[type?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
        {type || 'General'}
      </span>
    );
  };

  // Manual Journal Form View
  if (showManualForm) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowManualForm(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buat Journal Entry Manual</h1>
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <p className="text-sm text-slate-500 font-medium -mt-4 ml-14">Jurnal penyesuaian atau transaksi manual</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date & Description */}
            <Card className="rounded-xl border-none shadow-sm">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tanggal Entry *</Label>
                    <Input
                      type="date"
                      value={manualForm.date}
                      onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi *</Label>
                    <Input
                      placeholder="Jurnal penyesuaian..."
                      value={manualForm.description}
                      onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journal Lines */}
            <Card className="rounded-xl border-none shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-900">Baris Jurnal</h3>
                  <Button onClick={addLine} variant="outline" className="h-10 rounded-xl font-bold gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Baris
                  </Button>
                </div>

                <div className="space-y-4">
                  {manualForm.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="col-span-3">
                        <Select
                          value={line.account_name}
                          onValueChange={v => updateLine(idx, 'account_name', v)}
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 font-bold text-sm">
                            <SelectValue placeholder="Pilih Akun..." />
                          </SelectTrigger>
                          <SelectContent>
                            {coaAccounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.name}>
                                <span className="text-slate-400 mr-2">{acc.code}</span>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Deskripsi"
                          value={line.description}
                          onChange={e => updateLine(idx, 'description', e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-200 font-medium text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <NumberInput
                          placeholder="0"
                          value={line.debit || ''}
                          onChange={e => updateLine(idx, 'debit', e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-200 font-bold text-sm text-right"
                        />
                      </div>
                      <div className="col-span-2">
                        <NumberInput
                          placeholder="0"
                          value={line.credit || ''}
                          onChange={e => updateLine(idx, 'credit', e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-200 font-bold text-sm text-right"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(idx)}
                          disabled={manualForm.lines.length <= 2}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Column Labels */}
                <div className="grid grid-cols-12 gap-3 mt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-3">Akun</div>
                  <div className="col-span-4">Deskripsi</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-2 text-right">Credit</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Totals */}
                <div className="flex items-center justify-center gap-12 mt-8 pt-6 border-t-2 border-slate-100">
                  <p className="text-sm font-black text-blue-600">Total Debit: <span className="text-lg">Rp {formatCurrency(totalDebit)}</span></p>
                  <p className="text-sm font-black text-orange-600">Total Credit: <span className="text-lg">Rp {formatCurrency(totalCredit)}</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="rounded-xl border-none shadow-sm">
              <CardContent className="p-8">
                <Label className="mb-3 block">Catatan</Label>
                <Textarea
                  placeholder="Catatan tambahan..."
                  value={manualForm.notes}
                  onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="rounded-xl bg-slate-50 border-none font-medium min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: Validation Panel */}
          <div className="space-y-6">
            <Card className="rounded-xl border-none shadow-sm sticky top-8">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-lg font-black text-slate-900">Validasi</h3>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className={`text-sm font-bold ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isBalanced ? 'Journal Balance ✓' : totalDebit === totalCredit ? 'Masukkan nilai > 0' : 'Belum Balance'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
                  <p className="text-slate-600">Baris: <span className="font-bold text-slate-900">{manualForm.lines.length}</span></p>
                  <p className="text-slate-600">Status: <span className="font-bold text-amber-600">Draft</span> (belum mempengaruhi saldo)</p>
                </div>

                <Button
                  onClick={handleSaveManualJournal}
                  disabled={isSaving || !isBalanced}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Simpan Journal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Premium Header */}
      <PageHeader
        title="Journal Entries"
        subtitle="Pusat pencatatan akuntansi dan validasi transaksi"
        icon={BookOpen}
        actions={
          <>
            <ExportToolbar
              title="Daftar Jurnal Umum"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-journal"
            />
            <Button onClick={handleAcceptAll} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold text-white transition-all">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept All
            </Button>
            <Button onClick={openManualForm} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 rounded-xl font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Jurnal Manual
            </Button>
          </>
        }
      />

      <PageDatePicker />

      {/* Filters Bar */}
      <Card className="rounded-xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-6 bg-white flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nomor, deskripsi, atau referensi..."
              className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-medium focus-visible:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-12 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Semua Tipe</option>
            <option value="receipt">Penerimaan Kas (Receipt)</option>
            <option value="payment">Pengeluaran Kas (Payment)</option>
            <option value="sales">Penjualan (Sales)</option>
            <option value="grn">Penerimaan Barang (GRN)</option>
            <option value="receivable">Piutang (Receivable)</option>
            <option value="payable">Hutang (Payable)</option>
            <option value="manual">Manual</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="void">Void</option>
          </select>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-journal">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>No. Jurnal / Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan="8" className="px-8 py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 opacity-20" /></td></tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <BookOpen className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="font-black text-slate-400">Tidak ada Entri Jurnal</p>
                        <p className="text-sm text-slate-400 mt-1">Jurnal akan otomatis tercipta ketika terjadi transaksi keuangan.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((entry, idx) => (
                    <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 text-slate-400 font-bold text-sm">{idx + 1}</td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 text-sm">JV-{entry.transaction_id?.split('-').pop() || entry.id?.substring(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-slate-500 font-medium">{new Date(entry.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-sm truncate max-w-[300px]">{entry.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Ref: {entry.transaction_id}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">{getTypeBadge(entry.type)}</td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 text-sm">Rp {formatCurrency(entry.total_debit)}</td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 text-sm">Rp {formatCurrency(entry.total_credit)}</td>
                      <td className="px-8 py-6 text-center">{getStatusBadge(entry.status)}</td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/JournalEntries/${entry.id}`)}
                            className="w-10 h-10 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                          {entry.status === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/JournalEntries/${entry.id}`)}
                              className="w-10 h-10 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
