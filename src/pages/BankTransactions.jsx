import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Loader2, Eye, CheckCircle, XCircle, ShoppingBag, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';

function TransactionItems({ salesTransactionId }) {
  const [salesTx, setSalesTx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSalesTransaction();
  }, [salesTransactionId]);

  const loadSalesTransaction = async () => {
    const data = await api.entities.SalesTransaction.filter({ id: salesTransactionId });
    if (data.length > 0) setSalesTx(data[0]);
    setLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!salesTx) return null;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="w-4 h-4 text-slate-500" />
        <p className="font-medium text-slate-700">Detail Item Transaksi</p>
      </div>
      <div className="text-sm text-slate-600 mb-3">
        <p><span className="text-slate-500">Invoice:</span> <span className="font-medium">{salesTx.invoice_number}</span></p>
        <p><span className="text-slate-500">Pelanggan:</span> <span className="font-medium">{salesTx.customer_name}</span></p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Produk</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-right">Harga</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesTx.items?.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{item.product_name}</TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
              <TableCell className="text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span>Rp {formatCurrency(salesTx.subtotal)}</span></div>
        {salesTx.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Diskon:</span><span className="text-red-600">-Rp {formatCurrency(salesTx.discount)}</span></div>}
        {salesTx.tax_amount > 0 && <div className="flex justify-between"><span className="text-slate-500">PPN ({salesTx.tax_percentage}%):</span><span>Rp {formatCurrency(salesTx.tax_amount)}</span></div>}
        <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total:</span><span>Rp {formatCurrency(salesTx.total)}</span></div>
        <div className="flex justify-between text-emerald-600"><span>Keuntungan:</span><span>Rp {formatCurrency(salesTx.profit)}</span></div>
      </div>
    </div>
  );
}

export default function BankTransactions({ store }) {
  const { toast } = useToast();
  const [allTransactions, setAllTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingDetail, setViewingDetail] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();
  const [formData, setFormData] = useState({
    bank_account_id: '', transaction_type: 'Credit', amount: '', description: '', reference: ''
  });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [txData, accData] = await Promise.all([
      api.entities.BankTransaction.filter({ store_id: store.id }, '-created_date'),
      api.entities.BankAccount.filter({ store_id: store.id })
    ]);
    setAllTransactions(txData);
    setAccounts(accData);
    setIsLoading(false);
  };

  const transactions = allTransactions.filter(tx => matchesDate(tx, selectedDate));

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const handleApprove = async (transaction) => {
    const account = accounts.find(a => a.id === transaction.bank_account_id);
    if (!account) return;

    const newBalance = account.balance + transaction.amount;
    
    await api.entities.BankTransaction.update(transaction.id, {
      status: 'Approved',
      balance_after: newBalance
    });

    await api.entities.BankAccount.update(account.id, {
      balance: newBalance
    });

    if (transaction.sales_transaction_id) {
      await api.entities.SalesTransaction.update(transaction.sales_transaction_id, {
        payment_status: 'Paid',
        paid_amount: transaction.amount
      });
    }

    // === OTOMASI JURNAL BANK ===
    try {
      const journal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: transaction.reference,
        date: new Date().toLocaleDateString('en-CA'),
        description: `Approval Bank - ${transaction.bank_name} (${transaction.reference})`,
        type: transaction.transaction_type === 'Credit' ? 'Receipt' : 'Payment',
        status: 'Posted',
        total_debit: transaction.amount,
        total_credit: transaction.amount,
        created_by: 'System'
      });

      if (transaction.transaction_type === 'Credit') {
        // Uang Masuk
        const lines = [
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: `Kas Bank - ${transaction.bank_name}`,
            description: `Penerimaan via ${transaction.bank_name}`,
            debit: transaction.amount,
            credit: 0
          }),
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: transaction.sales_transaction_id ? 'Piutang Usaha' : 'Pendapatan Lain-lain',
            description: transaction.description || `Pelunasan ${transaction.reference}`,
            debit: 0,
            credit: transaction.amount
          })
        ];
        await Promise.all(lines);
      } else {
        // Uang Keluar
        const lines = [
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: 'Beban Operasional',
            description: transaction.description || `Pengeluaran ${transaction.reference}`,
            debit: transaction.amount,
            credit: 0
          }),
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: `Kas Bank - ${transaction.bank_name}`,
            description: `Pembayaran via ${transaction.bank_name}`,
            debit: 0,
            credit: transaction.amount
          })
        ];
        await Promise.all(lines);
      }
    } catch (err) {
      console.error('Failed to create journal entry:', err);
    }

    loadData();
  };

  const handleReject = async (transaction) => {
    await api.entities.BankTransaction.update(transaction.id, {
      status: 'Rejected'
    });

    if (transaction.sales_transaction_id) {
      await api.entities.SalesTransaction.update(transaction.sales_transaction_id, {
        payment_status: 'Cancelled'
      });
    }

    loadData();
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(tx => tx.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = async () => {
    setIsLoading(true);
    let successCount = 0;
    
    try {
      for (const id of selectedIds) {
        const tx = transactions.find(t => t.id === id);
        if (tx && tx.status === 'Pending') {
          await handleApprove(tx);
          successCount++;
        }
      }
      
      toast({
        title: "Aksi Massal Berhasil",
        description: `${successCount} transaksi telah disetujui dan saldo bank diperbarui.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Gagal Memproses",
        description: "Terjadi kesalahan saat memproses beberapa transaksi.",
        variant: "destructive",
      });
    } finally {
      setSelectedIds([]);
      setIsLoading(false);
      loadData();
    }
  };

  const handleBulkReject = async () => {
    setIsLoading(true);
    let successCount = 0;
    
    try {
      for (const id of selectedIds) {
        const tx = transactions.find(t => t.id === id);
        if (tx && tx.status === 'Pending') {
          await handleReject(tx);
          successCount++;
        }
      }
      
      toast({
        title: "Pembaruan Berhasil",
        description: `${successCount} transaksi telah ditolak.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Terjadi Kesalahan",
        description: "Gagal menolak transaksi terpilih.",
        variant: "destructive",
      });
    } finally {
      setSelectedIds([]);
      setIsLoading(false);
      loadData();
    }
  };

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const account = accounts.find(a => a.id === formData.bank_account_id);
    const amount = Number(formData.amount);
    const newBalance = formData.transaction_type === 'Credit' 
      ? (account?.balance || 0) + amount 
      : (account?.balance || 0) - amount;

    await api.entities.BankTransaction.create({
      store_id: store.id,
      bank_account_id: formData.bank_account_id,
      bank_name: account?.bank_name || '',
      transaction_type: formData.transaction_type,
      amount,
      description: formData.description,
      reference: formData.reference || `TRX-${Date.now()}`,
      balance_after: newBalance,
      status: 'Approved',
      timestamp_wib: getWIBTimestamp()
    });

    await api.entities.BankAccount.update(formData.bank_account_id, { balance: newBalance });

    setIsSaving(false);
    setShowForm(false);
    setFormData({ bank_account_id: '', transaction_type: 'Credit', amount: '', description: '', reference: '' });
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Transactions"
        subtitle="Riwayat transaksi bank"
        icon={Banknote}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar 
              title="Laporan Transaksi Bank" 
              date={formattedDate} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-banktx-detailed" 
            
            store={store}
          />
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Transaksi
            </Button>
          </div>
        }
      />
      <PageDatePicker />

      {selectedIds.length > 0 && (
        <div className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-bold text-sm">Transaksi Terpilih</p>
              <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Aksi Massal Tersedia</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleBulkReject} 
              disabled={isLoading || !selectedIds.some(id => transactions.find(t => t.id === id)?.status === 'Pending')}
              className="bg-transparent border-white/30 text-white hover:bg-white/10 h-9 px-4 text-xs font-bold rounded-lg disabled:opacity-50"
            >
              Tolak Terpilih
            </Button>
            <Button 
              onClick={handleBulkApprove} 
              disabled={isLoading || !selectedIds.some(id => transactions.find(t => t.id === id)?.status === 'Pending')}
              className="bg-white text-blue-600 hover:bg-white/90 h-9 px-4 text-xs font-bold rounded-lg shadow-xl shadow-blue-900/20 disabled:opacity-50"
            >
              Approve Terpilih
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div id="print-banktx">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={selectedIds.length === transactions.length && transactions.length > 0} 
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </TableHead>
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Saldo Akhir</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                    <Banknote className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx, idx) => (
                  <TableRow key={tx.id} className={selectedIds.includes(tx.id) ? 'bg-blue-50/50' : ''}>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(tx.id)} 
                        onCheckedChange={() => toggleSelect(tx.id)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </TableCell>
                    <TableCell className="text-center text-slate-400 font-medium text-xs">{idx + 1}</TableCell>
                    <TableCell>{tx.timestamp_wib}</TableCell>
                    <TableCell className="font-medium">{tx.bank_name}</TableCell>
                    <TableCell>{tx.reference}</TableCell>
                    <TableCell>{tx.description || '-'}</TableCell>
                    <TableCell>
                      <Badge className={tx.transaction_type === 'Credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {tx.transaction_type === 'Credit' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        tx.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        tx.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.transaction_type === 'Credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'Credit' ? '+' : '-'}Rp {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(tx.balance_after)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {tx.payment_proof_url && (
                          <Button variant="ghost" size="icon" onClick={() => setViewingDetail(tx)}>
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                        {tx.status === 'Pending' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(tx)}>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleReject(tx)}>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Transaksi Bank</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Rekening Bank *</Label>
              <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({...formData, bank_account_id: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih rekening" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipe Transaksi</Label>
              <Select value={formData.transaction_type} onValueChange={(v) => setFormData({...formData, transaction_type: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit (Masuk)</SelectItem>
                  <SelectItem value="Debit">Debit (Keluar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Jumlah *</Label><NumberInput value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="mt-1.5" required /></div>
            <div><Label>Deskripsi</Label><Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="mt-1.5" /></div>
            <div><Label>Referensi</Label><Input value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="mt-1.5" placeholder="Auto-generate jika kosong" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving || !formData.bank_account_id}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingDetail} onOpenChange={() => setViewingDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle></DialogHeader>
          {viewingDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Referensi:</span> <span className="font-medium">{viewingDetail.reference}</span></div>
                <div><span className="text-slate-500">Bank:</span> <span className="font-medium">{viewingDetail.bank_name}</span></div>
                <div><span className="text-slate-500">Tanggal:</span> <span className="font-medium">{viewingDetail.timestamp_wib}</span></div>
                <div><span className="text-slate-500">Jumlah:</span> <span className="font-medium">Rp {formatCurrency(viewingDetail.amount)}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Deskripsi:</span> <span className="font-medium">{viewingDetail.description}</span></div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <Badge className={
                    viewingDetail.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                    viewingDetail.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                    'bg-red-100 text-red-700'
                  }>
                    {viewingDetail.status}
                  </Badge>
                </div>
              </div>

              {viewingDetail.sales_transaction_id && (
                <TransactionItems salesTransactionId={viewingDetail.sales_transaction_id} />
              )}
              
              {viewingDetail.payment_proof_url && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Bukti Transfer:</p>
                  <img 
                    src={viewingDetail.payment_proof_url} 
                    alt="Bukti Transfer" 
                    className="w-full rounded-lg border"
                  />
                </div>
              )}

              {viewingDetail.status === 'Pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { handleReject(viewingDetail); setViewingDetail(null); }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Tolak
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { handleApprove(viewingDetail); setViewingDetail(null); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-banktx-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Referensi</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Saldo Akhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{tx.timestamp_wib}</TableCell>
                <TableCell className="font-bold">{tx.bank_name}</TableCell>
                <TableCell>{tx.reference}</TableCell>
                <TableCell>{tx.description || '-'}</TableCell>
                <TableCell>{tx.transaction_type}</TableCell>
                <TableCell>{tx.status}</TableCell>
                <TableCell className="text-right">Rp {tx.amount?.toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-right font-medium">Rp {tx.balance_after?.toLocaleString('id-ID')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
