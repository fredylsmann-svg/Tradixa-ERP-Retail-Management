import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowRightLeft, FileText, CheckCircle2, XCircle, Clock, Loader2, Landmark, Share2, Upload, Trash2, Printer, Check, X, FileSpreadsheet, Coins } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberInput } from '@/components/ui/number-input';
import { formatNumber } from '@/utils/currencyFormatter';
import PageHeader from '@/components/layout/PageHeader';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { toast } from 'sonner';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export default function FundTransfers({ store }) {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // File Upload State
  const [documentFile, setDocumentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    fee: '',
    notes: ''
  });

  // Role Permissions Check
  const isApprover = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  // Digital Signature Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (store?.id) {
      loadData();
    }
  }, [store]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get current user
      const user = await api.auth.me();
      setCurrentUser(user);

      // 2. Load transfers
      const trfs = await api.entities.FundTransfer.filter({ store_id: store.id }, '-created_at');
      setTransfers(trfs);

      // 3. Load bank accounts
      const accs = await api.entities.BankAccount.filter({ store_id: store.id });
      setAccounts(accs);
    } catch (err) {
      console.error('[Tradixa] Load fund transfers error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signature Pad Canvas Logic ---
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // dark slate

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // --- Supporting Document Upload Logic ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal adalah 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.storage.upload(file);
      if (res?.url) {
        setUploadedUrl(res.url);
        setDocumentFile(file);
        toast.success('Berkas pendukung berhasil diunggah!');
      } else {
        toast.error('Gagal mengunggah berkas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat mengunggah berkas.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Submit New Request ---
  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    const amountVal = Number(formData.amount);
    const feeVal = Number(formData.fee || 0);

    if (!formData.from_account_id || !formData.to_account_id) {
      toast.error('Silakan tentukan rekening asal dan rekening tujuan.');
      return;
    }

    if (formData.from_account_id === formData.to_account_id) {
      toast.error('Rekening asal dan rekening tujuan tidak boleh sama.');
      return;
    }

    if (amountVal <= 0) {
      toast.error('Nominal pemindahan dana harus lebih dari Rp 0.');
      return;
    }

    const fromAcc = accounts.find(a => a.id === formData.from_account_id);
    if (!fromAcc) {
      toast.error('Rekening asal tidak valid.');
      return;
    }

    if ((fromAcc.balance || 0) < (amountVal + feeVal)) {
      toast.error(`Saldo rekening asal tidak mencukupi. (Saldo saat ini: Rp ${formatNumber(fromAcc.balance)})`);
      return;
    }

    setIsSaving(true);
    try {
      const refNumber = `FT-${Date.now()}`;
      await api.entities.FundTransfer.create({
        store_id: store.id,
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount: amountVal,
        fee: feeVal,
        notes: formData.notes,
        document_url: uploadedUrl,
        status: 'Pending',
        requested_by: currentUser?.full_name || currentUser?.email || 'Staff',
        reference: refNumber
      });

      toast.success('Permohonan pemindahan dana berhasil diajukan! Menunggu persetujuan Direktur.');
      setShowRequestForm(false);
      setFormData({ from_account_id: '', to_account_id: '', amount: '', fee: '', notes: '' });
      setUploadedUrl('');
      setDocumentFile(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengajukan pemindahan dana.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Approval Execution ---
  const handleApprove = async () => {
    if (!selectedTransfer) return;
    if (!hasSigned) {
      toast.error('Silakan torehkan tanda tangan digital Anda terlebih dahulu pada canvas!');
      return;
    }

    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL('image/png');

      const amountVal = Number(selectedTransfer.amount);
      const feeVal = Number(selectedTransfer.fee || 0);
      const totalDeducted = amountVal + feeVal;

      const fromAccount = accounts.find(a => a.id === selectedTransfer.from_account_id);
      const toAccount = accounts.find(a => a.id === selectedTransfer.to_account_id);

      if (!fromAccount || !toAccount) {
        toast.error('Data rekening bank tidak ditemukan.');
        setIsSaving(false);
        return;
      }

      if ((fromAccount.balance || 0) < totalDeducted) {
        toast.error(`Saldo ${fromAccount.bank_name} tidak mencukupi untuk dipotong.`);
        setIsSaving(false);
        return;
      }

      // 1. Mutate balances in Bank Account
      const newFromBalance = (fromAccount.balance || 0) - totalDeducted;
      const newToBalance = (toAccount.balance || 0) + amountVal;

      await api.entities.BankAccount.update(fromAccount.id, { balance: newFromBalance });
      await api.entities.BankAccount.update(toAccount.id, { balance: newToBalance });

      // 2. Insert two Bank Transactions
      // Debit (From Account)
      await api.entities.BankTransaction.create({
        store_id: store.id,
        bank_account_id: fromAccount.id,
        bank_name: fromAccount.bank_name,
        transaction_type: 'Debit',
        amount: totalDeducted,
        description: `Pemindahan Dana Keluar ke ${toAccount.bank_name}${feeVal > 0 ? ` (Admin: Rp ${formatNumber(feeVal)})` : ''} - [Ref: ${selectedTransfer.reference}] ${selectedTransfer.notes || ''}`,
        reference: selectedTransfer.reference,
        balance_after: newFromBalance,
        status: 'Approved',
        timestamp_wib: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      });

      // Credit (To Account)
      await api.entities.BankTransaction.create({
        store_id: store.id,
        bank_account_id: toAccount.id,
        bank_name: toAccount.bank_name,
        transaction_type: 'Credit',
        amount: amountVal,
        description: `Pemindahan Dana Masuk dari ${fromAccount.bank_name} - [Ref: ${selectedTransfer.reference}] ${selectedTransfer.notes || ''}`,
        reference: selectedTransfer.reference,
        balance_after: newToBalance,
        status: 'Approved',
        timestamp_wib: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      });

      // 3. Post balanced double-entry accounting General Journal
      let coaAccounts = [];
      try {
        coaAccounts = await api.entities.COA.filter({ store_id: store.id });
      } catch (coaErr) {
        console.error('Failed to load COA:', coaErr);
      }

      const fromCoa = coaAccounts.find(c => c.name.toLowerCase().includes(fromAccount.bank_name.toLowerCase())) || 
                       coaAccounts.find(c => c.name.toLowerCase().includes('kas') || c.name.toLowerCase().includes('bank')) ||
                       { name: fromAccount.bank_name };
                       
      const toCoa = coaAccounts.find(c => c.name.toLowerCase().includes(toAccount.bank_name.toLowerCase())) || 
                     coaAccounts.find(c => c.name.toLowerCase().includes('kas') || c.name.toLowerCase().includes('bank')) ||
                     { name: toAccount.bank_name };

      const adminCoa = coaAccounts.find(c => c.name.toLowerCase().includes('administrasi bank') || c.name.toLowerCase().includes('beban admin')) ||
                       { name: 'Beban Administrasi Bank' };

      // Let's create JournalEntry
      const journal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: selectedTransfer.reference,
        date: new Date().toISOString().split('T')[0],
        description: `[Transfer Kas/Bank] Pemindahan Dana Internal dari ${fromAccount.bank_name} ke ${toAccount.bank_name}`,
        type: 'Payment',
        status: 'Posted',
        total_debit: totalDeducted,
        total_credit: totalDeducted,
        created_by: currentUser?.full_name || 'System Auto-Journal',
        notes: selectedTransfer.notes || 'Pemindahan Dana Kas/Bank Internal'
      });

      // Let's create JournalLines:
      // Line 1: Debit destination account (To) for net amount
      await api.entities.JournalLine.create({
        journal_id: journal.id,
        account_name: toCoa.name,
        description: `Penerimaan pemindahan dana dari ${fromAccount.bank_name}`,
        debit: amountVal,
        credit: 0
      });

      // Line 2: Debit Admin Fee (if feeVal > 0)
      if (feeVal > 0) {
        await api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: adminCoa.name,
          description: `Biaya administrasi pemindahan dana`,
          debit: feeVal,
          credit: 0
        });
      }

      // Line 3: Credit source account (From) for total amount
      await api.entities.JournalLine.create({
        journal_id: journal.id,
        account_name: fromCoa.name,
        description: `Pengeluaran pemindahan dana ke ${toAccount.bank_name}`,
        debit: 0,
        credit: totalDeducted
      });

      // 4. Update Fund Transfer record
      await api.entities.FundTransfer.update(selectedTransfer.id, {
        status: 'Approved',
        approved_by: currentUser?.full_name || currentUser?.email || 'Owner',
        approved_at: new Date().toISOString(),
        signature_data: signatureDataUrl
      });

      toast.success('Pemindahan dana berhasil disetujui! Saldo terpotong & Buku Besar Akuntansi otomatis diperbarui.');
      setShowApprovalDialog(false);
      setSelectedTransfer(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses persetujuan pemindahan dana.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Reject Request ---
  const handleReject = async () => {
    if (!selectedTransfer) return;
    setIsSaving(true);
    try {
      await api.entities.FundTransfer.update(selectedTransfer.id, {
        status: 'Rejected',
        approved_by: currentUser?.full_name || currentUser?.email || 'Owner',
        approved_at: new Date().toISOString()
      });

      toast.success('Permohonan pemindahan dana telah ditolak.');
      setShowApprovalDialog(false);
      setSelectedTransfer(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses penolakan.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Share WhatsApp Logic ---
  const handleWhatsAppShare = (trf) => {
    const fromAcc = accounts.find(a => a.id === trf.from_account_id);
    const toAcc = accounts.find(a => a.id === trf.to_account_id);

    const message = `Halo Bapak/Ibu Direktur,\n\nBerikut diajukan permohonan pemindahan dana internal:\n\n*Ref:* ${trf.reference}\n*Dari:* ${fromAcc?.bank_name || 'N/A'}\n*Ke:* ${toAcc?.bank_name || 'N/A'}\n*Nominal:* Rp ${formatNumber(trf.amount)}\n*Biaya Admin:* Rp ${formatNumber(trf.fee || 0)}\n*Catatan:* ${trf.notes || '-'}\n\nMohon lakukan persetujuan dengan masuk ke sistem Tradixa ERP pada menu *Fund Transfer*.\n\nTerima kasih.`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Statistics calculations
  const pendingCount = transfers.filter(t => t.status === 'Pending').length;
  const approvedTotal = transfers.filter(t => t.status === 'Approved').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const rejectedCount = transfers.filter(t => t.status === 'Rejected').length;

  return (
    <PremiumGate store={store} featureName="Modul Fund Transfer" requiredPlan="premium" className="w-full block">
      <div className="space-y-6">
      <PageHeader
        title="Fund Transfer & Approval"
        subtitle="Kelola pemindahan dana internal antar kas/bank dengan alur persetujuan multi-role resmi."
        icon={Coins}
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => exportToPDF('Fund Transfer', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'fund-transfer-table')}
              className="h-11 px-4 border-slate-200 hover:bg-slate-50 flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <Printer className="w-4 h-4" /> PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exportToExcel('Fund Transfer', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'fund-transfer-table')}
              className="h-11 px-4 border-slate-200 hover:bg-slate-50 flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button
              onClick={() => {
                setFormData({ from_account_id: '', to_account_id: '', amount: '', fee: '', notes: '' });
                setShowRequestForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Ajukan Transfer
            </Button>
          </div>
        }
      />

      {/* Summary Statistics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-amber-500 to-amber-700 border-none shadow-md hover:-translate-y-1 hover:brightness-105 active:scale-95">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative">
              <div className="absolute right-0 top-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
                <Clock className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-16">
                <p className="text-xs font-bold text-white/90 tracking-widest drop-shadow-sm">Pending Approval</p>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={pendingCount} suffix=" Permohonan" />
                </h3>
                <p className="text-xs mt-2 text-white/80 drop-shadow-sm font-medium">Menunggu persetujuan Direktur</p>
              </div>
            </div>
          </CardContent>
        </Card>
 
        <Card className="relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-emerald-500 to-emerald-700 border-none shadow-md hover:-translate-y-1 hover:brightness-105 active:scale-95">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative">
              <div className="absolute right-0 top-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
                <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-16">
                <p className="text-xs font-bold text-white/90 tracking-widest drop-shadow-sm">Dana Disetujui (Approved)</p>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={approvedTotal} prefix="Rp " />
                </h3>
                <p className="text-xs mt-2 text-white/80 drop-shadow-sm font-medium">Berhasil dipindahkan & tercatat</p>
              </div>
            </div>
          </CardContent>
        </Card>
 
        <Card className="relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-rose-500 to-rose-700 border-none shadow-md hover:-translate-y-1 hover:brightness-105 active:scale-95">
          <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <CardContent className="p-6 relative z-10">
            <div className="relative">
              <div className="absolute right-0 top-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
                <XCircle className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div className="text-white pr-16">
                <p className="text-xs font-bold text-white/90 tracking-widest drop-shadow-sm">Permohonan Ditolak (Rejected)</p>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight drop-shadow-md">
                  <AnimatedNumber value={rejectedCount} suffix=" Transaksi" />
                </h3>
                <p className="text-xs mt-2 text-white/80 drop-shadow-sm font-medium">Pengajuan dibatalkan/ditolak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table List */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table id="fund-transfer-table">
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40">
                <TableRow>
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead className="w-[120px]">Ref Number</TableHead>
                  <TableHead>Aliran Pemindahan Dana (Flow)</TableHead>
                  <TableHead className="text-right">Nominal Bersih</TableHead>
                  <TableHead className="text-right">Biaya Admin</TableHead>
                  <TableHead>Diajukan Oleh</TableHead>
                  <TableHead>Persetujuan Direktur</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}><Skeleton className="h-14 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-slate-400">
                      <Coins className="w-12 h-12 mx-auto mb-4 opacity-25" />
                      Belum ada permohonan pemindahan dana yang terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((trf, idx) => {
                    const fromAcc = accounts.find(a => a.id === trf.from_account_id);
                    const toAcc = accounts.find(a => a.id === trf.to_account_id);

                    return (
                      <TableRow key={trf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell className="text-center text-slate-500 font-medium w-12 text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {trf.reference}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{fromAcc?.bank_name || 'Rekening Asal'}</span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{toAcc?.bank_name || 'Rekening Tujuan'}</span>
                          </div>
                          {trf.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trf.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 dark:text-slate-100 text-sm">
                          Rp {formatNumber(trf.amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-500 text-xs">
                          {trf.fee > 0 ? `Rp ${formatNumber(trf.fee)}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {trf.requested_by}
                          <p className="text-[10px] text-slate-400">{new Date(trf.created_at).toLocaleDateString('id-ID')}</p>
                        </TableCell>
                        <TableCell>
                          {trf.status === 'Approved' ? (
                            <div className="flex items-center gap-2">
                              {trf.signature_data ? (
                                <img src={trf.signature_data} alt="Direktur Sign" className="w-12 h-6 object-contain border border-slate-100 bg-white p-0.5 rounded shadow-sm" />
                              ) : (
                                <span className="text-xs text-emerald-600 font-bold">Approved</span>
                              )}
                              <div className="text-[10px] text-slate-400 leading-tight">
                                <p className="font-bold text-slate-600 dark:text-slate-300">{trf.approved_by || 'Direktur'}</p>
                                <p>{trf.approved_at ? new Date(trf.approved_at).toLocaleDateString('id-ID') : ''}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Menunggu Approval</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {trf.document_url ? (
                            <a
                              href={trf.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 hover:underline text-xs flex items-center gap-1 font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" /> Berkas
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`px-2.5 py-1 text-[10px] font-black border uppercase tracking-wider rounded-lg ` +
                              (trf.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                               trf.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                               'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20')
                            }
                          >
                            {trf.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {trf.status === 'Pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleWhatsAppShare(trf)}
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-bold text-xs"
                                >
                                  <Share2 className="w-3 h-3" /> WA
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransfer(trf);
                                    setShowApprovalDialog(true);
                                    setTimeout(clearCanvas, 100);
                                  }}
                                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                                >
                                  Tinjau
                                </Button>
                              </>
                            )}
                            {trf.status !== 'Pending' && (
                              <span className="text-slate-300 dark:text-slate-700 text-xs italic">Selesai</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- FORM SUBMISSION DIALOG --- */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600" />
              Ajukan Permohonan Transfer Kas & Bank
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs md:text-sm font-bold text-slate-700">Rekening Asal (From) *</Label>
                <Select value={formData.from_account_id} onValueChange={(v) => setFormData({ ...formData, from_account_id: v })}>
                  <SelectTrigger className="mt-1 h-12 text-sm rounded-xl border-slate-200 bg-slate-50 font-semibold focus:ring-blue-500">
                    <SelectValue placeholder="Pilih rekening asal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_number} (Saldo: Rp {formatNumber(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm font-bold text-slate-700">Rekening Tujuan (To) *</Label>
                <Select value={formData.to_account_id} onValueChange={(v) => setFormData({ ...formData, to_account_id: v })}>
                  <SelectTrigger className="mt-1 h-12 text-sm rounded-xl border-slate-200 bg-slate-50 font-semibold focus:ring-blue-500">
                    <SelectValue placeholder="Pilih rekening tujuan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_number} (Saldo: Rp {formatNumber(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs md:text-sm font-bold text-slate-700">Nominal Transfer (Rp) *</Label>
                <NumberInput
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 h-12 text-sm rounded-xl border-slate-200 bg-white font-bold"
                  placeholder="Masukkan jumlah nominal..."
                  required
                />
              </div>

              <div>
                <Label className="text-xs md:text-sm font-bold text-slate-700">Biaya Administrasi (Rp) (Opsional)</Label>
                <NumberInput
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  className="mt-1 h-12 text-sm rounded-xl border-slate-200 bg-white font-semibold text-slate-500"
                  placeholder="Contoh: 6500"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs md:text-sm font-bold text-slate-700">Catatan / Keterangan</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 h-12 text-sm rounded-xl border-slate-200 bg-white font-medium"
                placeholder="Contoh: Pemindahan saldo QRIS Mayar ke BRI fisik..."
              />
            </div>

            {/* Document Slip Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm font-bold text-slate-700">Unggah Berkas Jalan / Slip Pendukung (Opsional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('document-upload').click()}
                  className="h-12 border-dashed border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Pilih Berkas
                </Button>
                {documentFile && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> {documentFile.name} (Siap)
                  </span>
                )}
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 space-y-2 text-xs md:text-sm font-medium">
              <p className="flex justify-between text-blue-800 dark:text-blue-200">
                <span>Jumlah Transfer:</span>
                <span className="font-bold">Rp {formatNumber(Number(formData.amount || 0))}</span>
              </p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Biaya Administrasi:</span>
                <span className="font-semibold">Rp {formatNumber(Number(formData.fee || 0))}</span>
              </p>
              <div className="border-t border-blue-200/50 dark:border-blue-800/40 pt-2 flex justify-between text-base font-black text-blue-950 dark:text-blue-100">
                <span>Total Dipotong (Rek. Asal):</span>
                <span>Rp {formatNumber(Number(formData.amount || 0) + Number(formData.fee || 0))}</span>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)} className="text-sm h-11 rounded-xl px-5 font-semibold">
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl px-6 font-bold flex items-center justify-center"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Kirim Pengajuan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- REVIEW & APPROVAL DIALOG (WITH DIGITAL SIGNATURE) --- */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Tinjau & Setujui Pemindahan Dana
            </DialogTitle>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4 pt-2 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rekening Sumber (From)</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {accounts.find(a => a.id === selectedTransfer.from_account_id)?.bank_name || 'Rekening Asal'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rekening Tujuan (To)</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {accounts.find(a => a.id === selectedTransfer.to_account_id)?.bank_name || 'Rekening Tujuan'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nominal Transfer</p>
                  <p className="text-base font-black text-blue-600 mt-0.5">Rp {formatNumber(selectedTransfer.amount)}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Biaya Administrasi</p>
                  <p className="text-sm font-bold text-slate-600 mt-0.5">Rp {formatNumber(selectedTransfer.fee || 0)}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Catatan / Keterangan</p>
                <p className="text-slate-700 font-medium mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100">{selectedTransfer.notes || 'Tanpa catatan'}</p>
              </div>

              {selectedTransfer.document_url && (
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Berkas Jalan / Slip Pendukung</p>
                  <a
                    href={selectedTransfer.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-bold inline-flex items-center gap-1 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg text-xs"
                  >
                    <FileText className="w-4 h-4" /> Lihat & Unduh Berkas Lampiran
                  </a>
                </div>
              )}

              {/* Digital Signature Pad Canvas */}
              {isApprover ? (
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs md:text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <span>✍️</span> Torehkan Tanda Tangan Anda di Sini *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="text-rose-500 hover:text-rose-600 text-xs font-bold"
                    >
                      Clear / Bersihkan
                    </Button>
                  </div>
                  <div className="border border-slate-200 bg-slate-50/50 rounded-xl overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full bg-white cursor-crosshair h-[150px]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Tanda tangan digital ini akan disematkan secara sah pada berkas persetujuan mutasi kas ERP.</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span> Anda tidak memiliki hak otorisasi untuk menyetujui pemindahan dana ini. Hanya Owner/Direktur yang memiliki akses.
                </div>
              )}

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApprovalDialog(false)}
                  className="text-sm h-11 rounded-xl px-5 font-semibold"
                >
                  Tutup
                </Button>
                {isApprover && (
                  <>
                    <Button
                      type="button"
                      onClick={handleReject}
                      disabled={isSaving}
                      className="text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 h-11 rounded-xl px-5 font-bold flex items-center gap-1 justify-center"
                    >
                      <X className="w-4 h-4" /> Tolak Permohonan
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      disabled={isSaving || !hasSigned}
                      className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-xl px-6 font-bold flex items-center gap-1 justify-center shadow-lg shadow-emerald-500/20"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4" />}
                      Setujui & Tanda Tangani
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PremiumGate>
  );
}
