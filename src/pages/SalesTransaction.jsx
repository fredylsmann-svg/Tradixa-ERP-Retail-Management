import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Eye, ShoppingCart, Receipt, CalendarClock, Wallet, Phone, User, CreditCard, X, ZoomIn, CheckCircle2, Clock, ArrowRight, Lock, Loader2, QrCode, MessageSquare, Ban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SalesTransactionForm from '@/components/product/SalesTransactionForm';
import PrintInvoice from '@/components/invoice/PrintInvoice';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { getEffectiveLimits } from '@/planConfig';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SalesTransaction({ store }) {
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [viewingQrisTx, setViewingQrisTx] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [linkedAR, setLinkedAR] = useState(null);
  const [proofLightbox, setProofLightbox] = useState(null);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();
  const { toast } = useToast();

  // Accounts Receivable POS States
  const [showARPaymentModal, setShowARPaymentModal] = useState(false);
  const [arCustomers, setArCustomers] = useState([]);
  const [selectedArCustomerId, setSelectedArCustomerId] = useState('');
  const [outstandingReceivables, setOutstandingReceivables] = useState([]);
  const [selectedReceivableId, setSelectedReceivableId] = useState('');
  const [arPaymentAmount, setArPaymentAmount] = useState('');
  const [arPaymentMethod, setArPaymentMethod] = useState('Cash');
  const [arBankAccounts, setArBankAccounts] = useState([]);
  const [selectedArBankId, setSelectedArBankId] = useState('');
  const [arTraceNumber, setArTraceNumber] = useState('');
  const [arEdcStatus, setArEdcStatus] = useState('idle'); // idle, connecting, processing, success, failed
  const [arEdcErrorMessage, setArEdcErrorMessage] = useState('');
  const [isSavingARPayment, setIsSavingARPayment] = useState(false);

  // QRIS Confirmation States
  const [qrisConfirmRrn, setQrisConfirmRrn] = useState('');
  const [isSavingQrisConfirm, setIsSavingQrisConfirm] = useState(false);

  // Void Transaction States
  const [voidingTransaction, setVoidingTransaction] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidAuthorizer, setVoidAuthorizer] = useState('Owner');
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    if (viewingTransaction?.payment_method === 'Piutang / Termin' && store?.id) {
      api.entities.Receivable.filter({ store_id: store.id, invoice_number: viewingTransaction.invoice_number })
        .then(data => setLinkedAR(data?.[0] || null));
    } else {
      setLinkedAR(null);
    }
  }, [viewingTransaction]);

  useEffect(() => {
    if (selectedArCustomerId && store?.id) {
      api.entities.Receivable.filter({ store_id: store.id, customer_id: selectedArCustomerId })
        .then(data => {
          const unpaid = (data || []).filter(r => r.status !== 'Paid');
          setOutstandingReceivables(unpaid);
          if (unpaid.length > 0) {
            setSelectedReceivableId(unpaid[0].id);
            setArPaymentAmount(unpaid[0].remaining_amount || 0);
          } else {
            setSelectedReceivableId('');
            setArPaymentAmount('');
          }
        });
    } else {
      setOutstandingReceivables([]);
      setSelectedReceivableId('');
      setArPaymentAmount('');
    }
  }, [selectedArCustomerId]);

  const handleOpenARPayment = async () => {
    if (!store?.id) return;
    try {
      const [customersData, bankAccountsData] = await Promise.all([
        api.entities.Customer.filter({ store_id: store.id, status: 'Active' }, 'name'),
        api.entities.BankAccount.filter({ store_id: store.id, is_active: true })
      ]);
      setArCustomers(customersData || []);
      setArBankAccounts(bankAccountsData || []);
      if (bankAccountsData?.length > 0) {
        setSelectedArBankId(bankAccountsData[0].id);
      }
      setSelectedArCustomerId('');
      setOutstandingReceivables([]);
      setSelectedReceivableId('');
      setArPaymentAmount('');
      setArPaymentMethod('Cash');
      setArTraceNumber('');
      setArEdcStatus('idle');
      setArEdcErrorMessage('');
      setShowARPaymentModal(true);
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal Memuat Data', description: err.message, variant: 'destructive' });
    }
  };

  const handleQrisConfirmFromDetail = async () => {
    if (!viewingTransaction || !qrisConfirmRrn.trim()) return;
    try {
      setIsSavingQrisConfirm(true);

      // 1. Update SalesTransaction to Paid
      await api.entities.SalesTransaction.update(viewingTransaction.id, {
        payment_status: 'Paid',
        paid_amount: viewingTransaction.total,
        payment_proof_url: `RRN: ${qrisConfirmRrn.trim()}`
      });

      // 2. Create BankTransaction record if bank accounts exist
      if (store?.id) {
        const bankAccounts = await api.entities.BankAccount.filter({ store_id: store.id, is_active: true });
        if (bankAccounts?.length > 0) {
          // Find bank containing 'mayar', or fallback to bankAccounts[0]
          let targetBank = bankAccounts.find(b => b.bank_name.toLowerCase().includes('mayar'));
          if (!targetBank) {
            // Auto-provision "Akun Mayar" in frontend if not found!
            try {
              targetBank = await api.entities.BankAccount.create({
                store_id: store.id,
                bank_name: 'Akun Mayar',
                account_number: 'MAYAR-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
                account_name: 'Mayar Auto-Provision',
                balance: 0,
                account_type: 'Savings',
                is_active: true
              });
            } catch (err) {
              console.error('[Tradixa] Failed to auto-provision Mayar bank account in frontend:', err);
              targetBank = bankAccounts[0];
            }
          }

          const newBalance = (targetBank.balance || 0) + viewingTransaction.total;
          await api.entities.BankTransaction.create({
            store_id: store.id,
            bank_account_id: targetBank.id,
            bank_name: targetBank.bank_name,
            transaction_type: 'Credit',
            amount: viewingTransaction.total,
            description: `Pembayaran QRIS ${viewingTransaction.invoice_number} (RRN: ${qrisConfirmRrn.trim()})`,
            reference: viewingTransaction.invoice_number,
            balance_after: newBalance,
            status: 'Cleared',
            sales_transaction_id: viewingTransaction.id,
            payment_proof_url: `RRN: ${qrisConfirmRrn.trim()}`
          });

          // Update bank account balance in DB
          await api.entities.BankAccount.update(targetBank.id, { balance: newBalance });
        }
      }

      // 3. Update linked JournalEntry to Posted
      if (store?.id) {
        const journals = await api.entities.JournalEntry.filter({
          store_id: store.id,
          reference: viewingTransaction.invoice_number
        });
        if (journals?.length > 0) {
          await api.entities.JournalEntry.update(journals[0].id, { status: 'Posted' });
        }
      }

      toast({ title: '✅ Pembayaran QRIS Dikonfirmasi', description: `Invoice ${viewingTransaction.invoice_number} telah lunas.` });

      // Refresh data
      setViewingTransaction(null);
      setQrisConfirmRrn('');
      loadTransactions();
    } catch (err) {
      console.error('[Tradixa] QRIS confirm error:', err);
      toast({ title: 'Gagal Mengonfirmasi', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingQrisConfirm(false);
    }
  };

  const handleArEdcConnection = () => {
    const paymentVal = Number(arPaymentAmount);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      toast({ title: 'Validation Error', description: 'Masukkan nominal pembayaran terlebih dahulu', variant: 'destructive' });
      return;
    }

    setArEdcStatus('connecting');
    setArEdcErrorMessage('');

    const ws = new WebSocket('ws://localhost:9000');
    let hasResponded = false;

    const connectionTimeout = setTimeout(() => {
      if (!hasResponded) {
        ws.close();
        setArEdcStatus('failed');
        setArEdcErrorMessage('Gagal terhubung ke ECR local bridge di localhost:9000. Pastikan service local bridge aktif.');
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      setArEdcStatus('processing');
      ws.send(JSON.stringify({
        command: 'purchase',
        amount: paymentVal,
        reference: `POS-RCV-${Date.now()}`
      }));
    };

    ws.onmessage = (event) => {
      hasResponded = true;
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'success') {
          setArEdcStatus('success');
          setArTraceNumber(data.trace_number || '');
          ws.close();
          toast({ title: 'Koneksi EDC Sukses', description: `Otorisasi berhasil dengan nomor trace: ${data.trace_number || ''}` });
        } else {
          setArEdcStatus('failed');
          setArEdcErrorMessage(data.message || 'Transaksi ditolak oleh mesin EDC.');
          ws.close();
        }
      } catch (err) {
        setArEdcStatus('failed');
        setArEdcErrorMessage('Gagal memproses respon dari mesin EDC.');
        ws.close();
      }
    };

    ws.onerror = () => {
      hasResponded = true;
      clearTimeout(connectionTimeout);
      setArEdcStatus('failed');
      setArEdcErrorMessage('Koneksi WebSocket terputus atau gagal dibuat.');
      ws.close();
    };
  };

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const handleSaveARPayment = async () => {
    const receivable = outstandingReceivables.find(r => r.id === selectedReceivableId);
    if (!receivable) {
      toast({ title: 'Validation Error', description: 'Pilih invoice piutang yang ingin dibayar', variant: 'destructive' });
      return;
    }
    const paymentVal = Number(arPaymentAmount);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      toast({ title: 'Validation Error', description: 'Masukkan nominal pembayaran yang valid', variant: 'destructive' });
      return;
    }
    if (paymentVal > receivable.remaining_amount) {
      toast({ title: 'Validation Error', description: `Nominal pembayaran tidak boleh melebihi sisa piutang (Rp ${formatCurrency(receivable.remaining_amount)})`, variant: 'destructive' });
      return;
    }
    if (arPaymentMethod === 'Bank' && !selectedArBankId) {
      toast({ title: 'Validation Error', description: 'Pilih rekening bank tujuan', variant: 'destructive' });
      return;
    }
    if (arPaymentMethod === 'EDC' && !arTraceNumber.trim()) {
      toast({ title: 'Validation Error', description: 'Masukkan Trace Number EDC terlebih dahulu atau pemicu otomatis via Local Bridge', variant: 'destructive' });
      return;
    }

    setIsSavingARPayment(true);
    try {
      const bank = arBankAccounts.find(b => b.id === selectedArBankId);
      const newPaidAmount = (receivable.paid_amount || 0) + paymentVal;
      const newRemaining = Math.max(0, receivable.amount - newPaidAmount);
      const newStatus = newRemaining <= 0 ? 'Paid' : 'Partial';

      // 1. Update Receivable
      await api.entities.Receivable.update(receivable.id, {
        paid_amount: newPaidAmount,
        remaining_amount: newRemaining,
        status: newStatus,
        payment_bank_name: arPaymentMethod === 'Bank' ? bank?.bank_name : (arPaymentMethod === 'EDC' ? 'EDC / Card' : 'Cash')
      });

      const timestamp = getWIBTimestamp();
      const currentDate = new Date().toISOString().split('T')[0];
      const reference = arPaymentMethod === 'EDC' ? `RCV-PAY-EDC-${arTraceNumber.trim()}` : `RCV-PAY-POS-${Date.now()}`;

      // 2. If Payment is Bank, update Bank Balance & create BankTransaction
      if (arPaymentMethod === 'Bank') {
        const newBalance = (bank?.balance || 0) + paymentVal;
        await api.entities.BankTransaction.create({
          store_id: store.id,
          bank_account_id: selectedArBankId,
          bank_name: bank?.bank_name,
          transaction_type: 'Credit',
          amount: paymentVal,
          description: `Pelunasan Piutang via POS - ${receivable.customer_name} (${receivable.invoice_number})`,
          reference,
          status: 'Approved',
          balance_after: newBalance,
          timestamp_wib: timestamp
        });
        await api.entities.BankAccount.update(selectedArBankId, { balance: newBalance });
      }

      // 3. Create Invoice Payment History
      await api.entities.InvoicePayment.create({
        store_id: store.id,
        invoice_type: 'Receivable',
        invoice_id: receivable.id,
        invoice_number: receivable.invoice_number,
        amount: paymentVal,
        payment_method: arPaymentMethod === 'EDC' ? 'EDC' : arPaymentMethod,
        bank_name: arPaymentMethod === 'Bank' ? bank?.bank_name : (arPaymentMethod === 'EDC' ? 'EDC / Card' : 'Cash'),
        reference,
        payment_date: currentDate,
        timestamp_wib: timestamp
      });

      // 4. Create Jurnal Akuntansi (Double-Entry)
      const journal = await api.entities.JournalEntry.create({
        store_id: store.id,
        transaction_id: reference,
        date: new Date().toISOString(),
        description: `Pelunasan Piutang via POS - ${receivable.customer_name} (${receivable.invoice_number})${arPaymentMethod === 'EDC' ? ` [EDC Trace: ${arTraceNumber.trim()}]` : ''}`,
        type: 'Receipt',
        status: 'Draft',
        total_debit: paymentVal,
        total_credit: paymentVal,
        created_by: 'Kasir POS'
      });

      const coaAccounts = await api.entities.COA.filter({ store_id: store.id });
      const arAccountName = coaAccounts.find(a => a.name.includes('Piutang Usaha'))?.name || 'Piutang Usaha';
      const cashOrBankAccName = arPaymentMethod === 'Bank'
        ? (coaAccounts.find(a => a.name.includes(bank?.bank_name))?.name || `Bank (${bank?.bank_name})`)
        : (arPaymentMethod === 'EDC'
           ? (coaAccounts.find(a => a.name.toLowerCase().includes('edc') || a.name.toLowerCase().includes('bank'))?.name || 'Kas Kantor')
           : (coaAccounts.find(a => a.name.includes('Kas Kantor'))?.name || 'Kas Kantor'));

      await Promise.all([
        api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: cashOrBankAccName,
          description: `Penerimaan Pelunasan Piutang via POS`,
          debit: paymentVal,
          credit: 0
        }),
        api.entities.JournalLine.create({
          journal_id: journal.id,
          account_name: arAccountName,
          description: `Pengurangan Piutang - ${receivable.customer_name}`,
          debit: 0,
          credit: paymentVal
        })
      ]);

      // 5. Update the main sales transaction list payment status if it matches!
      const matchingSalesTx = allTransactions.find(tx => tx.invoice_number === receivable.invoice_number);
      if (matchingSalesTx) {
        await api.entities.SalesTransaction.update(matchingSalesTx.id, {
          paid_amount: newPaidAmount,
          payment_status: newStatus
        });
      }

      toast({ title: 'Pelunasan Berhasil', description: `Pembayaran Rp ${formatCurrency(paymentVal)} berhasil dicatat untuk ${receivable.customer_name}` });
      setShowARPaymentModal(false);
      loadTransactions();
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal Menyimpan Pembayaran', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingARPayment(false);
    }
  };

  useEffect(() => {
    if (store?.id) loadTransactions();
  }, [store]);

  // REALTIME: Auto-update QRIS modal and transactions list when paid
  useEffect(() => {
    if (!viewingQrisTx?.id) return;
    
    const channel = supabase
      .channel(`qris_payment_${viewingQrisTx.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sales_transactions',
        filter: `id=eq.${viewingQrisTx.id}`
      }, (payload) => {
        console.log('[QRIS Realtime] Transaction updated:', payload.new);
        
        if (payload.new && payload.new.payment_status === 'Paid') {
          toast({
            title: "Pembayaran Berhasil!",
            description: `Pembayaran untuk Invoice ${payload.new.invoice_number} sebesar Rp ${new Intl.NumberFormat('id-ID').format(payload.new.total)} telah berhasil diverifikasi otomatis oleh sistem.`,
            variant: "default",
            className: "bg-emerald-600 text-white border-none font-bold"
          });
          
          setViewingQrisTx(null);
          setPrintingInvoice(payload.new);
          loadTransactions();
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingQrisTx?.id]);

  // REALTIME: Auto-update viewing transaction details when updated in DB
  useEffect(() => {
    if (!viewingTransaction?.id) return;
    
    const channel = supabase
      .channel(`tx_detail_${viewingTransaction.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sales_transactions',
        filter: `id=eq.${viewingTransaction.id}`
      }, (payload) => {
        console.log('[Tx Realtime] Detail updated:', payload.new);
        if (payload.new) {
          setViewingTransaction(payload.new);
          loadTransactions();
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingTransaction?.id]);

  const loadTransactions = async () => {
    const data = await api.entities.SalesTransaction.filter({ store_id: store.id }, '-created_date');
    setAllTransactions(data);
    setIsLoading(false);
  };

  // Filter by global selected date
  const transactions = allTransactions.filter(tx => matchesDate(tx, selectedDate));

  // Count current month transactions for Free plan limit
  const currentMonthSales = allTransactions.filter(tx => {
    const txDate = new Date(tx.created_date || tx.timestamp_wib);
    const now = new Date();
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }).length;

  const limits = getEffectiveLimits(store);
  const isLimitReached = limits.maxSalesPerMonth !== Infinity && currentMonthSales >= limits.maxSalesPerMonth;

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  // Check if transaction is from today (WIB)
  const isTransactionToday = (tx) => {
    if (!tx?.timestamp_wib) return false;
    const txDatePart = tx.timestamp_wib.split(' ')[0];
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    const todayStr = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()}`;
    return txDatePart === todayStr;
  };

  const handleVoidTransaction = async () => {
    if (!voidingTransaction || !voidReason.trim()) {
      toast({ title: 'Alasan Wajib', description: 'Silakan isi alasan pembatalan transaksi.', variant: 'destructive' });
      return;
    }
    setIsVoiding(true);
    try {
      const tx = voidingTransaction;
      const storeId = store.id;

      // 1. Update transaction status to Voided
      await api.entities.SalesTransaction.update(tx.id, {
        payment_status: 'Voided',
        void_reason: voidReason.trim(),
        voided_at: new Date().toISOString(),
        voided_by: voidAuthorizer === 'Owner' ? 'Owner / Pemilik Toko' : 'Manager Operasional'
      });

      // 2. Restore stock for each item
      if (tx.items && tx.items.length > 0) {
        for (const item of tx.items) {
          try {
            const products = await api.entities.Product.filter({ store_id: storeId, id: item.product_id });
            if (products?.length > 0) {
              const product = products[0];
              const baseQtyToRestore = item.quantity * (item.qty_per_base || 1);
              const restoredStock = (product.stock || 0) + baseQtyToRestore;
              const status = restoredStock > product.reorder_level ? 'In Stock' : restoredStock > 0 ? 'Low Stock' : 'Out of Stock';
              await api.entities.Product.update(item.product_id, { stock: restoredStock, status });
            }
            // Create reverse stock movement
            await api.entities.StockMovement.create({
              store_id: storeId,
              reference: `VOID-${tx.invoice_number}`,
              product_id: item.product_id,
              product_name: item.product_name,
              movement_type: 'in',
              stock_type: 'Void Reversal',
              quantity: baseQtyToRestore,
              timestamp_wib: getWIBTimestamp()
            });
          } catch (err) {
            console.error(`[Void] Failed to restore stock for ${item.product_name}:`, err);
          }
        }
      }

      // 3. Reverse journal entries
      try {
        const journals = await api.entities.JournalEntry.filter({ store_id: storeId, transaction_id: tx.invoice_number });
        if (journals?.length > 0) {
          const origJournal = journals[0];
          // Create reverse journal
          const reverseJournal = await api.entities.JournalEntry.create({
            store_id: storeId,
            transaction_id: `VOID-${tx.invoice_number}`,
            date: new Date().toLocaleDateString('en-CA'),
            description: `[VOID] Pembatalan Penjualan - ${tx.customer_name} (${tx.invoice_number}) | Alasan: ${voidReason.trim()}`,
            type: 'Void',
            status: 'Voided',
            total_debit: origJournal.total_debit,
            total_credit: origJournal.total_credit,
            created_by: 'Administrator'
          });
          // Get original journal lines and reverse them
          const origLines = await api.entities.JournalLine.filter({ journal_id: origJournal.id });
          for (const line of (origLines || [])) {
            await api.entities.JournalLine.create({
              journal_id: reverseJournal.id,
              account_name: line.account_name,
              description: `[VOID] ${line.description}`,
              debit: line.credit,
              credit: line.debit
            });
          }
          // Mark original journal as voided
          await api.entities.JournalEntry.update(origJournal.id, { status: 'Voided' });
        }
      } catch (err) {
        console.error('[Void] Failed to reverse journal:', err);
      }

      // 4. Reverse bank transaction if applicable
      if (tx.payment_method !== 'Cash' && tx.bank_account_id) {
        try {
          const bankTxs = await api.entities.BankTransaction.filter({ store_id: storeId, sales_transaction_id: tx.id });
          if (bankTxs?.length > 0) {
            const origBankTx = bankTxs[0];
            
            if (origBankTx.status === 'Pending') {
              // Skenario A: Uang belum divalidasi/masuk. Cukup tolak antriannya.
              await api.entities.BankTransaction.update(origBankTx.id, { status: 'Rejected' });
            } else if (origBankTx.status === 'Approved' || origBankTx.status === 'Cleared') {
              // Skenario B: Uang sudah telanjur masuk ke rekening. Harus ditarik kembali (Debit).
              const bankAccounts = await api.entities.BankAccount.filter({ store_id: storeId, id: tx.bank_account_id });
              if (bankAccounts?.length > 0) {
                const bank = bankAccounts[0];
                const newBalance = (bank.balance || 0) - (tx.paid_amount || tx.total);
                await api.entities.BankTransaction.create({
                  store_id: storeId,
                  bank_account_id: tx.bank_account_id,
                  bank_name: bank.bank_name,
                  transaction_type: 'Debit',
                  amount: tx.paid_amount || tx.total,
                  description: `[VOID] Pembatalan ${tx.invoice_number} - ${tx.customer_name}`,
                  reference: `VOID-${tx.invoice_number}`,
                  balance_after: newBalance,
                  status: 'Approved',
                  timestamp_wib: getWIBTimestamp()
                });
                await api.entities.BankAccount.update(tx.bank_account_id, { balance: newBalance });
              }
            }
          }
        } catch (err) {
          console.error('[Void] Failed to reverse bank transaction:', err);
        }
      }

      // 5. Reverse receivable if Piutang
      if (tx.payment_method === 'Piutang / Termin') {
        try {
          const receivables = await api.entities.Receivable.filter({ store_id: storeId, invoice_number: tx.invoice_number });
          if (receivables?.length > 0) {
            await api.entities.Receivable.update(receivables[0].id, { status: 'Voided' });
          }
        } catch (err) {
          console.error('[Void] Failed to void receivable:', err);
        }
      }

      toast({
        title: '✅ Transaksi Dibatalkan',
        description: `Invoice ${tx.invoice_number} berhasil di-void. Stok dan jurnal telah dikembalikan.`
      });

      setVoidingTransaction(null);
      setVoidReason('');
      setVoidAuthorizer('Owner');
      setViewingTransaction(null);
      loadTransactions();
    } catch (err) {
      console.error('[Void] Error:', err);
      toast({ title: 'Gagal Membatalkan', description: err.message, variant: 'destructive' });
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title="Sales Transaction"
        subtitle="Transaksi penjualan harian"
        icon={ShoppingCart}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar 
              title="Laporan Penjualan" 
              date={formattedDate} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-sales" 
              store={store}
            />
            <Button 
              onClick={handleOpenARPayment} 
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-850 dark:text-indigo-400 dark:hover:bg-indigo-950/20 h-11 px-5 font-semibold rounded-xl transition-all"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Pelunasan Piutang
            </Button>
            <Button 
              onClick={() => isLimitReached ? null : setShowForm(true)} 
              className={`${isLimitReached ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'} h-11 px-6 font-semibold rounded-xl transition-all`}
              disabled={isLimitReached}
            >
              <Plus className="w-4 h-4 mr-2" />
              Transaksi Baru
            </Button>
          </div>
        }
      />
      
      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Limit Transaksi Tercapai</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Anda telah mencapai batas {limits.maxSalesPerMonth} transaksi bulan ini untuk paket Anda. 
              Upgrade ke <span className="font-bold">Pro</span> untuk transaksi tanpa batas dan fitur premium lainnya.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/PricingPage'}
            className="border-amber-200 text-amber-700 hover:bg-amber-100 font-bold"
          >
            Upgrade Sekarang
          </Button>
        </div>
      )}

      <PageDatePicker />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-sales">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal (WIB)</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Sales PIC</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, idx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingTransaction(tx)}
                            className="font-bold text-blue-600 dark:text-blue-400 no-underline hover:underline decoration-blue-400 underline-offset-2 transition-colors cursor-pointer"
                          >
                            {tx.invoice_number}
                          </button>
                          {tx.internal_note && (
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Ada catatan internal" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{tx.timestamp_wib}</TableCell>
                      <TableCell>{tx.customer_name}</TableCell>
                      <TableCell className="text-center">{tx.items?.length || 0}</TableCell>
                      <TableCell className="text-right font-medium">Rp {formatCurrency(tx.total)}</TableCell>
                      <TableCell>{tx.sales_pic || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          tx.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          tx.payment_status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          tx.payment_status === 'Voided' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-blue-100 text-blue-700'
                        }>{tx.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {tx.payment_method === 'QRIS' && tx.payment_status === 'Pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingQrisTx(tx)}
                              title="Tampilkan QRIS Barcode"
                              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setViewingTransaction(tx)} title="Lihat Detail">
                            <Eye className="w-4 h-4 text-slate-500" />
                          </Button>
                          {tx.payment_status === 'Pending' && isTransactionToday(tx) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setVoidingTransaction(tx)}
                              title="Batalkan Transaksi (Void)"
                              className="text-red-650 hover:text-red-700 hover:bg-red-50"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
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

      {showForm && (
        <SalesTransactionForm
          open={showForm}
          onClose={() => setShowForm(false)}
          store={store}
          onSuccess={loadTransactions}
        />
      )}

      <Dialog open={!!viewingTransaction && !proofLightbox} onOpenChange={() => setViewingTransaction(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl mx-auto rounded-2xl p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detail Transaksi
              {viewingTransaction && (
                <Badge className={
                  viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700 ml-auto' :
                  viewingTransaction.payment_status === 'Voided' ? 'bg-red-100 text-red-700 ml-auto' :
                  viewingTransaction.payment_status === 'Partial' ? 'bg-blue-100 text-blue-700 ml-auto' :
                  'bg-amber-100 text-amber-700 ml-auto'
                }>{viewingTransaction.payment_status}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-500">Invoice</p><p className="font-medium">{viewingTransaction.invoice_number}</p></div>
                <div><p className="text-sm text-slate-500">Tanggal</p><p className="font-medium">{viewingTransaction.timestamp_wib}</p></div>
                <div><p className="text-sm text-slate-500">Pelanggan</p><p className="font-medium">{viewingTransaction.customer_name}</p></div>
                <div><p className="text-sm text-slate-500">Sales PIC</p><p className="font-medium">{viewingTransaction.sales_pic || '-'}</p></div>
                <div>
                  <p className="text-sm text-slate-500">Lokasi</p>
                  <p className="font-medium">{viewingTransaction.sale_location || '-'}</p>
                  {viewingTransaction.sale_coordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${viewingTransaction.sale_coordinates.replace(/\s/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      📍 {viewingTransaction.sale_coordinates}
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pembayaran</p>
                  <p className="font-medium">{viewingTransaction.payment_method}</p>
                  {viewingTransaction.payment_method === 'QRIS' && viewingTransaction.payment_proof_url && viewingTransaction.payment_proof_url.startsWith('RRN:') && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400 px-2 py-0.5 rounded-md">
                      {viewingTransaction.payment_proof_url}
                    </span>
                  )}
                </div>
              </div>

              {/* Void Info Display */}
              {viewingTransaction.payment_status === 'Voided' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                  <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-lg mt-0.5 shrink-0">
                    <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Transaksi Dibatalkan (Voided)</p>
                    <p className="text-sm text-slate-700 dark:text-slate-350 font-medium">Alasan: {viewingTransaction.void_reason || '-'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-1">
                      Oleh: {viewingTransaction.voided_by || 'Administrator'} | {viewingTransaction.voided_at ? new Date(viewingTransaction.voided_at).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>
                </div>
              )}

              {/* Internal Note */}
              {viewingTransaction.internal_note && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/50">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg mt-0.5 shrink-0">
                    <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Catatan Internal</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{viewingTransaction.internal_note}</p>
                  </div>
                </div>
              )}

              {/* === QRIS Pending Confirmation Section === */}
              {viewingTransaction.payment_method === 'QRIS' && viewingTransaction.payment_status === 'Pending' && (
                <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200 dark:border-violet-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900 rounded-lg">
                      <QrCode className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-violet-900 dark:text-violet-200">Konfirmasi Pembayaran QRIS</p>
                      <p className="text-[10px] text-violet-600 font-medium">Masukkan Nomor Referensi (RRN) dari bukti bayar pelanggan</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={qrisConfirmRrn}
                      onChange={(e) => setQrisConfirmRrn(e.target.value)}
                      placeholder="Masukkan RRN / ID Transaksi..."
                      className="h-10 rounded-lg bg-white dark:bg-slate-800 border-violet-200 dark:border-violet-700 text-sm font-medium"
                    />
                    <Button
                      onClick={handleQrisConfirmFromDetail}
                      disabled={!qrisConfirmRrn.trim() || isSavingQrisConfirm}
                      className="h-10 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg px-5 flex items-center gap-2 whitespace-nowrap"
                    >
                      {isSavingQrisConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Konfirmasi Lunas
                    </Button>
                  </div>
                  {viewingTransaction.payment_proof_url && viewingTransaction.payment_proof_url.startsWith('RRN:') && (
                    <p className="text-xs text-violet-500">RRN sebelumnya: {viewingTransaction.payment_proof_url}</p>
                  )}
                </div>
              )}

              {/* === AR / Piutang Section === */}
              {viewingTransaction.payment_method === 'Piutang / Termin' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Informasi Piutang (AR)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uang Muka (DP)</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        Rp {formatCurrency(viewingTransaction.paid_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sisa Piutang</p>
                      <p className="text-lg font-black text-red-600 dark:text-red-400">
                        Rp {formatCurrency((viewingTransaction.total || 0) - (viewingTransaction.paid_amount || 0))}
                      </p>
                    </div>
                    {linkedAR?.due_date && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CalendarClock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Jatuh Tempo</p>
                          <p className="font-bold">{linkedAR.due_date}</p>
                        </div>
                      </div>
                    )}
                    {linkedAR?.invoice_number && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">No. AR</p>
                          <p className="font-bold text-sm">{linkedAR.invoice_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {linkedAR?.notes && linkedAR.notes.includes('No HP:') && (
                    <div className="flex items-center gap-2 text-sm pt-1 border-t border-blue-100 dark:border-blue-800">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {linkedAR.notes.split('No HP:')[1]?.trim() || '-'}
                      </span>
                    </div>
                  )}
                  {/* Bukti Transfer DP */}
                  {viewingTransaction.payment_proof_url && (
                    <div className="pt-2 border-t border-blue-100 dark:border-blue-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bukti Transfer DP</p>
                      <button onClick={() => setProofLightbox(viewingTransaction.payment_proof_url)} className="w-full relative group">
                        <img
                          src={viewingTransaction.payment_proof_url}
                          alt="Bukti Transfer DP"
                          className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bukti Transfer (Non-Piutang, Bank/Transfer/Debit/Credit) */}
              {(((viewingTransaction.payment_method === 'Transfer' || 
                 viewingTransaction.payment_method === 'Credit Card' || 
                 viewingTransaction.payment_method === 'Debit Card') && viewingTransaction.payment_proof_url) || 
                (viewingTransaction.payment_proof_url && viewingTransaction.payment_proof_url.includes('mayar'))) && (
                <>
                  {viewingTransaction.payment_status === 'Pending' && 
                   viewingTransaction.payment_proof_url && 
                   (viewingTransaction.payment_method === 'Transfer' || 
                    viewingTransaction.payment_method === 'Credit Card' || 
                    viewingTransaction.payment_method === 'Debit Card') && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg">
                            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Menunggu Approval</p>
                            <p className="text-[10px] text-amber-600 font-medium">Menunggu klarifikasi & approval di Bank Transaction</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const payUrl = viewingTransaction.payment_link 
                              || (viewingTransaction.payment_proof_url?.includes('mayar') ? viewingTransaction.payment_proof_url : null);
                            if (payUrl) {
                              window.open(payUrl, '_blank');
                            } else {
                              setProofLightbox(viewingTransaction.payment_proof_url);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 rounded-lg text-xs flex items-center gap-2"
                        >
                          {viewingTransaction.payment_link || viewingTransaction.payment_proof_url?.includes('mayar') 
                            ? <>Lanjutkan Pembayaran <ArrowRight className="w-3.5 h-3.5" /></>
                            : <>Lihat Bukti <ZoomIn className="w-3.5 h-3.5" /></>
                          }
                        </Button>
                      </div>
                    </div>
                  )}

                  {viewingTransaction.payment_proof_url.includes('mayar') ? (
                    <div className={`p-4 rounded-xl border space-y-2 ${viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${viewingTransaction.payment_status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>Status Pembayaran Sistem</p>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-400'}`}>
                          {viewingTransaction.payment_status === 'Paid' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${viewingTransaction.payment_status === 'Paid' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
                            {viewingTransaction.payment_status === 'Paid' ? 'Diverifikasi oleh Mayar' : 'Menunggu Approval / Klarifikasi'}
                          </p>
                          {viewingTransaction.payment_status !== 'Paid' && (
                            <a href={viewingTransaction.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs hover:underline text-amber-600 dark:text-amber-400 font-bold mt-1 inline-block">
                              Buka Link Pembayaran
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    (viewingTransaction.payment_method === 'Transfer' || 
                     viewingTransaction.payment_method === 'Credit Card' || 
                     viewingTransaction.payment_method === 'Debit Card') && 
                    !viewingTransaction.payment_proof_url.startsWith('RRN:') && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bukti Pembayaran</p>
                        <button onClick={() => setProofLightbox(viewingTransaction.payment_proof_url)} className="w-full relative group">
                          <img
                            src={viewingTransaction.payment_proof_url}
                            alt="Bukti Pembayaran"
                            className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                            </div>
                          </div>
                        </button>
                      </div>
                    )
                  )}
                </>
              )}

              <div className="border rounded-lg overflow-x-auto max-w-[85vw] sm:max-w-none w-full">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingTransaction.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold">{item.quantity} {item.uom || 'Pcs'}</span>
                          {item.qty_per_base && item.qty_per_base > 1 && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              ({item.quantity * item.qty_per_base} Pcs)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {formatCurrency(viewingTransaction.subtotal)}</span></div>
                {viewingTransaction.discount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Diskon</span><span>-Rp {formatCurrency(viewingTransaction.discount)}</span></div>
                )}
                {viewingTransaction.tax_amount > 0 && (
                  <div className="flex justify-between"><span>PPN ({viewingTransaction.tax_percentage}%)</span><span>Rp {formatCurrency(viewingTransaction.tax_amount)}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span><span>Rp {formatCurrency(viewingTransaction.total)}</span>
                </div>

                {/* Payment Breakdown for Piutang */}
                {viewingTransaction.payment_method === 'Piutang / Termin' && (
                  <div className="flex justify-between text-sm font-bold text-blue-600 dark:text-blue-400">
                    <span>Dibayar (DP)</span><span>Rp {formatCurrency(viewingTransaction.paid_amount || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-600">
                  <span>Keuntungan</span><span>Rp {formatCurrency(viewingTransaction.profit)}</span>
                </div>

                {/* HPP / COGS */}
                {viewingTransaction.items && (
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>HPP (Harga Pokok)</span>
                    <span>Rp {formatCurrency(viewingTransaction.items.reduce((sum, i) => sum + ((i.buy_price || 0) * i.quantity), 0))}</span>
                  </div>
                )}

                 {/* Detail Dialog Void Action */}
                 {viewingTransaction.payment_status === 'Pending' && isTransactionToday(viewingTransaction) && (
                   <div className="flex justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                     <Button
                       onClick={() => setVoidingTransaction(viewingTransaction)}
                       className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-1.5"
                     >
                       <Ban className="w-4 h-4" /> Batalkan Transaksi (Void)
                     </Button>
                   </div>
                 )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Tampilan QRIS (Gambar 3) */}
      <Dialog open={!!viewingQrisTx} onOpenChange={() => setViewingQrisTx(null)}>
        <DialogContent hideFullscreen hideClose className="max-w-md rounded-2xl p-6 border-none bg-slate-950 text-white flex flex-col items-center text-center">
          <DialogHeader className="w-full flex flex-col items-center sm:pr-0 sm:text-center">
            <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
              <QrCode className="w-8 h-8 text-amber-500" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-full mb-3">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Menunggu Pembayaran</span>
            </div>
            <DialogTitle className="text-lg font-black text-white">Scan QRIS untuk Membayar</DialogTitle>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Minta pelanggan scan QRIS di bawah untuk membayar sebesar <strong className="text-blue-400 text-sm">Rp {viewingQrisTx ? formatCurrency(viewingQrisTx.total) : '0'}</strong>.
            </p>
          </DialogHeader>

          {viewingQrisTx && (
            <div className="my-6 p-5 bg-white rounded-2xl shadow-xl w-64 h-64 flex flex-col justify-center items-center">
              {(() => {
                // 1. Check if the transaction's payment_proof_url is a direct QRIS image URL (ends with image extension or contains qrcode/qris/mayar image API)
                const isDirectImage = viewingQrisTx.payment_proof_url && 
                                      viewingQrisTx.payment_proof_url.startsWith('http') && 
                                      (viewingQrisTx.payment_proof_url.match(/\.(png|jpg|jpeg|webp|gif)($|\?)/i) || 
                                       viewingQrisTx.payment_proof_url.includes('qrcode') || 
                                       viewingQrisTx.payment_proof_url.includes('qris'));
                
                // 2. If it is a direct image URL (e.g. dynamic Mayar QRIS image), render it directly!
                if (isDirectImage) {
                  return (
                    <img
                      src={viewingQrisTx.payment_proof_url}
                      alt="Dynamic QRIS Mayar"
                      className="w-52 h-52 object-contain"
                    />
                  );
                }

                // 3. Fallback: If the store has a configured static GPN QRIS (and it's a real QR Code image, not a mock receipt photo)
                const hasValidStaticQris = store?.qris_static_url && 
                                           store.qris_static_url.startsWith('http') && 
                                           !store.qris_static_url.includes('WhatsApp-Image-2026-05-04-at-21.31.40'); // exclude the mock receipt photo!
                
                if (hasValidStaticQris) {
                  return (
                    <img
                      src={store.qris_static_url}
                      alt="Static QRIS Toko"
                      className="w-52 h-52 object-contain"
                    />
                  );
                }
                
                // 4. Otherwise, generate a clean QR Code of the payment link or fallback dynamic transaction details
                const isDynamicLink = viewingQrisTx.payment_proof_url && 
                                      viewingQrisTx.payment_proof_url.startsWith('http') && 
                                      !viewingQrisTx.payment_proof_url.includes('assets.tradixasystems.com');
                
                const qrCodeData = isDynamicLink 
                  ? viewingQrisTx.payment_proof_url 
                  : `https://retail.tradixasystems.com/pay?invoice=${viewingQrisTx.invoice_number}&amount=${viewingQrisTx.total}&store=${encodeURIComponent(store?.store_name || '')}`;
                
                return (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}`}
                    alt="QRIS Pembayaran"
                    className="w-52 h-52 object-contain"
                  />
                );
              })()}
            </div>
          )}

          <p className="text-[10px] text-slate-500 leading-normal max-w-xs mb-4 font-medium">
            {viewingQrisTx && viewingQrisTx.payment_proof_url && viewingQrisTx.payment_proof_url.startsWith('http') && !viewingQrisTx.payment_proof_url.includes('assets.tradixasystems.com')
              ? 'Scan dengan Kamera HP untuk membuka halaman pembayaran digital, atau scan QRIS dengan e-wallet.'
              : 'QRIS resmi toko Anda. Silakan verifikasi RRN setelah pelanggan berhasil mentransfer.'}
          </p>

          <div className="w-full flex gap-3">
            {viewingQrisTx && viewingQrisTx.payment_proof_url && viewingQrisTx.payment_proof_url.includes('mayar') && (
              <Button
                onClick={() => window.open(viewingQrisTx.payment_proof_url, '_blank')}
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border-none"
              >
                <ArrowRight className="w-4 h-4" /> Buka Link
              </Button>
            )}
            <Button
              onClick={() => setViewingQrisTx(null)}
              className="flex-1 h-11 bg-transparent border border-slate-800 text-white hover:bg-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    {/* === Dialog Pelunasan Piutang POS === */}
    <Dialog open={showARPaymentModal} onOpenChange={setShowARPaymentModal}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xl">
            <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Pelunasan Piutang Pelanggan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* 1. Select Customer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350 pl-0.5">Pilih Pelanggan</Label>
            <Select value={selectedArCustomerId} onValueChange={setSelectedArCustomerId}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-medium text-slate-800 dark:text-slate-200">
                <SelectValue placeholder="Cari & pilih nama pelanggan..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                {arCustomers.map(c => (
                  <SelectItem key={c.id} value={c.id} className="font-medium rounded-lg">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedArCustomerId && (
            <>
              {outstandingReceivables.length === 0 ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-xs font-bold text-center">
                  🎉 Pelanggan ini tidak memiliki piutang aktif (Lunas).
                </div>
              ) : (
                <>
                  {/* 2. Select Invoice */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350 pl-0.5">Invoice Piutang Aktif</Label>
                    <Select value={selectedReceivableId} onValueChange={(val) => {
                      setSelectedReceivableId(val);
                      const selected = outstandingReceivables.find(r => r.id === val);
                      if (selected) setArPaymentAmount(selected.remaining_amount || 0);
                    }}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-medium text-slate-800 dark:text-slate-200">
                        <SelectValue placeholder="Pilih nomor invoice..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                        {outstandingReceivables.map(r => (
                          <SelectItem key={r.id} value={r.id} className="font-medium rounded-lg">
                            {r.invoice_number} ({r.timestamp_wib.split(' ')[0]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Info Card */}
                  {selectedReceivableId && (() => {
                    const activeReceivable = outstandingReceivables.find(r => r.id === selectedReceivableId);
                    if (!activeReceivable) return null;
                    return (
                      <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Invoice</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">Rp {formatCurrency(activeReceivable.amount)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sisa Piutang</p>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">Rp {formatCurrency(activeReceivable.remaining_amount)}</p>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold pl-1">
                          <CalendarClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          Jatuh Tempo: <span className="text-slate-700 dark:text-slate-200">{activeReceivable.due_date}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Input Nominal */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350 pl-0.5">Nominal Bayar / Cicilan (Rp) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 dark:text-slate-400 text-sm">Rp</span>
                      <Input
                        type="number"
                        value={arPaymentAmount}
                        onChange={(e) => setArPaymentAmount(e.target.value)}
                        placeholder="Contoh: 50000"
                        className="h-11 pl-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100 text-sm shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* 4. Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350 pl-0.5">Metode Pembayaran</Label>
                    <Select value={arPaymentMethod} onValueChange={setArPaymentMethod}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-medium text-slate-800 dark:text-slate-200">
                        <SelectValue placeholder="Pilih metode bayar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                        <SelectItem value="Cash" className="font-medium rounded-lg">Tunai / Cash</SelectItem>
                        <SelectItem value="Bank" className="font-medium rounded-lg">Transfer Bank</SelectItem>
                        <SelectItem value="EDC" className="font-medium rounded-lg">Debit / Kredit (EDC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bank accounts dropdown */}
                  {arPaymentMethod === 'Bank' && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350 pl-0.5">Rekening Bank Tujuan</Label>
                      <Select value={selectedArBankId} onValueChange={setSelectedArBankId}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-medium text-slate-800 dark:text-slate-200">
                          <SelectValue placeholder="Pilih rekening bank..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                          {arBankAccounts.map(b => (
                            <SelectItem key={b.id} value={b.id} className="font-medium rounded-lg">
                              {b.bank_name} - {b.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* EDC Trace Number / ERC Websocket Integration */}
                  {arPaymentMethod === 'EDC' && (
                    <div className="space-y-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center mb-1 pl-0.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Trace Number (EDC) <span className="text-red-500">*</span></Label>
                        <span className="text-[10px] font-bold text-slate-400">Integrasi ERC</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={arTraceNumber}
                          onChange={(e) => setArTraceNumber(e.target.value)}
                          placeholder="Contoh: 123456"
                          className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm font-medium shadow-sm flex-1"
                          required
                        />
                        <Button
                          type="button"
                          onClick={handleArEdcConnection}
                          disabled={arEdcStatus === 'connecting' || arEdcStatus === 'processing'}
                          className="h-11 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 shrink-0"
                        >
                          {(arEdcStatus === 'connecting' || arEdcStatus === 'processing') ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Proses...
                            </>
                          ) : (
                            'Hubungkan EDC'
                          )}
                        </Button>
                      </div>

                      {arEdcStatus === 'failed' && arEdcErrorMessage && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-semibold leading-relaxed border border-red-100 dark:border-red-900/50">
                          ⚠️ {arEdcErrorMessage}
                        </div>
                      )}
                      {arEdcStatus === 'success' && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350 rounded-xl text-[11px] font-semibold border border-emerald-100 dark:border-emerald-900/50">
                          ✅ Transaksi EDC Sukses! Otorisasi Berhasil.
                        </div>
                      )}
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium pl-0.5 leading-relaxed">
                        Transaksi akan dipicu via WebSocket lokal (ws://localhost:9000). Pastikan aplikasi Bridge aktif.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-6 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowARPaymentModal(false)}
            className="rounded-xl h-11 font-bold text-slate-500 dark:text-slate-400"
          >
            Batal
          </Button>
          {selectedArCustomerId && outstandingReceivables.length > 0 && (
            <Button
              onClick={handleSaveARPayment}
              disabled={isSavingARPayment}
              className="rounded-xl h-11 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
            >
              {isSavingARPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Pelunasan'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* === Lightbox Modal untuk Bukti Transfer === */}
    <Dialog open={!!proofLightbox} onOpenChange={(open) => {
      if (!open) {
        setProofLightbox(null);
      }
    }}>
      <DialogContent hideClose hideFullscreen className="max-w-4xl p-0 bg-transparent border-none shadow-none">
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setProofLightbox(null)}
            className="absolute -top-3 -right-3 z-50 w-9 h-9 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          {proofLightbox && (
            <img
              src={proofLightbox}
              alt="Bukti Transfer"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white dark:bg-slate-900"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* === Dialog Void / Cancel Transaksi === */}
    <Dialog open={!!voidingTransaction} onOpenChange={(open) => { if (!open) { setVoidingTransaction(null); setVoidReason(''); setVoidAuthorizer('Owner'); } }}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xl">
            <Ban className="w-5 h-5" />
            Batalkan Transaksi (Void)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-900/30 text-xs leading-relaxed font-medium">
            ⚠️ <b>Peringatan:</b> Tindakan ini akan membatalkan transaksi <b>{voidingTransaction?.invoice_number}</b> secara permanen. Stok produk akan dikembalikan, dan jurnal akuntansi akan dibalik secara otomatis.
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Alasan Pembatalan <span className="text-red-500">*</span></Label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Contoh: Salah input produk / Pelanggan membatalkan pesanan..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm font-medium resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all placeholder:text-slate-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Diotorisasi Oleh (Owner / Manager) <span className="text-red-500">*</span></Label>
            <Select value={voidAuthorizer} onValueChange={setVoidAuthorizer}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 font-medium text-slate-800 dark:text-slate-200">
                <SelectValue placeholder="Pilih otorisasi..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                <SelectItem value="Owner" className="font-medium rounded-lg">Owner / Pemilik Toko</SelectItem>
                <SelectItem value="Manager" className="font-medium rounded-lg">Manager Operasional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-6 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setVoidingTransaction(null);
              setVoidReason('');
            }}
            className="rounded-xl h-11 font-bold text-slate-500 dark:text-slate-400"
            disabled={isVoiding}
          >
            Batal
          </Button>
          <Button
            onClick={handleVoidTransaction}
            disabled={!voidReason.trim() || isVoiding}
            className="rounded-xl h-11 px-6 font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            {isVoiding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses Void...
              </>
            ) : (
              'Batalkan Transaksi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {printingInvoice && (
      <PrintInvoice
        invoice={printingInvoice}
        store={store}
        onClose={() => setPrintingInvoice(null)}
        forceThermal={true}
      />
    )}
    </>
  );
}
