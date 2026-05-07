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

export default function TransaksiAgen({ store }) {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    agent_id: '', transaction_type: 'Deposit', service_type: '', amount: '', notes: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
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
      reference: `AGT-${Date.now()}`,
      notes: formData.notes,
      timestamp_wib: getWIBTimestamp()
    });

    await api.entities.Agent.update(formData.agent_id, { balance: newBalance });

    setIsSaving(false);
    setShowForm(false);
    setFormData({ agent_id: '', transaction_type: 'Deposit', service_type: '', amount: '', notes: '' });
    loadData();
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
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 px-3 text-xs font-semibold">
              <Download className="w-3.5 h-3.5 mr-1.5" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="h-9 px-3 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-3 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5 mr-1.5" />Print
            </Button>
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
            <div><Label>Jumlah *</Label><NumberInput value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="mt-1.5" required /></div>
            <div><Label>Catatan</Label><Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="mt-1.5" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving || !formData.agent_id}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
