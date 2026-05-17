import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, DollarSign, CreditCard, Loader2, Plus, Camera, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import PageHeader from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import Tesseract from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
import ExportToolbar from '@/components/layout/ExportToolbar';
import moment from 'moment';
import 'moment/locale/id';
import { useSettings } from '@/contexts/SettingsContext';
import { getEffectiveLimits } from '@/planConfig';

export default function Payables({ store }) {
  const { toast } = useToast();
  const { getModalSizeClasses } = useSettings();
  const [payables, setPayables] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [viewingItem, setViewingItem] = useState(null);

  useEffect(() => {
    if (viewingItem?.id) {
      api.entities.InvoicePayment.filter({ invoice_id: viewingItem.id }).then(res => setPaymentHistory(res));
    } else {
      setPaymentHistory([]);
    }
  }, [viewingItem]);
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: '', amount: '', due_date: '', notes: '' });

  // OCR States
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrError, setOcrError] = useState(false);
  const [lastUploadedImageBase64, setLastUploadedImageBase64] = useState(null);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const [useDeposit, setUseDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);

  // Trial detection for OCR gating
  const isTrial = store?.plan === 'pro' && store?.has_used_trial;
  const isFree = !store?.plan || store?.plan === 'free';
  const isOcrLocked = isTrial || isFree;

  useEffect(() => {
    if (store?.id) loadData();

    // Listener untuk tombol refresh di Header
    const handleRefreshEvent = () => {
      if (store?.id) loadData();
    };
    window.addEventListener('refresh_data', handleRefreshEvent);

    return () => {
      window.removeEventListener('refresh_data', handleRefreshEvent);
    };
  }, [store]);

  const loadData = async () => {
    const [payablesData, suppliersData, bankData, paymentsData] = await Promise.all([
      api.entities.Payable.filter({ store_id: store.id }, '-created_date'),
      api.entities.Supplier.filter({ store_id: store.id }),
      api.entities.BankAccount.filter({ store_id: store.id }),
      api.entities.InvoicePayment.filter({ store_id: store.id, invoice_type: 'Payable' })
    ]);
    setPayables(payablesData);
    setSuppliers(suppliersData);
    setAccounts(bankData);
    setAllPayments(paymentsData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const extractReceiptData = (text) => {
    let amount = null;
    
    const cleanIDR = (str) => {
      let s = str.replace(/(?:Rp|IDR)/gi, '').trim();
      s = s.replace(/,00$/g, '');
      s = s.replace(/\.00$/g, '');
      s = s.replace(/[\.,]/g, '');
      return parseFloat(s);
    };

    // Pattern 1: Strong keywords (TOTAL, JUMLAH, NOMINAL)
    const strongMatch = text.match(/(?:TOTAL|JUMLAH|BAYAR|TAGIHAN|NOMINAL)\s*(?:IDR|Rp)?\s*[:\-]?\s*([\d\.,]+)/i);
    if (strongMatch) {
      amount = cleanIDR(strongMatch[1]);
    }

    // Pattern 2: Numbers prefixed with IDR or Rp
    if (!amount || isNaN(amount)) {
      const currencyMatches = [...text.matchAll(/(?:IDR|Rp)\s*([\d\.,]{4,})/gi)];
      const parsedCurrencies = currencyMatches.map(m => cleanIDR(m[1])).filter(n => !isNaN(n) && n > 100);
      if (parsedCurrencies.length > 0) {
        amount = Math.max(...parsedCurrencies);
      }
    }

    // Pattern 3: Fallback to largest formatted number (must have thousand separators to avoid NPWP/Ref numbers)
    if (!amount || isNaN(amount)) {
      const formattedNumbers = [...text.matchAll(/(?:\s|^)([\d]{1,3}(?:[\.,][\d]{3})+)(?:\s|$)/gi)];
      const parsedNumbers = formattedNumbers.map(m => cleanIDR(m[1])).filter(n => !isNaN(n) && n > 100);
      if (parsedNumbers.length > 0) {
        amount = Math.max(...parsedNumbers);
      }
    }

    let bankMatch = null;
    const textUpper = text.toUpperCase();
    if (textUpper.includes('BCA')) bankMatch = 'BCA';
    else if (textUpper.includes('MANDIRI')) bankMatch = 'Mandiri';
    else if (textUpper.includes('BRI')) bankMatch = 'BRI';
    else if (textUpper.includes('BNI')) bankMatch = 'BNI';
    else if (textUpper.includes('BSI')) bankMatch = 'BSI';

    return { amount, bankMatch };
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      sonnerToast.error(`Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)}MB melebihi batas maksimal 2MB.`, { duration: 5000 });
      e.target.value = ''; return;
    }
    setLastUploadedFile(file);

    setIsOcrProcessing(true);
    setOcrError(false);
    setOcrMessage('Mengekstrak Teks (Tesseract Gratis)...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        setLastUploadedImageBase64(base64data);
        
        const { data: { text } } = await Tesseract.recognize(
          file,
          'ind+eng',
          { logger: m => {
              if (m.status === 'recognizing text') {
                setOcrMessage(`Membaca Struk... ${Math.round(m.progress * 100)}%`);
              }
            } 
          }
        );

        const { amount, bankMatch } = extractReceiptData(text);

        if (amount && !isNaN(amount) && amount > 0) {
          setPaymentAmount(amount);
          toast({ title: "Berhasil", description: `Nominal terdeteksi: Rp ${formatCurrency(amount)}` });
          
          if (bankMatch) {
            setPaymentMethod('Bank');
            // Auto select bank if match
            setAccounts(prev => {
              const foundBank = prev.find(a => a.bank_name.toUpperCase().includes(bankMatch));
              if (foundBank) setSelectedBankId(foundBank.id);
              return prev;
            });
          }
          setIsOcrProcessing(false);
        } else {
          setOcrError(true);
          setOcrMessage('Gagal mendeteksi nominal. Gambar mungkin terlalu buram.');
          setIsOcrProcessing(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err) {
      setOcrError(true);
      setOcrMessage('Terjadi kesalahan saat memproses gambar.');
      setIsOcrProcessing(false);
    }
  };

  const runGoogleCloudVision = async () => {
    if (!lastUploadedImageBase64) return;

    setIsOcrProcessing(true);
    setOcrError(false);
    setOcrMessage('Menganalisis dengan Smart AI OCR...');

    try {
      const base64Image = lastUploadedImageBase64.split(',')[1];
      const { data: visionData, error: visionError } = await supabase.functions.invoke('app-bridge', {
        body: {
          action: 'analyze-vision',
          payload: {
            requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }]
          }
        }
      });
      if (visionError) throw visionError;
      if (visionData?.error) {
        console.error("Vision API Error Detail:", visionData.error);
        throw new Error("Gagal menganalisis gambar. Layanan AI sedang tidak tersedia.");
      }
      if (!visionData?.responses) throw new Error('Sistem AI tidak mengembalikan data. Silakan coba lagi nanti.');
      const text = visionData.responses[0]?.fullTextAnnotation?.text || '';

      const { amount, bankMatch } = extractReceiptData(text);

      if (amount && !isNaN(amount) && amount > 0) {
        setPaymentAmount(amount);
        toast({ title: "Berhasil (Smart AI)", description: `Nominal terdeteksi: Rp ${formatCurrency(amount)}` });
        
        if (bankMatch) {
          setPaymentMethod('Bank');
          setAccounts(prev => {
            const foundBank = prev.find(a => a.bank_name.toUpperCase().includes(bankMatch));
            if (foundBank) setSelectedBankId(foundBank.id);
            return prev;
          });
        }
      } else {
        toast({ title: "Gagal", description: "Sistem AI tidak dapat mendeteksi nominal pada dokumen ini.", variant: "destructive" });
      }
      setIsOcrProcessing(false);

    } catch (err) {
      toast({ title: "Gagal Memproses Gambar", description: err.message, variant: "destructive" });
      setIsOcrProcessing(false);
    }
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\./g, '');
    if (!isNaN(rawValue)) {
      setFormData({ ...formData, amount: rawValue });
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

    // --- PAYABLES LIMIT CHECK ---
    const limits = getEffectiveLimits(store);
    if (limits.maxPayables !== Infinity) {
      if (payables.length >= limits.maxPayables) {
        sonnerToast.error(`Kuota Hutang habis (${payables.length}/${limits.maxPayables}). Upgrade ke Pro Plan untuk menambah kuota.`, { duration: 5000 });
        return;
      }
    }
    // ----------------------------

    if (!formData.supplier_id) {
      toast({ title: "Validation Error", description: "Pilih supplier terlebih dahulu", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const supplier = suppliers.find(v => v.id === formData.supplier_id);
    const invoiceNumber = `PAY-${Date.now()}`;
    const amount = Number(formData.amount);

    await api.entities.Payable.create({
      store_id: store.id,
      invoice_number: invoiceNumber,
      supplier_id: formData.supplier_id,
      supplier_name: supplier?.name || '',
      amount,
      remaining_amount: amount,
      due_date: formData.due_date,
      notes: formData.notes,
      status: 'Pending',
      timestamp_wib: getWIBTimestamp()
    });

    // --- JOURNAL ENTRY: Pencatatan Hutang Manual Baru ---
    const apJournal = await api.entities.JournalEntry.create({
      store_id: store.id,
      transaction_id: invoiceNumber,
      date: new Date().toISOString(),
      description: `Hutang Baru - ${supplier?.name} (${invoiceNumber})`,
      type: 'Payable',
      status: 'Draft',
      total_debit: amount,
      total_credit: amount,
      created_by: 'Administrator'
    });

    await Promise.all([
      api.entities.JournalLine.create({
        journal_id: apJournal.id,
        account_name: 'Beban Operasional',
        description: `Beban hutang ke ${supplier?.name}`,
        debit: amount,
        credit: 0
      }),
      api.entities.JournalLine.create({
        journal_id: apJournal.id,
        account_name: 'Hutang Usaha',
        description: `Hutang baru ke ${supplier?.name}`,
        debit: 0,
        credit: amount
      })
    ]);
    // ---------------------------------------------------

    setIsSaving(false);
    setShowForm(false);
    setFormData({ supplier_id: '', amount: '', due_date: '', notes: '' });
    loadData();
  };

  const handlePayment = async () => {
    if (!paymentDialog || (paymentAmount <= 0 && !useDeposit)) return;
    if (paymentMethod === 'Bank' && !selectedBankId && paymentAmount > 0) {
      toast({ title: "Validation Error", description: "Pilih rekening bank", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let paymentProofUrl = null;
    if (lastUploadedFile && paymentAmount > 0) {
      try {
        const res = await api.storage.upload(lastUploadedFile);
        paymentProofUrl = res.url;
      } catch (err) {
        console.error("Gagal mengunggah bukti struk", err);
      }
    }

    const bank = accounts.find(a => a.id === selectedBankId);
    
    // Hitung Advance Balance (Kelebihan Bayar & Pemotongan Deposit)
    const selectedSupplier = suppliers.find(s => s.id === paymentDialog.supplier_id);
    const currentAdvanceBalance = selectedSupplier?.advance_balance || 0;
    
    let excessAmount = 0;
    let depositUsed = 0;
    let actualPaidToInvoice = 0;
    const remaining = paymentDialog.remaining_amount;

    if (useDeposit && currentAdvanceBalance > 0) {
      // Use custom deposit amount (capped to available balance and remaining)
      depositUsed = Math.min(Number(depositAmount) || 0, currentAdvanceBalance, remaining);
      const stillNeeded = remaining - depositUsed;
      const cashPaid = Number(paymentAmount);
      
      if (cashPaid > stillNeeded && stillNeeded >= 0) {
        excessAmount = cashPaid - stillNeeded;
        actualPaidToInvoice = remaining;
      } else {
        actualPaidToInvoice = depositUsed + cashPaid;
      }
    } else {
      // No deposit, pure cash/bank payment
      const cashPaid = Number(paymentAmount);
      if (cashPaid > remaining) {
        excessAmount = cashPaid - remaining;
        actualPaidToInvoice = remaining;
      } else {
        actualPaidToInvoice = cashPaid;
      }
    }

    const newPaidAmount = (paymentDialog.paid_amount || 0) + actualPaidToInvoice;
    const newRemaining = paymentDialog.amount - newPaidAmount;
    const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial';

    // 1. Update Payable
    await api.entities.Payable.update(paymentDialog.id, {
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, newRemaining),
      status: newStatus,
      payment_proof_url: paymentAmount > 0 ? paymentProofUrl : paymentDialog.payment_proof_url,
      payment_bank_name: paymentAmount > 0 ? (paymentMethod === 'Bank' ? bank?.bank_name : 'Cash') : paymentDialog.payment_bank_name
    });

    // 1b. Update Supplier Balance
    if ((excessAmount > 0 || depositUsed > 0) && paymentDialog.supplier_id) {
      const newAdvanceBalance = currentAdvanceBalance + excessAmount - depositUsed;
      try {
        await api.entities.Supplier.update(paymentDialog.supplier_id, { advance_balance: newAdvanceBalance });
      } catch (err) {
        console.error("Failed to update supplier balance (might be missing or invalid UUID)", err);
      }
    }

    const timestamp = getWIBTimestamp();
    const currentDate = new Date().toISOString().split('T')[0];

    // 2. Integrated Financial Action
    if (paymentAmount > 0) {
      const reference = `PAY-PAY-${Date.now()}`;
      
      if (paymentMethod === 'Bank') {
        const newBalance = (bank?.balance || 0) - paymentAmount;

        // Create Bank Transaction
        await api.entities.BankTransaction.create({
          store_id: store.id,
          bank_account_id: selectedBankId,
          bank_name: bank?.bank_name,
          transaction_type: 'Debit',
          amount: paymentAmount,
          description: `Pelunasan Hutang - ${paymentDialog.supplier_name} (${paymentDialog.invoice_number})`,
          reference,
          status: 'Approved',
          balance_after: newBalance,
          timestamp_wib: timestamp,
          payment_proof_url: paymentProofUrl
        });

        // Update Bank Balance
        await api.entities.BankAccount.update(selectedBankId, { balance: newBalance });
      }

      // Create Journal Entry
      const journal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: reference,
        date: new Date().toISOString(),
        description: `Pelunasan Hutang - ${paymentDialog.supplier_name} (${paymentDialog.invoice_number})`,
        type: 'Payment',
        status: 'Draft',
        total_debit: paymentAmount,
        total_credit: paymentAmount,
        created_by: 'Administrator'
      });

      const coaAccounts = await api.entities.COA.filter({ store_id: store.id });
      const apAccount = coaAccounts.find(a => a.name.includes('Hutang Usaha'))?.name || 'Hutang Usaha';
      const cashOrBankAcc = paymentMethod === 'Bank'
        ? (coaAccounts.find(a => a.name.includes(bank?.bank_name))?.name || `Bank (${bank?.bank_name})`)
        : (coaAccounts.find(a => a.name.includes('Kas Kantor'))?.name || 'Kas Kantor');

      await Promise.all([
        api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: apAccount,
          description: `Pengurangan Hutang - ${paymentDialog.supplier_name}`,
          debit: paymentAmount,
          credit: 0
        }),
        api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: cashOrBankAcc,
          description: `Pengeluaran Pelunasan Hutang`,
          debit: 0,
          credit: paymentAmount
        })
      ]);

      // Log Invoice Payment History (Cash/Bank)
      await api.entities.InvoicePayment.create({
         store_id: store.id,
         invoice_type: 'Payable',
         invoice_id: paymentDialog.id,
         invoice_number: paymentDialog.invoice_number,
         amount: paymentAmount,
         payment_method: paymentMethod,
         bank_name: paymentMethod === 'Bank' ? bank?.bank_name : 'Cash',
         payment_proof_url: paymentProofUrl,
         reference,
         payment_date: currentDate,
         timestamp_wib: timestamp
      });
    }

    // Log Invoice Payment History (Deposit Used) + Journal Entry for Internal Ledger
    if (depositUsed > 0) {
      const depositRef = `DEPOSIT-${Date.now()}`;
      await api.entities.InvoicePayment.create({
         store_id: store.id,
         invoice_type: 'Payable',
         invoice_id: paymentDialog.id,
         invoice_number: paymentDialog.invoice_number,
         amount: depositUsed,
         payment_method: 'Deposit',
         bank_name: 'Saldo Supplier',
         payment_proof_url: '',
         reference: depositRef,
         payment_date: currentDate,
         timestamp_wib: timestamp
      });

      // Create Journal Entry for deposit usage (integrates with Bank Reconciliation)
      const depositJournal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: depositRef,
        date: new Date().toISOString(),
        description: `Pembayaran Deposit - ${paymentDialog.supplier_name} (${paymentDialog.invoice_number})`,
        type: 'Payment',
        status: 'Draft',
        total_debit: depositUsed,
        total_credit: depositUsed,
        created_by: 'Administrator'
      });

      const coaAccounts = await api.entities.COA.filter({ store_id: store.id });
      const apAccount = coaAccounts.find(a => a.name.includes('Hutang Usaha'))?.name || 'Hutang Usaha';
      const depositAccount = coaAccounts.find(a => a.name.includes('Uang Muka'))?.name || 'Uang Muka Supplier';

      await Promise.all([
        api.entities.JournalLine.create({
          journal_id: depositJournal.id,
          account_name: apAccount,
          description: `Pengurangan Hutang via Deposit - ${paymentDialog.supplier_name}`,
          debit: depositUsed,
          credit: 0
        }),
        api.entities.JournalLine.create({
          journal_id: depositJournal.id,
          account_name: depositAccount,
          description: `Pemakaian Deposit Supplier - ${paymentDialog.supplier_name}`,
          debit: 0,
          credit: depositUsed
        })
      ]);
    }

    setIsSaving(false);
    setPaymentDialog(null);
    setPaymentAmount(0);
    setUseDeposit(false);
    setDepositAmount(0);
    setPaymentMethod('Cash');
    setSelectedBankId('');
    setLastUploadedFile(null);
    setLastUploadedImageBase64(null);
    loadData();
  };

  const getStatusBadge = (status) => {
    const labels = {
      Pending: 'Menunggu',
      Partial: 'Bayar Sebagian',
      Paid: 'Lunas',
      Overdue: 'Jatuh Tempo'
    };
    const styles = {
      Pending: 'bg-amber-100 text-amber-700',
      Partial: 'bg-blue-600 text-white font-bold',
      Paid: 'bg-emerald-100 text-emerald-700',
      Overdue: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-slate-100'} variant="outline">{labels[status] || status}</Badge>;
  };

  const totalPayables = payables.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + (p.remaining_amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Payables"
        subtitle="Kelola kewajiban pembayaran kepada supplier"
        icon={CreditCard}
        actions={
          <>
            <ExportToolbar 
              title="Laporan Account Payables" 
              date={moment().format('DD MMMM YYYY')} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-payables-table" 
            />
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Record Hutang
            </Button>
          </>
        }
      />

      <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl border-none shadow-xl">
        <CardContent className="p-8">
          <p className="text-base font-medium text-red-100 tracking-wide mb-1">Total Hutang Belum Lunas</p>
          <p className="text-4xl font-black mt-2 tracking-tight">
            <AnimatedNumber value={totalPayables} prefix="Rp " />
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-none shadow-xl shadow-blue-100/50 overflow-hidden">
        <CardContent className="p-0">
          <Table id="print-payables-table">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8 w-12">No.</TableHead>
                <TableHead >Invoice #</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Terbayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center pr-8">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : payables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20 text-slate-400">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Belum ada catatan hutang</p>
                  </TableCell>
                </TableRow>
              ) : (
                payables.map((item, idx) => {
                  const invoicePayments = allPayments.filter(p => p.invoice_id === item.id);
                  const totalTransfer = invoicePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  const overpayment = totalTransfer > 0 ? Math.max(0, totalTransfer - (item.paid_amount || 0)) : 0;
                  const depositUsed = invoicePayments.filter(p => p.payment_method === 'Deposit').reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8 text-xs font-medium text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900">{item.invoice_number}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">{item.timestamp_wib}</TableCell>
                      <TableCell className="font-bold text-slate-800">{item.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 underline decoration-slate-200">Rp {formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-emerald-600">Rp {formatCurrency(item.paid_amount || 0)}</div>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          {depositUsed > 0 && (
                            <div className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block">
                              Via Deposit: Rp {formatCurrency(depositUsed)}
                            </div>
                          )}
                          {overpayment > 0 && (
                            <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block">
                              +Rp {formatCurrency(overpayment)} (Kelebihan Menjadi Deposit)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-black">Rp {formatCurrency(item.remaining_amount)}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{item.due_date}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center pr-8">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingItem(item)}
                          className="hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {item.status !== 'Paid' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setPaymentDialog(item); setPaymentAmount(item.remaining_amount); }}
                            className="hover:bg-emerald-50 hover:text-emerald-600 rounded-xl"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-xl">
          <DialogHeader><DialogTitle className="font-black text-xl">Tambah Hutang Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Pilih Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                  <SelectValue placeholder="Pilih supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Hutang *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <NumberInput
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-black text-lg"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jatuh Tempo *</Label>
              <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" required />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan Internal</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="h-12 font-bold rounded-xl">Batal</Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="rounded-xl border-none p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-8 pt-8 pb-0">
            <DialogTitle className="text-2xl font-black text-slate-900">Pelunasan Hutang</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4 px-8 pb-8 overflow-y-auto">
            <div className="bg-blue-600 p-6 rounded-xl text-white shadow-xl shadow-blue-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Sisa Kewajiban</p>
              <p className="text-3xl font-black">Rp {formatCurrency(paymentDialog?.remaining_amount || 0)}</p>
            </div>

            {/* Step 1: Deposit (if available) */}
            {(() => {
              const supplierBalance = suppliers.find(s => s.id === paymentDialog?.supplier_id)?.advance_balance || 0;
              if (supplierBalance <= 0) return null;
              const remaining = paymentDialog?.remaining_amount || 0;
              const maxDeposit = Math.min(supplierBalance, remaining);
              return (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="useDeposit" checked={useDeposit} onChange={(e) => {
                      setUseDeposit(e.target.checked);
                      if (e.target.checked) {
                        setDepositAmount(maxDeposit);
                        setPaymentAmount(Math.max(0, remaining - maxDeposit));
                      } else {
                        setDepositAmount(0);
                        setPaymentAmount(remaining);
                      }
                    }} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                    <div className="flex-1">
                      <Label htmlFor="useDeposit" className="text-xs font-bold text-amber-900 dark:text-amber-400 cursor-pointer">Gunakan Saldo Deposit</Label>
                      <p className="text-[10px] text-amber-700 dark:text-amber-500/80">Tersedia: Rp {formatCurrency(supplierBalance)}</p>
                    </div>
                  </div>
                  {useDeposit && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-500">Jumlah Deposit yang Digunakan</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-amber-500 text-sm">Rp</span>
                        <NumberInput value={depositAmount} onChange={(e) => { const val = Math.min(Number(e.target.value), maxDeposit); setDepositAmount(val); setPaymentAmount(Math.max(0, remaining - val)); }} className="h-10 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 font-black text-sm text-amber-900 dark:text-amber-300" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setDepositAmount(maxDeposit); setPaymentAmount(Math.max(0, remaining - maxDeposit)); }} className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors">Maks (Rp {formatCurrency(maxDeposit)})</button>
                        <button type="button" onClick={() => { const half = Math.round(maxDeposit / 2); setDepositAmount(half); setPaymentAmount(Math.max(0, remaining - half)); }} className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg transition-colors">50%</button>
                        <button type="button" onClick={() => { setDepositAmount(0); setPaymentAmount(remaining); }} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors">Reset</button>
                      </div>
                      {Number(depositAmount) > 0 && Number(depositAmount) < remaining && (
                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-wider text-amber-800/70">Opsi Pembayaran Parsial</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className="cursor-pointer p-1 text-slate-400 hover:text-blue-500 transition-colors rounded-full hover:bg-white outline-none focus:ring-2 focus:ring-blue-100">
                                  <Info className="w-4 h-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 bg-slate-900 text-white text-[10px] p-3 rounded-xl shadow-2xl border-slate-700" side="top" align="end" sideOffset={5}>
                                <p className="font-bold mb-1.5 text-amber-300 flex items-center gap-1.5">
                                  <Info className="w-3 h-3" /> Info Pilihan Pembayaran
                                </p>
                                <ul className="list-disc pl-3 space-y-1.5 text-slate-300 leading-relaxed">
                                  <li><strong className="text-white">Lunasi Sisa:</strong> Membayar kekurangan dana menggunakan Cash/Bank. Status hutang akan menjadi <strong className="text-emerald-400">Lunas</strong>.</li>
                                  <li><strong className="text-white">Hanya Deposit:</strong> Hanya menggunakan deposit tanpa mengeluarkan uang cash. Status hutang akan menjadi <strong className="text-amber-400">Sebagian</strong>.</li>
                                </ul>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setPaymentAmount(Math.max(0, remaining - Number(depositAmount)))} className={`text-[10px] font-bold px-2.5 py-2 rounded-xl transition-all flex-1 ${Number(paymentAmount) > 0 ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-blue-50 border border-slate-200'}`}>Lunasi Sisa (Rp {formatCurrency(remaining - Number(depositAmount))})</button>
                            <button type="button" onClick={() => setPaymentAmount(0)} className={`text-[10px] font-bold px-2.5 py-2 rounded-xl transition-all flex-1 ${Number(paymentAmount) === 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-emerald-50 border border-slate-200'}`}>Hanya Deposit (Bayar Sebagian)</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Full deposit confirmation */}
            {useDeposit && Number(depositAmount) >= (paymentDialog?.remaining_amount || 0) && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</div>
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-400">Seluruh tagihan ditutup dari deposit</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-500/80">Tidak perlu pembayaran cash/bank tambahan</p>
                </div>
              </div>
            )}

            {/* Step 2: Cash/Bank (only when needed) */}
            {(!useDeposit || Number(paymentAmount) > 0) && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-2">
                   <Label>{useDeposit ? 'Sisa Dibayar via Cash/Bank' : 'Jumlah yang Dibayarkan *'}</Label>
                   {!useDeposit && (
                     <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => document.getElementById('ocr-upload').click()}>
                        <Camera className="w-3 h-3 mr-2" /> Scan Struk
                     </Button>
                   )}
                   <input type="file" id="ocr-upload" className="hidden" accept="image/*" onChange={handleOcrUpload} />
                </div>
              
              <AnimatePresence>
                {isOcrProcessing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 mb-4">
                       <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                       <p className="text-xs font-bold text-blue-800">{ocrMessage}</p>
                    </div>
                  </motion.div>
                )}
                {ocrError && !isOcrProcessing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2 mb-4">
                       <div className="flex items-center gap-2 text-amber-800">
                         <AlertTriangle className="w-4 h-4" />
                         <p className="text-xs font-bold">{ocrMessage}</p>
                       </div>
                       <Button size="sm" onClick={() => {
                           if (isOcrLocked) {
                             sonnerToast.error(
                               <div className="flex flex-col gap-1">
                                 <span className="font-bold text-sm">{isTrial ? 'Fitur Trial Terbatas' : 'Upgrade ke Pro'}</span>
                                 <span className="text-xs">Smart AI OCR hanya tersedia untuk paket Pro berbayar. Upgrade untuk menggunakan fitur ini.</span>
                               </div>,
                               { duration: 5000 }
                             );
                             return;
                           }
                           runGoogleCloudVision();
                         }} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-lg text-xs h-8">
                         <Sparkles className="w-3 h-3 mr-2" /> Gunakan Cloud Vision AI (Premium)
                       </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                <NumberInput
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-12 pl-12 rounded-xl bg-slate-50 border-none font-black text-lg"
                />
              </div>
              </div>
            )}

            {/* Step 3: Payment method (only when cash/bank > 0) */}
            {Number(paymentAmount) > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{useDeposit ? 'Metode untuk Sisa' : 'Metode Pembayaran'}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash (Kas)</SelectItem>
                      <SelectItem value="Bank">Transfer Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'Bank' && (
                  <div className="space-y-1.5">
                    <Label>Pilih Rekening</Label>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue placeholder="Pilih Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.bank_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Payment Summary */}
            {useDeposit && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ringkasan Pembayaran</p>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-700 font-bold">Dari Deposit Supplier</span>
                  <span className="font-black text-amber-700">Rp {formatCurrency(depositAmount)}</span>
                </div>
                {Number(paymentAmount) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-bold">Dari {paymentMethod === 'Cash' ? 'Cash (Kas)' : 'Transfer Bank'}</span>
                    <span className="font-black text-slate-800">Rp {formatCurrency(paymentAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5 mt-1">
                  <span className="text-slate-900 font-black">Total Dibayarkan</span>
                  <span className="font-black text-emerald-600">Rp {formatCurrency(Number(depositAmount) + Number(paymentAmount))}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={() => setPaymentDialog(null)} className="flex-1 h-12 rounded-xl font-bold">Batal</Button>
              <Button
                onClick={handlePayment}
                disabled={isSaving || (paymentAmount <= 0 && !useDeposit)}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Konfirmasi Pembayaran
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className={`rounded-xl max-h-[90vh] overflow-y-auto ${getModalSizeClasses()}`}>
          <DialogHeader><DialogTitle className="font-black text-xl text-slate-900">Detail Kewajiban Hutang</DialogTitle></DialogHeader>
          {viewingItem && (
            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice #</p><p className="font-black text-slate-900">{viewingItem.invoice_number}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</p><p className="font-bold text-slate-800">{viewingItem.supplier_name}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hutang</p><p className="font-black text-slate-900">Rp {formatCurrency(viewingItem.amount)}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telah Dibayar (Ke Tagihan)</p><p className="font-black text-emerald-600">Rp {formatCurrency(viewingItem.paid_amount || 0)}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sisa Kewajiban</p><p className="font-black text-red-600">Rp {formatCurrency(viewingItem.remaining_amount)}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>{getStatusBadge(viewingItem.status)}</div>
              </div>

              {/* Payment Breakdown by Source */}
              {paymentHistory.length > 0 && (() => {
                const depositPayments = paymentHistory.filter(p => p.payment_method === 'Deposit');
                const cashBankPayments = paymentHistory.filter(p => p.payment_method !== 'Deposit');
                const totalCashBank = cashBankPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                // Overpayment = only when cash/bank transfer ALONE exceeds invoice amount
                const invoiceAmount = Number(viewingItem.amount || 0);
                const overpayment = Math.max(0, totalCashBank - invoiceAmount);

                return (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Sumber Pembayaran</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      {cashBankPayments.map((p, i) => (
                        <div key={`cb-${i}`} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-b-0">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{p.bank_name || p.payment_method}</p>
                            <p className="text-[10px] text-slate-400">{p.payment_date} • Ref: {p.reference}</p>
                          </div>
                          <p className="text-sm font-black text-slate-900">Rp {formatCurrency(p.amount)}</p>
                        </div>
                      ))}
                      {depositPayments.map((p, i) => (
                        <div key={`dp-${i}`} className="flex justify-between items-center px-4 py-3 bg-blue-50 border-b border-blue-100 last:border-b-0">
                          <div>
                            <p className="text-xs font-bold text-blue-800">Saldo Deposit Supplier</p>
                            <p className="text-[10px] text-blue-500">{p.payment_date} • Ref: {p.reference}</p>
                          </div>
                          <p className="text-sm font-black text-blue-700">Rp {formatCurrency(p.amount)}</p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-4 py-3 bg-slate-50 font-black">
                        <p className="text-xs text-slate-600">Total Pembayaran</p>
                        <p className="text-sm text-emerald-600">Rp {formatCurrency(viewingItem.paid_amount || 0)}</p>
                      </div>
                    </div>

                    {overpayment > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-amber-900">Kelebihan Bayar</p>
                            <p className="text-[10px] text-amber-700 font-medium">Otomatis masuk ke Saldo Deposit Supplier</p>
                          </div>
                          <p className="text-sm font-black text-amber-600">+ Rp {formatCurrency(overpayment)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewingItem.notes && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan Internal</p>
                  <p className="text-xs font-medium text-slate-700">{viewingItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
