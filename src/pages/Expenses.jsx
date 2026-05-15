import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText, Loader2, ArrowDownCircle, Trash2, Eye, ChevronDown, ChevronUp, ReceiptText } from 'lucide-react';
import { api } from '@/api/client';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Wallet } from 'lucide-react';
import { getEffectiveLimits } from '@/planConfig';

const EXPENSE_CATEGORIES = [
  'Gaji Karyawan',
  'Sewa Tempat',
  'Listrik & Air',
  'Internet & Komunikasi',
  'Pemasaran & Iklan',
  'Alat Tulis Kantor',
  'Biaya Bank & Administrasi',
  'Pajak',
  'Transportasi & Pengiriman',
  'Lain-lain'
];

export default function Expenses({ store }) {
  const { toast } = useToast();
  const [allExpenses, setAllExpenses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { selectedDate, formattedDate } = useGlobalDate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
    category: '',
    amount: '',
    displayAmount: '',
    notes: ''
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expenseData, accountData] = await Promise.all([
        api.entities.Expense.filter({}, '-date'),
        api.entities.BankAccount.filter({})
      ]);
      setAllExpenses(expenseData.filter(e => e.category !== 'Pembelian Produk (HPP)'));
      setBankAccounts(accountData);
      if (accountData.length > 0 && !formData.bank_account_id) {
        setFormData(prev => ({ ...prev, bank_account_id: accountData[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (val) => {
    const cleanValue = val.replace(/\D/g, '');
    if (cleanValue === '') {
      setFormData({ ...formData, amount: '', displayAmount: '' });
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(cleanValue);
    setFormData({ ...formData, amount: cleanValue, displayAmount: formatted });
  };

  const getCurrentTimeWIB = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 60 * 60000));
    return `${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.date) {
      toast({ title: "Validation Error", description: "Lengkapi data yang wajib (Tanggal, Kategori, Jumlah)", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const limits = getEffectiveLimits(store);
      if (limits.maxExpenses !== Infinity && allExpenses.length >= limits.maxExpenses) {
        toast({
          title: "Batas Operational Expenses Tercapai",
          description: `Anda telah mencapai batas maksimal pencatatan beban operasional (${limits.maxExpenses} data). Silakan upgrade ke Pro untuk akses tanpa batas.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const amountNumeric = Number(formData.amount);
      const trxId = `OPEX-${Date.now().toString(36).toUpperCase()}`;
      
      // 1. Save Expense
      await api.entities.Expense.create({
        date: formData.date,
        category: formData.category,
        amount: amountNumeric,
        notes: formData.notes,
        created_date: formData.date,
        reference: trxId
      });

      // 2. Journal Entries
      const selectedBank = bankAccounts.find(b => b.id === formData.bank_account_id);
      
      await api.entities.JournalEntry.create({
        transaction_id: trxId,
        date: formData.date,
        account_name: 'Beban ' + formData.category,
        account_type: 'Biaya',
        debit: amountNumeric,
        credit: 0,
        description: `Beban ${formData.category} - ${formData.notes || 'Pembayaran via ' + (selectedBank?.bank_name || 'Kas')}`
      });

      await api.entities.JournalEntry.create({
        transaction_id: trxId,
        date: formData.date,
        account_name: selectedBank?.bank_name || 'Kas',
        account_type: 'Aset',
        debit: 0,
        credit: amountNumeric,
        description: `Pembayaran Beban ${formData.category} - ${formData.notes || ''}`
      });

      // 3. Bank Transaction & Balance Update
      const timeStr = getCurrentTimeWIB();
      const currentBalance = Number(selectedBank?.balance || 0);
      const newBalance = currentBalance - amountNumeric;

      // Update bank account balance
      if (selectedBank?.id) {
        await api.entities.BankAccount.update(selectedBank.id, {
          balance: newBalance
        });
      }

      await api.entities.BankTransaction.create({
        store_id: store?.id || '',
        bank_account_id: formData.bank_account_id,
        bank_name: selectedBank?.bank_name || 'Kas',
        transaction_type: 'Debit',
        amount: amountNumeric,
        description: `Beban ${formData.category}: ${formData.notes || ''}`,
        reference: trxId,
        status: 'Approved',
        created_date: formData.date,
        timestamp_wib: `${formData.date.split('-').reverse().join('/')} ${timeStr}`,
        balance_after: newBalance
      });

      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bank_account_id: bankAccounts[0]?.id || '',
        category: '',
        amount: '',
        displayAmount: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data pengeluaran ini?')) return;
    try {
      await api.entities.Expense.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const expenses = allExpenses.filter(exp => matchesDate(exp, selectedDate));
  const filteredData = expenses.filter(exp => 
    exp.category?.toLowerCase().includes(search.toLowerCase()) || 
    exp.notes?.toLowerCase().includes(search.toLowerCase())
  );
  const totalAmount = filteredData.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const categoryTotals = {};
  filteredData.forEach(exp => {
    if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
    categoryTotals[exp.category] += Number(exp.amount || 0);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Expenses"
        subtitle="Rekapitulasi beban operasional usaha"
        icon={ReceiptText}
        actions={
          <>
            <ExportToolbar 
              title="Laporan Beban Operasional" 
              date={formattedDate} 
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-expenses-detailed" 
              store={store}
            />
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Catat Pengeluaran Baru
            </Button>
          </>
        }
      />
      <PageDatePicker />

      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ringkasan Beban per Kategori</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase flex items-center gap-1"
        >
          {isExpanded ? (
            <>Sembunyikan <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Lihat Semua <ChevronDown className="w-3 h-3" /></>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 relative overflow-hidden border-none bg-gradient-to-br from-red-500 to-red-700 transition-all hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative min-h-[4rem]">
              <div className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-14 md:pr-16">
                <p className="text-base font-medium text-white/90 drop-shadow-sm mb-1">Total Pengeluaran</p>
                <p className="text-2xl font-black text-white mt-2 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={totalAmount} prefix="Rp " />
                </p>
                <p className="text-[10px] font-bold text-white/80 mt-1 uppercase">{filteredData.length} transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, isExpanded ? undefined : 3)
          .map(([cat, total]) => (
            <Card key={cat} className="border-slate-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
              <CardContent className="p-6">
                <p className="text-base font-medium text-slate-500 truncate">{cat}</p>
                <p className="text-xl font-black text-slate-800 mt-2">Rp {total.toLocaleString('id-ID')}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{((total / totalAmount) * 100).toFixed(1)}% dari total</p>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Card className="rounded-xl border-none shadow-xl shadow-blue-100/50 overflow-hidden" id="print-expenses-detailed">
        <CardHeader className="py-6 border-b px-8 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan kategori atau catatan..."
              className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 transition-all max-w-md"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-8 py-4 text-left w-12">No.</th>
                  <th className="px-8 py-4 text-left">Tanggal & Ref</th>
                  <th className="px-6 py-4 text-left">Kategori</th>
                  <th className="px-6 py-4 text-left">Keterangan</th>
                  <th className="px-6 py-4 text-right">Jumlah</th>
                  <th className="px-8 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center">
                      <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4 opacity-20" />
                      <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Tidak ada data ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{exp.reference || '-'}</span>
                          <span className="font-bold text-slate-900 leading-none">
                            {new Date(exp.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-600 font-medium">{exp.notes || '-'}</td>
                      <td className="px-6 py-5 font-black text-red-600 text-right">Rp {Number(exp.amount).toLocaleString('id-ID')}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingExpense(exp)} className="h-8 w-8 rounded-xl hover:bg-blue-50 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)} className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase">Catat Biaya Operasional</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            <div className="space-y-1.5">
              <Label>Tanggal Keluar</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Sumber Dana</Label>
              <Select value={formData.bank_account_id} onValueChange={v => setFormData({...formData, bank_account_id: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label>Kategori Biaya</Label>
                <Button type="button" variant="ghost" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase" onClick={() => { setIsCustomCategory(!isCustomCategory); setFormData({...formData, category: ''}); }}>
                  {isCustomCategory ? 'Daftar' : 'Manual'}
                </Button>
              </div>
              {isCustomCategory ? (
                <Input placeholder="Kategori baru..." value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required className="h-12 rounded-xl bg-slate-50 border-none" />
              ) : (
                <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none"><SelectValue placeholder="Pilih Akun" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nominal Keluar (Rp)</Label>
              <NumberInput 
                value={formData.amount} 
                onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                placeholder="0" 
                className="h-12 rounded-xl bg-slate-50 border-none font-bold text-lg" 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Keterangan..." className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px]">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-[10px] px-8">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Simpan Transaksi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingExpense} onOpenChange={() => setViewingExpense(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase">Detail Pengeluaran</DialogTitle>
          </DialogHeader>
          {viewingExpense && (
            <div className="space-y-6 pt-4">
              <div className="p-8 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Biaya</p>
                  <p className="text-3xl font-black text-red-600">Rp {Number(viewingExpense.amount).toLocaleString('id-ID')}</p>
                </div>
                <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center shadow-sm">
                  <ArrowDownCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 px-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</p>
                  <p className="font-bold text-slate-800 uppercase text-xs">{viewingExpense.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referensi</p>
                  <p className="font-bold text-slate-800 uppercase text-xs">{viewingExpense.reference || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</p>
                  <p className="font-bold text-slate-800 text-xs">{new Date(viewingExpense.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="space-y-1 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</p>
                <p className="text-base font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl">{viewingExpense.notes || '-'}</p>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setViewingExpense(null)} className="rounded-xl px-10 font-bold uppercase text-[10px] h-12 bg-blue-600 text-white hover:bg-blue-700">Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
