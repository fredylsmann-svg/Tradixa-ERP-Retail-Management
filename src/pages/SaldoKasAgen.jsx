import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';

export default function SaldoKasAgen({ store }) {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topUpDialog, setTopUpDialog] = useState(null);
  const [withdrawDialog, setWithdrawDialog] = useState(null);
  const [amount, setAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (store?.id) loadAgents();
  }, [store]);

  const loadAgents = async () => {
    const data = await api.entities.Agent.filter({ store_id: store.id });
    setAgents(data);
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

  const handleTopUp = async () => {
    if (!topUpDialog || amount <= 0) return;
    setIsSaving(true);
    const newBalance = (topUpDialog.balance || 0) + amount;
    
    await api.entities.AgentTransaction.create({
      store_id: store.id,
      agent_id: topUpDialog.id,
      agent_name: topUpDialog.name,
      transaction_type: 'Deposit',
      amount,
      balance_after: newBalance,
      reference: `DEP-${Date.now()}`,
      timestamp_wib: getWIBTimestamp()
    });
    
    await api.entities.Agent.update(topUpDialog.id, { balance: newBalance });
    
    setIsSaving(false);
    setTopUpDialog(null);
    setAmount(0);
    loadAgents();
  };

  const handleWithdraw = async () => {
    if (!withdrawDialog || amount <= 0) return;
    setIsSaving(true);
    const newBalance = Math.max(0, (withdrawDialog.balance || 0) - amount);
    
    await api.entities.AgentTransaction.create({
      store_id: store.id,
      agent_id: withdrawDialog.id,
      agent_name: withdrawDialog.name,
      transaction_type: 'Withdrawal',
      amount,
      balance_after: newBalance,
      reference: `WDR-${Date.now()}`,
      timestamp_wib: getWIBTimestamp()
    });
    
    await api.entities.Agent.update(withdrawDialog.id, { balance: newBalance });
    
    setIsSaving(false);
    setWithdrawDialog(null);
    setAmount(0);
    loadAgents();
  };

  const totalBalance = agents.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo & Kas Agen"
        subtitle="Kelola saldo dan kas agen"
        icon={Wallet}
      />

      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="p-6">
          <p className="text-emerald-100">Total Saldo Semua Agen</p>
          <p className="text-3xl font-bold mt-2">Rp {formatCurrency(totalBalance)}</p>
          <p className="text-emerald-100 mt-1">{agents.length} agen terdaftar</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Nama Agen</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada agen
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent, index) => (
                  <TableRow key={agent.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">Rp {formatCurrency(agent.balance)}</TableCell>
                    <TableCell>
                      <Badge className={agent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {agent.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => { setTopUpDialog(agent); setAmount(0); }}>
                          <ArrowDownRight className="w-4 h-4 mr-1" />Top Up
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => { setWithdrawDialog(agent); setAmount(0); }}>
                          <ArrowUpRight className="w-4 h-4 mr-1" />Tarik
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Up Dialog */}
      <Dialog open={!!topUpDialog} onOpenChange={() => setTopUpDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top Up Saldo - {topUpDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Saldo saat ini: <strong>Rp {formatCurrency(topUpDialog?.balance || 0)}</strong></p>
            <div><Label>Jumlah Top Up</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpDialog(null)}>Batal</Button>
            <Button onClick={handleTopUp} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={!!withdrawDialog} onOpenChange={() => setWithdrawDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tarik Saldo - {withdrawDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Saldo saat ini: <strong>Rp {formatCurrency(withdrawDialog?.balance || 0)}</strong></p>
            <div><Label>Jumlah Tarik</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialog(null)}>Batal</Button>
            <Button onClick={handleWithdraw} disabled={isSaving} variant="destructive">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Tarik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
