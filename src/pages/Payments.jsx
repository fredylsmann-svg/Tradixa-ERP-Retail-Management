import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, HandCoins, ArrowRightLeft, FileOutput, Loader2, Info, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import PageHeader from '@/components/layout/PageHeader';
import PrintPayment from '@/components/invoice/PrintPayment';

export default function Payments({ store }) {
  const [payments, setPayments] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [printingPayment, setPrintingPayment] = useState(null);
  
  const { selectedDate, formattedDate } = useGlobalDate();

  const [formData, setFormData] = useState({
    invoice_ref: '', // e.g. "AR-1234" or "AP-5678"
    payment_type: '', // "IN" (AR) or "OUT" (AP)
    amount: '',
    payment_method: 'Transfer Bank',
    bank_id: '',
    bank_name: '',
    reference_number: '',
    notes: '',
    proof_url: ''
  });
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    setIsLoading(true);
    const [banksData, arData, apData, trxData] = await Promise.all([
      api.entities.BankAccount.filter({ store_id: store.id }),
      api.entities.Receivable.filter({ store_id: store.id }),
      api.entities.Payable.filter({ store_id: store.id }),
      api.entities.BankTransaction.filter({ store_id: store.id }, '-created_at')
    ]);
    
    const unpaidAR = (arData || []).filter(r => r.status !== 'Paid' && r.status !== 'Lunas');
    const unpaidAP = (apData || []).filter(p => p.status !== 'Paid' && p.status !== 'Lunas');

    setBanks(banksData || []);
    setReceivables(unpaidAR);
    setPayables(unpaidAP);
    setPayments(trxData || []);
    setIsLoading(false);
  };

  const filteredPayments = payments.filter(p => matchesDate(p, selectedDate));

  const getCurrentTimeWIB = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 60 * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')}`;
  };

  const handleInvoiceSelect = (val) => {
    const [type, id] = val.split('|');
    let target = type === 'AR' ? receivables.find(r => r.id === id) : payables.find(p => p.id === id);
    if (target) {
      setFormData(prev => ({
        ...prev,
        invoice_ref: val,
        payment_type: type === 'AR' ? 'IN' : 'OUT',
        amount: target.remaining_amount || target.amount || 0
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isCash = formData.payment_method === 'Cash';
    if (!formData.invoice_ref || !formData.amount || (!isCash && !formData.bank_id)) return;
    setIsSaving(true);
    
    let uploadedUrl = '';
    if (proofFile) {
      try {
        const uploadRes = await api.storage.upload(proofFile);
        uploadedUrl = uploadRes.url;
      } catch (err) { console.error("Upload failed", err); }
    }

    const [type, refId] = formData.invoice_ref.split('|');
    const bank = isCash ? null : banks.find(b => b.id === formData.bank_id);
    const amount = Number(formData.amount);
    const newBalance = type === 'AR' ? (bank?.balance || 0) + amount : (bank?.balance || 0) - amount;

    try {
      await api.entities.BankTransaction.create({
        store_id: store.id,
        bank_account_id: isCash ? '' : formData.bank_id,
        bank_name: isCash ? 'Kas Kantor / Tunai' : (bank?.bank_name || 'Bank'),
        transaction_type: type === 'AR' ? 'Credit' : 'Debit',
        amount: amount,
        description: `Pelunasan ${type === 'AR' ? 'Piutang' : 'Hutang'} - ${refId}`,
        reference: formData.reference_number,
        balance_after: newBalance,
        status: 'Approved',
        payment_proof_url: uploadedUrl,
        timestamp_wib: getCurrentTimeWIB()
      });
      
      // Update Bank Balance (Skip if Cash)
      if (!isCash && formData.bank_id) {
        await api.entities.BankAccount.update(formData.bank_id, { balance: newBalance });
      }
      
      const targetInvoice = type === 'AR' ? receivables.find(r => r.id === refId) : payables.find(p => p.id === refId);
      const currentPaid = Number(targetInvoice?.paid_amount || 0);
      const totalAmount = Number(targetInvoice?.amount || 0);
      const newPaidAmount = currentPaid + amount;
      const newRemaining = Math.max(0, totalAmount - newPaidAmount);
      const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial';

      if (type === 'AR') {
        await api.entities.Receivable.update(refId, { 
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          status: newStatus 
        });
      } else if (type === 'AP') {
         await api.entities.Payable.update(refId, { 
           paid_amount: newPaidAmount,
           remaining_amount: newRemaining,
           status: newStatus 
         });
      }
      
      // Re-add Journal Entry
      await api.entities.JournalEntry.create({
        store_id: store.id,
        date: getCurrentTimeWIB().split(' ')[0].split('/').reverse().join('-'),
        description: `Auto-payment for ${type} - ${refId}`,
        reference: formData.reference_number || refId,
        entries: type === 'AR' ? [
          { account_name: bank?.bank_name || 'Kas', debit: amount, credit: 0 },
          { account_name: 'Piutang Usaha', debit: 0, credit: amount }
        ] : [
          { account_name: 'Hutang Usaha', debit: amount, credit: 0 },
          { account_name: bank?.bank_name || 'Kas', debit: 0, credit: amount }
        ],
        total_amount: amount,
        status: 'Posted',
        timestamp_wib: getCurrentTimeWIB()
      });
      
    } catch (err) { console.error(err); }
    
    setProofFile(null);
    setFormData({ invoice_ref: '', payment_type: '', amount: '', payment_method: 'Transfer Bank', bank_id: '', reference_number: '', notes: '' });
    setShowForm(false);
    setIsSaving(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments (Pelunasan)"
        subtitle="Rekam dan kelola pelunasan Piutang (AR) & Utang (AP)"
        icon={HandCoins}
        actions={
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Rekam Pelunasan Baru
          </Button>
        }
      />
      <PageDatePicker />

      <Card className="border-none shadow-sm overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="w-12 pl-6">No.</TableHead>
                  <TableHead className="w-48">Waktu</TableHead>
                  <TableHead >Ref / Deskripsi</TableHead>
                  <TableHead >Metode / Bank</TableHead>
                  <TableHead className="text-center">Tipe</TableHead>
                  <TableHead className="text-right pr-6">Jumlah</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="p-4"><Skeleton className="h-12 w-full rounded-xl" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <HandCoins className="w-12 h-12 text-slate-200" />
                        <p className="font-medium">Belum ada riwayat pembayaran untuk tanggal ini</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p, index) => (
                    <TableRow key={p.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50">
                      <TableCell className="pl-6 text-slate-500 font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">{p.timestamp_wib?.split(' ')[0]}</span>
                          <span className="text-[10px] font-medium text-slate-400">{p.timestamp_wib?.split(' ')[1]} {p.timestamp_wib?.split(' ')[2]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-800 leading-tight">{p.description}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">REF: {p.reference || '-'}</p>
                      </TableCell>
                      <TableCell className="font-bold text-slate-600">{p.bank_name || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={p.transaction_type === 'Credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-600 text-white'}>
                          {p.transaction_type === 'Credit' ? 'In (AR)' : 'Out (AP)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black text-slate-900">
                        Rp {new Intl.NumberFormat('id-ID').format(p.amount)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewingPayment(p)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setPrintingPayment(p)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase">Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Invoice/Bill yang dibayar *</Label>
              <Select value={formData.invoice_ref} onValueChange={handleInvoiceSelect}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue placeholder="Cari tagihan atau invoice..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Accounts Receivable (Piutang)</div>
                  {receivables.length > 0 ? (
                    receivables.map(r => (
                      <SelectItem key={r.id} value={`AR|${r.id}`}>[AR] {r.invoice_number || r.id} - {r.customer_name} (Rp {new Intl.NumberFormat('id-ID').format(r.remaining_amount || r.amount)})</SelectItem>
                    ))
                  ) : <div className="px-8 py-2 text-xs italic text-slate-400">Kosong</div>}
                  
                  <div className="p-2 pb-1 mt-2 border-t text-[10px] font-black text-slate-400 uppercase tracking-widest">Accounts Payable (Utang Supplier)</div>
                  {payables.length > 0 ? (
                    payables.map(p => (
                      <SelectItem key={p.id} value={`AP|${p.id}`}>[AP] {p.invoice_number || p.id} - {p.supplier_name} (Rp {new Intl.NumberFormat('id-ID').format(p.remaining_amount || p.amount)})</SelectItem>
                    ))
                  ) : <div className="px-8 py-2 text-xs italic text-slate-400">Kosong</div>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Pembayaran (Rp) *</Label>
              <Input 
                type="number"
                className="h-12 rounded-xl border-slate-200 text-lg font-bold" 
                placeholder="0" 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-1">Ubah nominal jika pembayaran dilakukan secara parsial / sebagian.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran</Label>
                <Select value={formData.payment_method} onValueChange={v => setFormData({...formData, payment_method: v})}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                    <SelectItem value="Cash">Cash / Tunai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.payment_method !== 'Cash' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Bank *</Label>
                  <Select value={formData.bank_id} onValueChange={v => setFormData({...formData, bank_id: v})}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                      <SelectValue placeholder="Pilih bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.bank_name} ({new Intl.NumberFormat('id-ID').format(b.balance)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Referensi</Label>
              <Input 
                className="h-12 rounded-xl border-slate-200" 
                placeholder="Nomor transfer/VA/transaksi" 
                value={formData.reference_number}
                onChange={e => setFormData({...formData, reference_number: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bukti Transfer (opsional)</Label>
              <Input type="file" onChange={e => setProofFile(e.target.files[0])} className="rounded-xl border-slate-200" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</Label>
              <Textarea 
                className="rounded-xl border-slate-200 min-h-[80px]" 
                placeholder="Catatan tambahan..." 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <div className="bg-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="font-bold text-sm">Informasi Sistem Otomatis:</h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-400 font-medium">
                <li className="flex items-center gap-2">• Membuat <span className="text-white font-bold">Journal Entry</span> otomatis (DR/CR)</li>
                <li className="flex items-center gap-2">• <span className="text-white font-bold">Pelunasan tagihan</span> AP Supplier atau Piutang Customer</li>
                <li className="flex items-center gap-2">• Sinkronisasi <span className="text-white font-bold">Saldo Bank</span> secara realtime</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500">Batal</Button>
              <Button className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-black shadow-xl shadow-blue-100" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRightLeft className="w-5 h-5 mr-2" />}
                PROSES PEMBAYARAN
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
        <DialogContent className="max-w-3xl rounded-xl p-0 max-h-[90vh] overflow-y-auto">
          {viewingPayment && (
            <div className="flex flex-col">
              <div className="p-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 pr-14">
                <div className="flex items-center justify-between mb-6">
                  <Badge className={viewingPayment.transaction_type === 'Credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white'}>
                    {viewingPayment.transaction_type === 'Credit' ? 'PENERIMAAN PIUTANG (AR)' : 'PENGELUARAN UTANG (AP)'}
                  </Badge>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewingPayment.timestamp_wib}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">{viewingPayment.description}</h2>
                <p className="text-slate-500 font-medium">Reference: <span className="text-slate-800 font-bold">{viewingPayment.reference || '-'}</span></p>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Terkait</p>
                    <p className="font-bold text-slate-800">{viewingPayment.bank_name || '-'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Transaksi</p>
                    <p className="text-2xl font-black text-slate-900">Rp {new Intl.NumberFormat('id-ID').format(viewingPayment.amount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Akhir Bank</p>
                    <p className="font-bold text-slate-800">Rp {new Intl.NumberFormat('id-ID').format(viewingPayment.balance_after)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                    <Badge className="bg-emerald-100 text-emerald-700">{viewingPayment.status}</Badge>
                  </div>
                </div>

                {viewingPayment.notes && (
                  <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Catatan Tambahan</p>
                    <p className="text-sm text-blue-700 font-medium">{viewingPayment.notes}</p>
                  </div>
                )}

                {viewingPayment.payment_proof_url && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bukti Transfer</p>
                    <div 
                      className="w-full rounded-3xl border-2 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer group relative"
                      onClick={() => setEnlargedImage(viewingPayment.payment_proof_url)}
                    >
                      <img src={viewingPayment.payment_proof_url} alt="Proof" className="w-full max-h-[400px] object-contain transition-opacity group-hover:opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <span className="bg-slate-900/80 text-white font-bold text-sm px-4 py-2 rounded-full flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Klik untuk Perbesar
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none flex justify-center items-center">
          {enlargedImage && (
            <img src={enlargedImage} alt="Enlarged Proof" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>

      {printingPayment && (
        <PrintPayment payment={printingPayment} store={store} onClose={() => setPrintingPayment(null)} />
      )}
    </div>
  );
}
