import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Layers,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Book,
  Download,
  Printer,
  Info,
  AlertTriangle,
  List
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export default function ChartOfAccounts({ store }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [balances, setBalances] = useState({});
  const [summary, setSummary] = useState({ Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Asset',
    normal_balance: 'Debit',
    description: ''
  });

  const categories = [
    { name: 'Asset', color: 'bg-emerald-500', icon: ArrowUpRight, textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { name: 'Liability', color: 'bg-red-500', icon: ArrowDownLeft, textColor: 'text-red-600', bgColor: 'bg-red-50' },
    { name: 'Equity', color: 'bg-blue-600', icon: Layers, textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Revenue', color: 'bg-indigo-600', icon: Plus, textColor: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { name: 'Expense', color: 'bg-orange-500', icon: Trash2, textColor: 'text-orange-600', bgColor: 'bg-orange-50' }
  ];

  useEffect(() => {
    if (store?.id) loadAccounts();
  }, [store]);

  const loadAccounts = async () => {
    setIsLoading(true);
    let data = await api.entities.COA.filter({ store_id: store.id }, 'code');

    if (data.length === 0) {
      // Seed initial accounts
      const initial = [
        { code: '1-1100', name: 'Bank BCA', category: 'Asset', normal_balance: 'Debit' },
        { code: '1-1200', name: 'Kas Kecil', category: 'Asset', normal_balance: 'Debit' },
        { code: '1-1300', name: 'Piutang Usaha', category: 'Asset', normal_balance: 'Debit' },
        { code: '1-1400', name: 'Persediaan', category: 'Asset', normal_balance: 'Debit' },
        { code: '2-2100', name: 'Hutang Usaha', category: 'Liability', normal_balance: 'Credit' },
        { code: '3-3100', name: 'Modal Awal', category: 'Equity', normal_balance: 'Credit' },
        { code: '4-4100', name: 'Pendapatan Jasa', category: 'Revenue', normal_balance: 'Credit' },
        { code: '5-5100', name: 'Biaya Operasional', category: 'Expense', normal_balance: 'Debit' }
      ];
      await Promise.all(initial.map(acc => api.entities.COA.create({ ...acc, store_id: store.id })));
      data = await api.entities.COA.filter({ store_id: store.id }, 'code');
    }

    // Compute balances
    try {
      const journals = await api.entities.JournalEntry.filter({ store_id: store?.id });
      const postedJournalIds = new Set(journals.filter(j => j.status === 'Posted').map(j => j.id));

      const allLines = await api.entities.JournalLine.filter();
      const validLines = allLines.filter(l => postedJournalIds.has(l.journal_id));

      const newBalances = {};
      const newSummary = { Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 };

      data.forEach(acc => { newBalances[acc.name] = 0; });

      validLines.forEach(line => {
        const lineName = (line.account_name || '').toLowerCase().trim();
        const account = data.find(a => {
          const aName = a.name.toLowerCase().trim();
          return aName === lineName || aName.includes(lineName) || lineName.includes(aName);
        });

        if (account) {
          const debit = Number(line.debit) || 0;
          const credit = Number(line.credit) || 0;
          if (account.normal_balance === 'Debit') {
            newBalances[account.name] += (debit - credit);
          } else {
            newBalances[account.name] += (credit - debit);
          }
        }
      });

      data.forEach(acc => {
        if (newSummary[acc.category] !== undefined) {
          newSummary[acc.category] += newBalances[acc.name];
        }
      });

      setSummary(newSummary);
      setBalances(newBalances);
    } catch (e) {
      console.error('Error calculating balances', e);
    }

    setAccounts(data);
    setIsLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAccount) {
        await api.entities.COA.update(editingAccount.id, formData);
      } else {
        await api.entities.COA.create({ ...formData, store_id: store.id });
      }
      setShowForm(false);
      setEditingAccount(null);
      setFormData({ code: '', name: '', category: 'Asset', normal_balance: 'Debit', description: '' });
      loadAccounts();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus akun ini?')) return;
    await api.entities.COA.delete(id);
    loadAccounts();
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(search.toLowerCase()) ||
    acc.code.includes(search)
  );

  const groupedAccounts = categories.map(cat => ({
    ...cat,
    items: filteredAccounts.filter(acc => acc.category === cat.name)
  }));

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const handleExportCSV = () => {
    try {
      const dataToExport = accounts.map((acc, index) => ({
        'No.': index + 1,
        'Kode': acc.code,
        'Nama Akun': acc.name,
        'Tipe': acc.category,
        'Normal Balance': acc.normal_balance,
        'Saldo': balances[acc.name] || 0
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Chart of Accounts");
      XLSX.writeFile(wb, `COA_${new Date().getTime()}.csv`);
      toast.success('File CSV berhasil diunduh');
    } catch (e) {
      toast.error('Gagal export CSV: ' + e.message);
    }
  };

  const handleExportPDF = () => {
    try {
      const element = document.getElementById('coa-report-content');
      if (!element) return;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `COA_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      toast.promise(html2pdf().set(opt).from(element).save(), {
        loading: 'Menyiapkan PDF...',
        success: 'PDF berhasil diunduh!',
        error: 'Gagal mencetak PDF'
      });
    } catch (e) {
      toast.error('Gagal mencetak PDF: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-transparent p-4 md:p-8 space-y-6" id="coa-report-content">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Daftar Akun Standar Akuntansi Perusahaan"
        icon={List}
        actions={
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-xl font-bold gap-2"
          >
            <Plus className="w-5 h-5" />
            Tambah Akun
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Aset', value: summary.Asset, color: 'text-emerald-600' },
          { label: 'Kewajiban', value: summary.Liability, color: 'text-emerald-600' },
          { label: 'Ekuitas', value: summary.Equity, color: 'text-emerald-600' },
          { label: 'Pendapatan', value: summary.Revenue, color: 'text-emerald-600' },
          { label: 'Beban', value: summary.Expense, color: 'text-emerald-600' }
        ].map((stat, idx) => (
          <Card key={idx} className="rounded-xl border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-500">{stat.label}</p>
              <p className={`text-lg font-black mt-1 ${stat.color}`}>
                <AnimatedNumber value={stat.value} prefix="Rp " />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Export */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-xl">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari kode atau nama akun..."
            className="h-12 pl-10 bg-white border-slate-200 rounded-xl text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto print:hidden" data-html2canvas-ignore>
          <Select value="Semua Tipe">
            <SelectTrigger className="w-full md:w-40 bg-white h-12 rounded-xl border-slate-200 text-sm font-medium">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Tipe">Semua Tipe</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" className="h-12 bg-white rounded-xl text-slate-600 border-slate-200 font-bold px-4">
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="h-12 bg-emerald-50 text-emerald-600 rounded-xl border-emerald-200 font-bold px-4 hover:bg-emerald-100 hover:text-emerald-700">
            <Printer className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Account Groups in Table Format */}
      <div className="space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500 opacity-20" /></div>
        ) : groupedAccounts.map(group => group.items.length > 0 && (
          <div key={group.name} className="space-y-4">
            <div className="flex items-center gap-3 px-4">
              <div className={`w-10 h-10 rounded-xl ${group.color} flex items-center justify-center text-white shadow-lg`}>
                <group.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800">{group.name}</h2>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors outline-none">
                      <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 cursor-pointer" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="max-w-xs p-4 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                    <div className="space-y-2">
                      <p className="font-bold text-blue-600">{group.name} - Panduan Akun</p>
                      <p className="text-[11px] leading-relaxed">
                        {group.name === 'Asset' && "Aset adalah sumber daya yang dimiliki bisnis (Kas, Bank, Piutang, Persediaan). Saldo bertambah di Debit."}
                        {group.name === 'Liability' && "Kewajiban adalah hutang bisnis kepada pihak lain. Saldo bertambah di Kredit."}
                        {group.name === 'Equity' && "Ekuitas adalah hak pemilik atas aset setelah dikurangi kewajiban. Saldo bertambah di Kredit."}
                        {group.name === 'Revenue' && "Pendapatan adalah hasil dari penjualan jasa atau produk. Saldo bertambah di Kredit."}
                        {group.name === 'Expense' && "Beban adalah biaya yang dikeluarkan untuk operasional. Saldo bertambah di Debit."}
                      </p>
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Tips Sinkronisasi:</p>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Yang harus disamakan adalah <b>NAMA AKUN</b> (contoh: <i>Pendapatan Penjualan</i>), bukan Nomor Jurnal (contoh: <i>JV-xxx</i>). Pastikan Nama Akun di sini sama persis dengan yang muncul di Jurnal agar saldo terhitung otomatis.
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="h-px bg-slate-200 flex-1 ml-4" />
            </div>

            <Card className="rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 w-12">No.</TableHead>
                      <TableHead className="w-40">Kode</TableHead>
                      <TableHead>Nama Akun</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-center">Normal Balance</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right pr-8 print:hidden">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((acc, idx) => (
                      <TableRow key={acc.id} className="group hover:bg-slate-50/30 transition-colors">
                        <TableCell className="pl-8 font-medium text-slate-400 text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-black text-slate-400 italic text-sm">{acc.code}</TableCell>
                        <TableCell className="font-bold text-slate-900">{acc.name}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${group.bgColor} ${group.textColor} text-[10px] font-black capitalize tracking-widest`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${group.color}`} />
                            {acc.category}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${acc.normal_balance === 'Debit' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} border-none font-bold px-3 py-1 rounded-full text-[10px] lowercase`}>
                            {acc.normal_balance}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-600">
                          {formatCurrency(balances[acc.name])}
                        </TableCell>
                        <TableCell className="text-right pr-8 print:hidden" data-html2canvas-ignore>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAccount(acc);
                                setFormData(acc);
                                setShowForm(true);
                              }}
                              className="w-10 h-10 rounded-xl hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(acc.id)}
                              className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingAccount(null);
          setFormData({ code: '', name: '', category: 'Asset', normal_balance: 'Debit', description: '' });
        }
      }}>
        <DialogContent className="rounded-xl border-none p-8 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-400 uppercase">Kode Akun *</Label>
                <Input
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. 1-1100"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-400 uppercase">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={v => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400 uppercase">Nama Akun *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kas Besar"
                className="h-12 rounded-xl bg-slate-50 border-none font-black text-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400 uppercase">Saldo Normal *</Label>
              <Select
                value={formData.normal_balance}
                onValueChange={v => setFormData({ ...formData, normal_balance: v })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit (+ di Kiri)</SelectItem>
                  <SelectItem value="Credit">Credit (+ di Kanan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="flex-1 h-12 rounded-xl font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan Akun
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
