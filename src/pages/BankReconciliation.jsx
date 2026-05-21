import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileCheck, 
  RefreshCw, 
  ArrowLeftRight, 
  Loader2, 
  FileSpreadsheet, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Info,
  HelpCircle,
  ArchiveRestore,
  Sparkles,
  Printer,
  FileText
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { getEffectiveLimits } from '@/planConfig';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function BankReconciliation({ store }) {
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [systemTransactions, setSystemTransactions] = useState([]);
  const [bankMutations, setBankMutations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  const [statementHistory, setStatementHistory] = useState([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const loadStatementHistory = async (autoLoadLatest = false) => {
    try {
      const data = await api.entities.BankStatementHistory.filter({ store_id: store.id }, '-created_at');
      setStatementHistory(data);
      if (autoLoadLatest && data.length > 0 && bankMutations.length === 0) {
        setBankMutations(data[0].parsed_data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (store?.id) {
      loadBankAccounts();
      loadStatementHistory(true);
    }
  }, [store]);

  const loadBankAccounts = async () => {
    const data = await api.entities.BankAccount.filter({ store_id: store.id });
    setBankAccounts(data);
    if (data.length > 0) setSelectedBankId(data[0].id);
  };

  const loadSystemTransactions = async () => {
    if (!selectedBankId) return;
    setIsLoading(true);
    try {
      const data = await api.entities.BankTransaction.filter({ 
        bank_account_id: selectedBankId,
        status: 'Approved'
      });
      setSystemTransactions(data.filter(t => !t.is_reconciled));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemTransactions();
  }, [selectedBankId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const limits = getEffectiveLimits(store);
    if (statementHistory.length >= limits.maxReconciliationUploads) {
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-sm">Batas Upload Mutasi Tercapai (Max {limits.maxReconciliationUploads})</span>
          <span className="text-xs">Anda telah mencapai batas maksimal upload file mutasi (seumur hidup) untuk paket gratis. Silakan upgrade ke paket Pro untuk upload tanpa batas.</span>
        </div>,
        { duration: 5000 }
      );
      e.target.value = '';
      return;
    }

    const isTrial = store?.plan === 'pro' && store?.has_used_trial;
    const isPremium = ((store?.plan === 'pro' && !store?.has_used_trial) || store?.plan === 'premium' || store?.plan === 'enterprise') || user?.email === 'dev@tradixa.com';
    const checkOcrPermission = () => {
      if (!isPremium) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">{isTrial ? 'Fitur Trial Terbatas' : 'Upgrade Paket'}</span>
            <span className="text-xs">{isTrial ? 'Smart AI OCR tidak tersedia di masa trial. Hanya PDF Digital Parsing yang didukung. Upgrade paket untuk menggunakan Smart AI OCR.' : 'Fitur Smart AI OCR (Otomatis baca mutasi dari gambar/PDF) memerlukan paket langganan premium.'}</span>
          </div>,
          { duration: 5000 }
        );
        setIsProcessing(false);
        return false;
      }
      return true;
    };

    setIsProcessing(true);
    setProcessingMessage('Sedang Memproses File...');

    const parseBankStatementText = (text) => {
      const mutations = [];
      // Pass 1: Traditional format (DD/MM ... Amount DB/CR)
      const dateRegex = /(\d{2}[\/|-]\d{2})/g;
      const parts = text.split(dateRegex);
      for (let i = 1; i < parts.length; i += 2) {
        const date = parts[i];
        const content = parts[i+1] || '';
        const allMatches = [...content.matchAll(/([\d\.,]+)\s+(DB|CR|DR|D|K)\b/gi)];
        if (allMatches.length > 0) {
          allMatches.forEach((m) => {
            const amountStr = m[1];
            const rawType = m[2].toUpperCase();
            const isDebit = ['DB', 'DR', 'D'].includes(rawType);
            const isCredit = ['CR', 'K'].includes(rawType);
            const clean = (s) => {
              if(!s) return '0';
              let cleaned = s.replace(/[^\d\.,+-]/g, '');
              if (/,(\d{3})$/.test(cleaned) && !cleaned.includes('.')) {
                cleaned = cleaned.replace(/,/g, '');
              }
              const hasComma = cleaned.includes(',');
              const hasDot = cleaned.includes('.');
              if (hasComma && hasDot) {
                 if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) return cleaned.replace(/,/g, '');
                 return cleaned.replace(/\./g, '').replace(/,/g, '.');
              }
              if (hasComma) return cleaned.replace(/,/g, '.');
              if (hasDot) return cleaned.replace(/\./g, '');
              return cleaned;
            };
            const amount = parseFloat(clean(amountStr));
            const afterMatch = content.substring(m.index + m[0].length).match(/([\d\.,]+)/);
            const balance = afterMatch ? parseFloat(clean(afterMatch[1])) : 0;
            if (!isNaN(amount) && amount > 0) {
              mutations.push({
                date: date,
                description: content.substring(0, m.index).trim().substring(0, 200),
                reference: '-',
                debit: isDebit ? amount : 0,
                credit: isCredit ? amount : 0,
                balance: balance,
                status: 'unmatched'
              });
            }
          });
        }
      }

      // Pass 2: Modern E-Wallet/Digital Bank Format (e.g. Bank Jago)
      // Since OCR might scatter text across lines, we use a State Machine.
      if (mutations.length === 0) {
        let currentDate = '';
        let currentDesc = '';
        
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Helper to clean Indonesian currency formats correctly
          const clean = (s) => {
             if(!s) return '0';
             let cleaned = s.replace(/[^\d\.,+-]/g, '');
             if (/,(\d{3})$/.test(cleaned) && !cleaned.includes('.')) {
                cleaned = cleaned.replace(/,/g, '');
             }
             const hasComma = cleaned.includes(',');
             const hasDot = cleaned.includes('.');
             
             if (hasComma && hasDot) {
                 if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) return cleaned.replace(/,/g, '');
                 return cleaned.replace(/\./g, '').replace(/,/g, '.');
             } else if (hasComma) {
                 return cleaned.replace(/,/g, '.');
             } else if (hasDot) {
                 return cleaned.replace(/\./g, '');
             }
             return cleaned;
          };

          // 1. Inline Match (Everything on one line)
          const inlineMatch = line.match(/(\d{1,2}\s+[a-zA-Z]{3,4}\s+\d{4}).*?([+-]\s?[\d\.,]+)\s+([\d\.,]+)?/i);
          if (inlineMatch && !currentDate) {
             const amt = parseFloat(clean(inlineMatch[2]));
             if (!isNaN(amt) && amt !== 0) {
               mutations.push({
                 date: inlineMatch[1],
                 description: line.replace(inlineMatch[0], '').trim() || 'Mutasi Digital',
                 reference: '-',
                 debit: amt < 0 ? Math.abs(amt) : 0,
                 credit: amt > 0 ? amt : 0,
                 balance: parseFloat(clean(inlineMatch[3])),
                 status: 'unmatched'
               });
             }
             continue;
          }

          // 2. Multi-line Match (State Machine)
          const dateMatch = line.match(/^(\d{1,2}\s+[a-zA-Z]{3,4}\s+\d{4})/i);
          if (dateMatch) {
            currentDate = dateMatch[1];
            currentDesc = ''; // reset
            continue;
          }

          // If we have an active date, look for amount
          // Allows format: "[text] +56.000,00 [58.023]"
          const amountMatch = line.match(/(?:^|\s)([+-])\s?([\d\.,]+)(?:\s+([\d\.,]+))?$/);
          if (amountMatch && currentDate) {
            const sign = amountMatch[1];
            const amountStr = amountMatch[2];
            let balanceStr = amountMatch[3]; // Balance might be on the same line
            
            const amountVal = parseFloat(clean(amountStr));
            let finalAmount = sign === '-' ? -amountVal : amountVal;
            
            let balance = balanceStr ? parseFloat(clean(balanceStr)) : 0;
            
            // If balance wasn't on the same line, check the NEXT line
            if (!balanceStr && i + 1 < lines.length) {
              const nextLine = lines[i+1].trim();
              if (nextLine.match(/^[\d\.,]+$/) && !nextLine.match(/^[+-]/)) {
                balance = parseFloat(clean(nextLine));
                i++; // skip balance line
              }
            }

            // Extract any leading text on the amount line to add to description
            const leadingText = line.replace(amountMatch[0], '').trim();
            if (leadingText) currentDesc += ' ' + leadingText;

            if (!isNaN(finalAmount) && finalAmount !== 0) {
               mutations.push({
                 date: currentDate,
                 description: (currentDesc.trim() || 'Mutasi Digital').substring(0, 200),
                 reference: '-',
                 debit: finalAmount < 0 ? Math.abs(finalAmount) : 0,
                 credit: finalAmount > 0 ? finalAmount : 0,
                 balance: balance,
                 status: 'unmatched'
               });
            }
            // Reset for next transaction
            currentDate = '';
            currentDesc = '';
          } else if (currentDate) {
             // Accumulate description, skip time
             if (!line.match(/^\d{2}:\d{2}$/)) {
                currentDesc += ' ' + line;
             }
          }
        }
      }

      return mutations;
    };

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const normalized = data.map(row => ({
            date: row.Date || row.Tanggal || row['Transaction Date'] || '',
            description: row.Description || row.Keterangan || row.Memo || '',
            reference: row.Reference || row.Ref || '-',
            debit: row.Debit || (row.Type === 'Debit' ? row.Amount : 0) || 0,
            credit: row.Credit || (row.Type === 'Credit' ? row.Amount : 0) || 0,
            status: 'unmatched'
          }));
          setBankMutations(normalized);
          saveStatementHistory(file.name, 'Excel/CSV', normalized);
          toast.success(`${normalized.length} transaksi berhasil dimuat`);
          setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ');
        }

        let mutations = parseBankStatementText(fullText);

        if (mutations.length > 0) {
          setBankMutations(mutations);
          saveStatementHistory(file.name, 'PDF (Digital)', mutations);
          toast.success(`${mutations.length} transaksi dimuat dari PDF Digital`);
          setIsProcessing(false);
        } else {
          // Fallback to OCR if digital parsing fails
          if (!checkOcrPermission()) return;
          setProcessingMessage('Teks Digital tidak terbaca. Beralih ke Smart AI OCR...');

          let combinedOcrText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            setProcessingMessage(`Ekstrak Halaman ${i}/${pdf.numPages} via Smart AI...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            const { data: visionData, error: visionError } = await supabase.functions.invoke('app-bridge', {
              body: {
                action: 'analyze-vision',
                payload: {
                  requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }]
                }
              }
            });
            if (visionError) throw visionError;
            if (visionData?.error) throw new Error("Gagal menganalisis gambar. Layanan AI sedang tidak tersedia.");
            if (!visionData?.responses) throw new Error('Sistem AI tidak mengembalikan data. Silakan coba lagi nanti.');
            combinedOcrText += (visionData.responses[0]?.fullTextAnnotation?.text || '') + '\n';
          }
          
          mutations = parseBankStatementText(combinedOcrText);
          setBankMutations(mutations);
          saveStatementHistory(file.name, 'PDF (OCR)', mutations);
          toast.success(`${mutations.length} transaksi dimuat via Smart AI PDF`);
          setIsProcessing(false);
        }
      } else if (file.name.match(/\.(png|jpe?g)$/i)) {
        if (!checkOcrPermission()) return;
        setProcessingMessage('Menganalisis Gambar dengan Smart AI OCR...');
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Image = reader.result.split(',')[1];
            const { data: visionData, error: visionError } = await supabase.functions.invoke('app-bridge', {
              body: {
                action: 'analyze-vision',
                payload: {
                  requests: [{ image: { content: base64Image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }]
                }
              }
            });
            if (visionError) throw visionError;
            if (visionData?.error) throw new Error("Gagal menganalisis gambar. Layanan AI sedang tidak tersedia.");
            if (!visionData?.responses) throw new Error('Sistem AI tidak mengembalikan data. Silakan coba lagi nanti.');
            const text = visionData.responses[0]?.fullTextAnnotation?.text || '';
            const mutations = parseBankStatementText(text);
            
            setBankMutations(mutations);
            saveStatementHistory(file.name, 'Image (OCR)', mutations);
            toast.success(`${mutations.length} transaksi dimuat via Smart AI Gambar`);
            setIsProcessing(false);
          } catch(err) {
            toast.error("Gagal Smart AI OCR: " + err.message);
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      toast.error("Gagal memproses file: " + err.message);
      setIsProcessing(false);
    } finally {
      // Wajib mereset value input agar user bisa mengupload file yang SAMA jika sebelumnya gagal
      e.target.value = '';
    }
  };

  const saveStatementHistory = async (fileName, fileType, mutations) => {
    try {
      const { error } = await supabase.from('bank_statement_history').insert({
        store_id: store.id,
        file_name: fileName,
        file_type: fileType,
        total_transactions: mutations.length,
        parsed_data: mutations
      });
      if (error) throw error;
      loadStatementHistory();
    } catch (err) {
      console.error("Gagal menyimpan history", err);
    }
  };

  const parseDateForMatch = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split(/[\/-]/);
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = new Date().getFullYear();
      if (parts.length === 3) {
        year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
      }
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const runAutoMatch = () => {
    if (bankMutations.length === 0 || systemTransactions.length === 0) return;
    setIsProcessing(true);
    setProcessingMessage('Mencocokkan Data...');
    
    const newMutations = [...bankMutations];
    const newSystem = [...systemTransactions];

    newMutations.forEach(mut => {
      const amount = mut.debit > 0 ? mut.debit : mut.credit;
      const type = mut.debit > 0 ? 'Debit' : 'Credit';
      const mutDate = parseDateForMatch(mut.date);
      
      const match = newSystem.find(sys => {
        if (Math.abs(sys.amount) !== Math.abs(amount) || sys.transaction_type !== type || sys.matched) return false;
        
        if (mutDate) {
           const sysDateStr = sys.timestamp_wib ? sys.timestamp_wib.split(' ')[0] : (sys.created_date || '');
           const sysDate = parseDateForMatch(sysDateStr);
           if (sysDate) {
             const diffTime = Math.abs(mutDate - sysDate);
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             if (diffDays > 3) return false;
           }
        }
        return true;
      });

      if (match) {
        mut.status = 'matched';
        mut.matchId = match.id;
        match.matched = true;
      }
    });

    setBankMutations(newMutations);
    setSystemTransactions(newSystem);
    setIsProcessing(false);
    toast.success("Proses matching selesai!");
  };

  const confirmReconcile = async () => {
    const toUpdate = systemTransactions.filter(s => s.matched);
    if (toUpdate.length === 0) return;

    setIsProcessing(true);
    try {
      await Promise.all(toUpdate.map(s => 
        api.entities.BankTransaction.update(s.id, { is_reconciled: true, reconciled_at: new Date().toISOString() })
      ));
      toast.success("Rekonsiliasi berhasil disimpan!");
      setBankMutations([]);
      loadSystemTransactions();
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val) => val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/60 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="font-bold text-slate-800">{processingMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title="Bank Reconciliation"
        subtitle="Verifikasi kebenaran transaksi bank dengan catatan internal sistem."
        icon={FileCheck}
        children={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" /> Alur Kerja Rekonsiliasi
                </DialogTitle>
                <DialogDescription className="pt-4 space-y-4 text-left">
                  <div className="flex gap-3">
                    <div className="bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Upload Statement:</span> Unggah file PDF/Excel/Gambar(JPG/PNG) mutasi asli dari Bank (BCA, Mandiri, BRI, dll).</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-blue-100 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-blue-600"><Sparkles className="w-3 h-3" /></div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Smart AI OCR:</span> Jika menggunakan file PDF/Gambar, fitur premium AI OCR akan mengekstrak data mutasi Anda secara otomatis dan cerdas.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Parsing Heuristik:</span> Sistem mengekstrak Tanggal, Nominal, dan memisahkan Saldo secara otomatis.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Auto-Matching:</span> Klik "Run Auto-Match" untuk mencocokkan data bank dengan transaksi internal yang sudah Anda <span className="text-blue-600 font-bold underline">Approve</span> sebelumnya.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-slate-100 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Final Audit:</span> Baris hijau berarti sinkron. Klik "Confirm Reconcile" untuk memfinalisasi audit.</p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        }
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Export PDF & Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Bank Reconciliation Report', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-bank-reconciliation')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Bank Reconciliation Report', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-bank-reconciliation')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Bank Reconciliation Report', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-bank-reconciliation')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
            
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger className="w-64 h-11 rounded-xl">
                <SelectValue placeholder="Pilih Rekening..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl bg-white border-slate-200 hover:bg-slate-50">
                  <ArchiveRestore className="w-4 h-4 mr-2 text-slate-500" /> Riwayat
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Riwayat Upload Statement
                  </DialogTitle>
                  <DialogDescription>Muat kembali data mutasi dari sesi sebelumnya yang sudah di-scan.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto mt-4 pr-2">
                  {statementHistory.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">Belum ada riwayat unggahan statement.</div>
                  ) : (
                    <div className="space-y-3">
                      {statementHistory.map((hist) => (
                        <div key={hist.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                          <div>
                            <p className="font-bold text-slate-800">{hist.file_name}</p>
                            <div className="flex gap-3 mt-1 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> {hist.file_type}</span>
                              <span>•</span>
                              <span>{hist.total_transactions} Baris</span>
                              <span>•</span>
                              <span>{new Date(hist.created_at).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() => {
                              setBankMutations(hist.parsed_data);
                              setIsHistoryDialogOpen(false);
                              toast.success(`Berhasil memuat ${hist.total_transactions} baris dari riwayat.`);
                            }}
                          >
                            Muat Data
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => document.getElementById('file-up').click()} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" /> Upload Mutasi
            </Button>
            <input type="file" id="file-up" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
          </div>
        }
      />

      <div id="print-bank-reconciliation">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden mb-8">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 p-6 bg-slate-50/50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Daftar Transaksi Statement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBankMutations([])} className="rounded-lg h-9">Reset</Button>
            <Button size="sm" onClick={runAutoMatch} disabled={bankMutations.length === 0} className="bg-blue-600 hover:bg-blue-700 rounded-lg h-9">
              <RefreshCw className="w-4 h-4 mr-2" /> Run Auto-Match
            </Button>
            <Button size="sm" onClick={confirmReconcile} disabled={!bankMutations.some(m => m.status === 'matched')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg h-9 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Reconcile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-slate-50/30">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="w-32">Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-32">Referensi</TableHead>
                  <TableHead className="text-right w-36 text-red-600">Debit</TableHead>
                  <TableHead className="text-right w-36 text-emerald-600">Credit</TableHead>
                  <TableHead className="text-right w-40 text-blue-600">Saldo</TableHead>
                  <TableHead className="text-center w-32">Status</TableHead>
                  <TableHead className="text-center w-24">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankMutations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center text-slate-400 font-medium">
                      Silakan upload file mutasi (Excel/PDF/Gambar) untuk memulai rekonsiliasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  bankMutations.map((mut, idx) => (
                    <TableRow key={idx} className={mut.status === 'matched' ? 'bg-emerald-50/30' : ''}>
                      <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-bold">{mut.date}</TableCell>
                      <TableCell className="whitespace-normal break-words min-w-[250px] text-[11px] leading-relaxed font-medium text-slate-600 uppercase">
                        {mut.description}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{mut.reference}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(mut.debit)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(mut.credit)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{formatCurrency(mut.balance)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] uppercase font-black ${mut.status === 'matched' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {mut.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {mut.status === 'matched' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <AlertCircle className="w-5 h-5 text-slate-200 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* System Transactions Table */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden mt-8">
        <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> Data Transaksi Sistem (Internal Ledger)
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium mt-1">Daftar transaksi di sistem yang belum direkonsiliasi.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-slate-50/30">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="w-32">Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-32">Referensi</TableHead>
                  <TableHead className="text-right w-36 text-red-600">Debit</TableHead>
                  <TableHead className="text-right w-36 text-emerald-600">Credit</TableHead>
                  <TableHead className="text-right w-40 text-blue-600">Saldo</TableHead>
                  <TableHead className="text-center w-24">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></TableCell>
                  </TableRow>
                ) : systemTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-slate-400 font-medium">Semua transaksi sistem sudah sinkron (direkonsiliasi).</TableCell>
                  </TableRow>
                ) : (
                  systemTransactions.map((sys, idx) => (
                    <TableRow key={sys.id} className={sys.matched ? 'bg-emerald-50/30' : ''}>
                      <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-bold">{sys.timestamp_wib ? sys.timestamp_wib.split(' ')[0] : (sys.created_date || '-')}</TableCell>
                      <TableCell className="whitespace-normal break-words min-w-[250px] text-[11px] leading-relaxed font-medium text-slate-600 uppercase">
                        {sys.description}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{sys.reference}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{sys.transaction_type === 'Debit' ? formatCurrency(sys.amount) : '-'}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{sys.transaction_type === 'Credit' ? formatCurrency(sys.amount) : '-'}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{formatCurrency(sys.balance || 0)}</TableCell>
                      <TableCell className="text-center">
                        {sys.matched ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <AlertCircle className="w-5 h-5 text-slate-200 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

