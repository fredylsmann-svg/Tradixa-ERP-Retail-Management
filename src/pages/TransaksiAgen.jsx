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
import { Plus, ArrowRightLeft, Loader2, Download, FileText, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import { useSettings } from '@/contexts/SettingsContext';

export default function TransaksiAgen({ store }) {
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    agent_id: '', 
    transaction_type: 'Deposit', 
    service_type: '', 
    amount: '', 
    notes: '',
    payment_mode: 'Cash',
    trace_number: ''
  });

  // EDC states
  const [showEdcDialog, setShowEdcDialog] = useState(false);
  const [edcStatus, setEdcStatus] = useState('idle'); // idle | connecting | processing | success | failed
  const [edcErrorMessage, setEdcErrorMessage] = useState('');

  useEffect(() => {
    if (showForm) {
      const defaultMode = settings?.defaultEdcIntegration === 'Local' ? 'EDC_Local' : 'EDC_Manual';
      setFormData(prev => ({ ...prev, payment_mode: defaultMode }));
    }
  }, [showForm, settings?.defaultEdcIntegration]);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [txData, agentsData, servicesData] = await Promise.all([
      api.entities.AgentTransaction.filter({ store_id: store.id }, '-created_date'),
      api.entities.Agent.filter({ store_id: store.id }),
      api.entities.AgentService.filter({ store_id: store.id })
    ]);
    setTransactions(txData);
    setAgents(agentsData);
    setServices(servicesData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const saveTransactionRecord = async (traceOrRef) => {
    const agent = agents.find(a => a.id === formData.agent_id);
    const service = services.find(s => s.name === formData.service_type);
    const amount = Number(formData.amount);
    const fee = service?.fee || 0;
    const commission = service?.commission || 0;
    
    let newBalance = agent?.balance || 0;
    if (['Deposit', 'Commission'].includes(formData.transaction_type)) {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }

    let finalRef = `AGT-${Date.now()}`;
    let addedNotes = formData.notes;

    if (formData.payment_mode === 'EDC_Local') {
      finalRef = `EDC-LOC-${traceOrRef}`;
      addedNotes = `[EDC Local Bridge Trace: ${traceOrRef}] ${formData.notes}`.trim();
    } else if (formData.payment_mode === 'EDC_Manual') {
      finalRef = `EDC-MAN-${traceOrRef || 'UNKNOWN'}`;
      addedNotes = `[EDC Manual Trace: ${traceOrRef || 'UNKNOWN'}] ${formData.notes}`.trim();
    }

    await api.entities.AgentTransaction.create({
      store_id: store.id,
      agent_id: formData.agent_id,
      agent_name: agent?.name || '',
      transaction_type: formData.transaction_type,
      service_type: formData.service_type,
      amount,
      fee,
      commission,
      balance_after: newBalance,
      reference: finalRef,
      notes: addedNotes,
      timestamp_wib: getWIBTimestamp()
    });

    await api.entities.Agent.update(formData.agent_id, { balance: newBalance });
    loadData();
  };

  const handleEdcConnection = (amount) => {
    setEdcStatus('connecting');
    setEdcErrorMessage('');
    setShowEdcDialog(true);

    const ws = new WebSocket('ws://localhost:9000');
    let hasResponded = false;

    const connectionTimeout = setTimeout(() => {
      if (!hasResponded) {
        ws.close();
        setEdcStatus('failed');
        setEdcErrorMessage('Gagal terhubung ke ECR local bridge di localhost:9000. Pastikan service local bridge aktif.');
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      setEdcStatus('processing');
      ws.send(JSON.stringify({
        command: 'purchase',
        amount: Number(amount),
        reference: `EDC-${Date.now()}`
      }));
    };

    ws.onmessage = (event) => {
      hasResponded = true;
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'success') {
          setEdcStatus('success');
          saveTransactionRecord(data.trace_number || `EDC-${Date.now()}`);
          ws.close();
          setShowForm(false);
          const defaultMode = settings?.defaultEdcIntegration === 'Local' ? 'EDC_Local' : 'EDC_Manual';
          setFormData({ agent_id: '', transaction_type: 'Deposit', service_type: '', amount: '', notes: '', payment_mode: defaultMode, trace_number: '' });
        } else {
          setEdcStatus('failed');
          setEdcErrorMessage(data.message || 'Transaksi ditolak oleh mesin EDC.');
          ws.close();
        }
      } catch (err) {
        setEdcStatus('failed');
        setEdcErrorMessage('Format respon dari local bridge tidak valid.');
        ws.close();
      }
    };

    ws.onerror = () => {
      hasResponded = true;
      clearTimeout(connectionTimeout);
      setEdcStatus('failed');
      setEdcErrorMessage('Tidak dapat membuka koneksi. Silakan periksa apakah ECR Local Bridge service sudah berjalan.');
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) return;

    if (formData.payment_mode === 'EDC_Local') {
      handleEdcConnection(amount);
    } else {
      setIsSaving(true);
      const trace = formData.payment_mode === 'EDC_Manual' ? formData.trace_number : null;
      await saveTransactionRecord(trace);
      setIsSaving(false);
      setShowForm(false);
      const defaultMode = settings?.defaultEdcIntegration === 'Local' ? 'EDC_Local' : 'EDC_Manual';
      setFormData({ agent_id: '', transaction_type: 'Deposit', service_type: '', amount: '', notes: '', payment_mode: defaultMode, trace_number: '' });
    }
  };

  const getTypeBadge = (type) => {
    const styles = {
      Deposit: 'bg-emerald-100 text-emerald-700',
      Withdrawal: 'bg-red-100 text-red-700',
      Commission: 'bg-blue-100 text-blue-700',
      Fee: 'bg-amber-100 text-amber-700',
      Transfer: 'bg-violet-100 text-violet-700'
    };
    return <Badge className={styles[type]}>{type}</Badge>;
  };

  const exportCSV = () => {
    const headers = ['No', 'Tanggal', 'Agen', 'Tipe', 'Layanan', 'Jumlah', 'Fee', 'Komisi', 'Saldo Setelah', 'Referensi'];
    const rows = transactions.map((tx, i) => [i + 1, tx.timestamp_wib || '', tx.agent_name, tx.transaction_type, tx.service_type || '-', tx.amount, tx.fee || 0, tx.commission || 0, tx.balance_after || 0, tx.reference || '-']);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transaksi-agen-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const exportPDF = () => {
    let content = `<html><head><title>Transaksi Agen</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:11px}th{background:#f5f5f5;font-weight:bold}h1{font-size:18px;color:#1e293b}.meta{color:#64748b;font-size:11px;margin-top:8px}</style></head><body>`;
    content += `<h1>Laporan Transaksi Agen</h1><p class="meta">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`;
    content += '<table><tr><th>No</th><th>Tanggal</th><th>Agen</th><th>Tipe</th><th>Layanan</th><th>Jumlah</th><th>Fee</th><th>Komisi</th><th>Saldo</th><th>Ref</th></tr>';
    transactions.forEach((tx, i) => { content += `<tr><td>${i + 1}</td><td>${tx.timestamp_wib || ''}</td><td>${tx.agent_name}</td><td>${tx.transaction_type}</td><td>${tx.service_type || '-'}</td><td>${tx.amount?.toLocaleString()}</td><td>${(tx.fee || 0).toLocaleString()}</td><td>${(tx.commission || 0).toLocaleString()}</td><td>${(tx.balance_after || 0).toLocaleString()}</td><td>${tx.reference || '-'}</td></tr>`; });
    content += '</table><script>window.onload=function(){window.print();};</script></body></html>';
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) { alert("Popup diblokir! Izinkan popup untuk mencetak."); return; }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaksi Agen"
        subtitle="Kelola transaksi agen keuangan"
        icon={ArrowRightLeft}
        actions={
          <div className="flex items-center gap-2">
            <PremiumGate feature="Export Excel" iconType="action" store={store}>
              <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 px-3 text-xs font-semibold">
                <Download className="w-3.5 h-3.5 mr-1.5" />Excel
              </Button>
            </PremiumGate>
            <PremiumGate feature="Export PDF" iconType="action" store={store}>
              <Button variant="outline" size="sm" onClick={exportPDF} className="h-9 px-3 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
            </PremiumGate>
            <PremiumGate feature="Print Data" iconType="action" store={store}>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-3 text-xs font-semibold">
                <Printer className="w-3.5 h-3.5 mr-1.5" />Print
              </Button>
            </PremiumGate>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Transaksi Baru
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Agen</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Saldo Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx, index) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{index + 1}</TableCell>
                    <TableCell>{tx.timestamp_wib}</TableCell>
                    <TableCell className="font-medium">{tx.reference}</TableCell>
                    <TableCell>{tx.agent_name}</TableCell>
                    <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                    <TableCell>{tx.service_type || '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      ['Deposit', 'Commission'].includes(tx.transaction_type) ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {['Deposit', 'Commission'].includes(tx.transaction_type) ? '+' : '-'}Rp {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(tx.fee || 0)}</TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(tx.balance_after)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaksi Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Agen *</Label>
              <Select value={formData.agent_id} onValueChange={(v) => setFormData({...formData, agent_id: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih agen" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipe Transaksi</Label>
              <Select value={formData.transaction_type} onValueChange={(v) => setFormData({...formData, transaction_type: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="Commission">Commission</SelectItem>
                  <SelectItem value="Fee">Fee</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Layanan (Opsional)</Label>
              <Select value={formData.service_type} onValueChange={(v) => setFormData({...formData, service_type: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih layanan" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={formData.payment_mode} onValueChange={(v) => setFormData({...formData, payment_mode: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Tunai (Cash)</SelectItem>
                  <SelectItem value="EDC_Local">EDC Local Bridge (WebSocket)</SelectItem>
                  <SelectItem value="EDC_Manual">EDC Manual (Input Trace No)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.payment_mode === 'EDC_Manual' && (
              <div>
                <Label>Trace Number / Approval Code *</Label>
                <Input 
                  value={formData.trace_number} 
                  onChange={(e) => setFormData({...formData, trace_number: e.target.value})} 
                  className="mt-1.5" 
                  placeholder="Contoh: 123456"
                  required 
                />
              </div>
            )}
            <div><Label>Jumlah *</Label><NumberInput value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="mt-1.5" required /></div>
            <div><Label>Catatan</Label><Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="mt-1.5" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving || !formData.agent_id}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Progress EDC */}
      <Dialog open={showEdcDialog} onOpenChange={(open) => {
        if (edcStatus === 'processing' || edcStatus === 'connecting') return;
        setShowEdcDialog(open);
      }}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-lg">
              {edcStatus === 'connecting' && 'Menghubungkan ke EDC...'}
              {edcStatus === 'processing' && 'Memproses Transaksi Kartu...'}
              {edcStatus === 'success' && 'Pembayaran Berhasil!'}
              {edcStatus === 'failed' && 'Pembayaran Gagal'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {(edcStatus === 'connecting' || edcStatus === 'processing') && (
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
                <span className="absolute text-xs font-semibold text-blue-600">EDC</span>
              </div>
            )}
            {edcStatus === 'success' && (
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {edcStatus === 'failed' && (
              <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center animate-shake">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}

            <p className="text-center text-sm font-semibold text-slate-500 mt-2">
              {edcStatus === 'connecting' && 'Sedang menghubungkan ke Tradixa ECR Bridge (ws://localhost:9000)...'}
              {edcStatus === 'processing' && 'Silakan gesek/masukkan kartu ATM/Kredit pada mesin EDC dan masukkan PIN Anda.'}
              {edcStatus === 'success' && 'Transaksi berhasil diproses oleh mesin EDC.'}
              {edcStatus === 'failed' && (edcErrorMessage || 'Koneksi terputus atau transaksi ditolak oleh mesin EDC.')}
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-center">
            {edcStatus === 'failed' && (
              <>
                <Button onClick={() => {
                  setShowEdcDialog(false);
                  setFormData(prev => ({ ...prev, payment_mode: 'EDC_Manual' }));
                }} variant="outline" className="w-full">
                  Ganti ke EDC Manual
                </Button>
                <Button onClick={() => handleEdcConnection(formData.amount)} className="bg-blue-600 text-white hover:bg-blue-700 w-full">
                  Coba Lagi
                </Button>
              </>
            )}
            {edcStatus === 'success' && (
              <Button onClick={() => setShowEdcDialog(false)} className="bg-emerald-600 text-white hover:bg-emerald-700 w-full">
                Selesai
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
