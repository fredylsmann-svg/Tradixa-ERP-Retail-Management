import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { Wallet, Search, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight, Plus, Loader2, Calculator, Printer, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { formatNumber } from '@/utils/currencyFormatter';
import { api } from '@/api/client';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import DataTablePagination from '@/components/ui/DataTablePagination';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { toast as sonnerToast } from 'sonner';

export default function CashRegister({ store }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialRef = useRef(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [summary, setSummary] = useState({ balance: 0, in_today: 0, out_today: 0 });
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const [formData, setFormData] = useState({
    type: 'Pemasukan',
    amount: 0,
    description: '',
    counter_account: 'Pendapatan Lainnya'
  });

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    if (store?.id) loadCashTransactions();
  }, [store?.id, page, debouncedSearch, typeFilter, perPage]);

  const loadCashTransactions = async () => {
    if (isInitialRef.current) setIsLoading(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const { data: rpcRes, error } = await supabase.rpc('get_cash_register', {
        p_store_id: store.id,
        p_page: page,
        p_per_page: perPage,
        p_type_filter: typeFilter,
        p_search: debouncedSearch || '',
        p_timezone: userTimezone
      });

      if (error) {
        console.warn('RPC get_cash_register not available yet, falling back:', error.message);
        // Fallback: legacy client-side fetch
        const entries = await api.entities.JournalEntry.filter({ store_id: store.id });
        if (!entries || entries.length === 0) {
          setTransactions([]);
          setSummary({ balance: 0, in_today: 0, out_today: 0 });
          setTotalCount(0);
          return;
        }
        const entryIds = entries.map(e => e.id);
        const allLines = await api.entities.JournalLine.filter({});
        const cashLines = allLines.filter(line =>
          (line.account_name === 'Kas Kantor' || line.account_name === 'Kas Tangan') &&
          entryIds.includes(line.journal_id)
        );

        const todayStr = new Date().toLocaleDateString('en-CA');
        let totalBal = 0, in_today = 0, out_today = 0;

        const formattedTxs = cashLines.map(line => {
          const entry = entries.find(e => e.id === line.journal_id);
          const isDebit = line.debit > 0;
          const amount = isDebit ? line.debit : line.credit;
          const type = isDebit ? 'Pemasukan' : 'Pengeluaran';
          totalBal += (line.debit || 0) - (line.credit || 0);
          if (entry && entry.date === todayStr) {
            if (isDebit) in_today += amount;
            else out_today += amount;
          }
          return {
            id: line.id, date: entry ? entry.date : '-',
            reference: entry ? entry.transaction_id : '-',
            description: line.description || (entry ? entry.description : '-'),
            type, amount, status: entry ? entry.status : 'Posted',
            created_at: line.created_at || (entry ? entry.created_at : '')
          };
        });

        formattedTxs.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

        // Apply client-side filter & pagination for fallback
        const filtered = formattedTxs.filter(tx => {
          const matchSearch = !debouncedSearch || tx.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) || tx.reference?.toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchType = typeFilter === 'all' || tx.type.toLowerCase() === typeFilter.toLowerCase();
          return matchSearch && matchType;
        });

        setSummary({ balance: totalBal, in_today, out_today });
        setTotalCount(filtered.length);
        setTransactions(filtered.slice((page - 1) * perPage, page * perPage));
      } else if (rpcRes) {
        setSummary({
          balance: rpcRes.balance || 0,
          in_today: rpcRes.in_today || 0,
          out_today: rpcRes.out_today || 0
        });
        setTransactions(rpcRes.transactions || []);
        setTotalCount(rpcRes.total_count || 0);
      }
    } catch (err) {
      console.error('[Tradixa] Error loading cash:', err);
    } finally {
      setIsLoading(false);
      isInitialRef.current = false;
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      sonnerToast.error("Jumlah tidak valid");
      return;
    }

    setIsSaving(true);
    try {
      const ref = `CASH-${Date.now()}`;

      // Create Journal Entry
      const journal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: ref,
        date: new Date().toLocaleDateString('en-CA'),
        description: formData.description,
        type: formData.type === 'Pemasukan' ? 'Receipt' : 'Payment',
        status: 'Posted', // Cash is usually posted immediately
        total_debit: formData.amount,
        total_credit: formData.amount,
        created_by: 'Kasir/Admin'
      });

      // Create Lines
      if (formData.type === 'Pemasukan') {
        // Debit: Kas Kantor, Credit: Pendapatan
        await api.entities.JournalLine.create({ journal_id: journal.id, account_name: 'Kas Kantor', description: formData.description, debit: formData.amount, credit: 0 });
        await api.entities.JournalLine.create({ journal_id: journal.id, account_name: formData.counter_account, description: formData.description, debit: 0, credit: formData.amount });
      } else {
        // Debit: Biaya, Credit: Kas Kantor
        await api.entities.JournalLine.create({ journal_id: journal.id, account_name: formData.counter_account, description: formData.description, debit: formData.amount, credit: 0 });
        await api.entities.JournalLine.create({ journal_id: journal.id, account_name: 'Kas Kantor', description: formData.description, debit: 0, credit: formData.amount });
      }

      sonnerToast.success(`${formData.type} Kas berhasil dicatat`);
      setShowForm(false);
      setFormData({ type: 'Pemasukan', amount: 0, description: '', counter_account: 'Pendapatan Lainnya' });
      loadCashTransactions();
    } catch (err) {
      sonnerToast.error(`Gagal mencatat kas: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Data is already filtered & paginated by server
  const filteredData = transactions;

  return (
    <div className="space-y-6 animate-in fade-in duration-500" id="print-cash-register">
      <PageHeader
        title="Cash Register"
        subtitle="Kas Kantor - Kelola dan pantau arus kas tunai harian"
        icon={Calculator}
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Cash Register', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-cash-register')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Cash Register', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-cash-register')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Cash Register', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-cash-register')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold text-white">
              <Plus className="w-4 h-4 mr-2" />
              Catat Transaksi Kas
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-blue-200 text-sm font-medium">Total Saldo Kas</p>
                <p className="text-3xl font-black">Rp {formatCurrency(summary.balance)}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <Calculator className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-slate-500 text-sm font-bold tracking-widest">Pemasukan Hari ini</p>
                <p className="text-2xl font-black text-emerald-600">Rp {formatCurrency(summary.in_today)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <ArrowDownRight className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-slate-500 text-sm font-bold tracking-widest">Pengeluaran Hari ini</p>
                <p className="text-2xl font-black text-red-600">Rp {formatCurrency(summary.out_today)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-none shadow-sm">
        <CardContent className="p-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari deskripsi atau referensi..."
              className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-12 px-4 rounded-xl bg-slate-50 border-none font-bold text-slate-600 text-sm outline-none"
          >
            <option value="all">Semua Tipe</option>
            <option value="pemasukan">Pemasukan (In)</option>
            <option value="pengeluaran">Pengeluaran (Out)</option>
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>Tanggal & Referensi</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr><td colSpan="5" className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 opacity-20" /></td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="5" className="py-12 text-center text-slate-400 font-bold">Tidak ada riwayat kas</td></tr>
            ) : (
              filteredData.map((tx, idx) => (
                <TableRow key={tx.id} className="hover:bg-slate-50/50">
                  <TableCell className="text-center font-bold text-slate-400">{(page - 1) * perPage + idx + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{tx.date}</p>
                      <p className="text-xs font-medium text-slate-500">{tx.reference}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{tx.description}</TableCell>
                  <TableCell>
                    <Badge className={tx.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black">
                    <span className={tx.type === 'Pemasukan' ? 'text-emerald-600' : 'text-red-600'}>
                      {tx.type === 'Pemasukan' ? '+' : '-'} Rp {formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <DataTablePagination
          currentPage={page}
          pageSize={perPage}
          totalData={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPerPage}
        />
      </Card>

      {/* Modal Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Catat Transaksi Kas</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={formData.type === 'Pemasukan' ? 'default' : 'outline'}
                className={formData.type === 'Pemasukan' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setFormData({ ...formData, type: 'Pemasukan', counter_account: 'Pendapatan Lainnya' })}
              >
                Pemasukan
              </Button>
              <Button
                type="button"
                variant={formData.type === 'Pengeluaran' ? 'default' : 'outline'}
                className={formData.type === 'Pengeluaran' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => setFormData({ ...formData, type: 'Pengeluaran', counter_account: 'Biaya Operasional' })}
              >
                Pengeluaran
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal (Rp) *</Label>
              <NumberInput
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="h-12 font-bold text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lawan Akun *</Label>
              <Select value={formData.counter_account} onValueChange={v => setFormData({ ...formData, counter_account: v })}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === 'Pemasukan' ? (
                    <>
                      <SelectItem value="Pendapatan Lainnya">Pendapatan Lainnya</SelectItem>
                      <SelectItem value="Modal">Modal / Tambahan Kas</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Biaya Operasional">Biaya Operasional</SelectItem>
                      <SelectItem value="Biaya Transportasi">Biaya Transportasi</SelectItem>
                      <SelectItem value="Biaya Konsumsi">Biaya Konsumsi</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Keterangan *</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Contoh: Beli token listrik"
                className="h-12"
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan Transaksi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
