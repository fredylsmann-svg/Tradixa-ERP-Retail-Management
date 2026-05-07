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
import { Plus, Pencil, Trash2, Building2, Loader2, Landmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberInput } from '@/components/ui/number-input';
import { formatNumber } from '@/utils/currencyFormatter';
import PageHeader from '@/components/layout/PageHeader';

export default function BankAccounts({ store }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteAccount, setDeleteAccount] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '', account_number: '', account_name: '', account_type: 'Savings', balance: 0
  });

  useEffect(() => {
    if (store?.id) loadAccounts();
  }, [store]);

  const loadAccounts = async () => {
    const data = await api.entities.BankAccount.filter({ store_id: store.id });
    setAccounts(data || []);
    setIsLoading(false);
  };

  const formatCurrency = (value) => formatNumber(value || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const accountData = { ...formData, store_id: store.id, balance: Number(formData.balance) };
    if (editingAccount) {
      await api.entities.BankAccount.update(editingAccount.id, accountData);
    } else {
      await api.entities.BankAccount.create(accountData);
    }
    setIsSaving(false);
    setShowForm(false);
    setEditingAccount(null);
    setFormData({ bank_name: '', account_number: '', account_name: '', account_type: 'Savings', balance: 0 });
    loadAccounts();
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_name: account.account_name || '',
      account_type: account.account_type || 'Savings',
      balance: account.balance || 0
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.BankAccount.delete(deleteAccount.id);
    setDeleteAccount(null);
    loadAccounts();
  };

  const totalBalance = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0 min-h-full">
      {/* Header */}
      <PageHeader
        title="Bank Accounts"
        subtitle="Kelola rekening bank toko"
        icon={Landmark}
        actions={
          <Button onClick={() => { setEditingAccount(null); setFormData({ bank_name: '', account_number: '', account_name: '', account_type: 'Savings', balance: 0 }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Rekening
          </Button>
        }
      />

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-4 md:p-6">
          <p className="text-xs md:text-sm text-blue-100">Total Saldo</p>
          <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2 break-words">Rp {formatCurrency(totalBalance)}</p>
          <p className="text-xs md:text-sm text-blue-100 mt-1">{(accounts || []).length} rekening aktif</p>
        </CardContent>
      </Card>

      {/* Accounts List - Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
        ) : (accounts || []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Landmark className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">Belum ada rekening bank</p>
            </CardContent>
          </Card>
        ) : (
          (accounts || []).map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{account.bank_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">No. Rekening: {account.account_number}</p>
                  </div>
                  <Badge className={account.is_active !== false ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-slate-100 text-slate-700 text-xs'}>
                    {account.is_active !== false ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Atas Nama:</span>
                    <span className="text-xs font-medium text-slate-900">{account.account_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Tipe:</span>
                    <span className="text-xs font-medium text-slate-900">{account.account_type}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-600">Saldo:</span>
                    <span className="text-sm font-semibold text-blue-600">Rp {formatCurrency(account.balance)}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(account)} className="flex-1 h-8 text-xs">
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteAccount(account)} className="flex-1 h-8 text-xs text-red-600 hover:text-red-700">
                    <Trash2 className="w-3 h-3 mr-1" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Accounts Table - Desktop View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead >Bank</TableHead>
                  <TableHead >No. Rekening</TableHead>
                  <TableHead >Atas Nama</TableHead>
                  <TableHead >Tipe</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead >Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : (accounts || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <Landmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Belum ada rekening bank
                    </TableCell>
                  </TableRow>
                ) : (
                  (accounts || []).map((account, idx) => (
                    <TableRow key={account.id}>
                      <TableCell className="text-center text-slate-400 font-medium text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{account.bank_name}</TableCell>
                      <TableCell className="text-sm">{account.account_number}</TableCell>
                      <TableCell className="text-sm">{account.account_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{account.account_type}</Badge></TableCell>
                      <TableCell className="text-right font-medium text-sm">Rp {formatCurrency(account.balance)}</TableCell>
                      <TableCell>
                        <Badge className={account.is_active !== false ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-slate-100 text-slate-700 text-xs'}>
                          {account.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(account)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteAccount(account)} className="h-8 w-8"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader><DialogTitle className="text-lg">{editingAccount ? 'Edit Rekening' : 'Tambah Rekening Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label className="text-xs md:text-sm">Nama Bank *</Label><Input value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} className="mt-1 text-sm" required /></div>
            <div><Label className="text-xs md:text-sm">No. Rekening *</Label><Input value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} className="mt-1 text-sm" required /></div>
            <div><Label className="text-xs md:text-sm">Atas Nama *</Label><Input value={formData.account_name} onChange={(e) => setFormData({...formData, account_name: e.target.value})} className="mt-1 text-sm" required /></div>
            <div><Label className="text-xs md:text-sm">Tipe Rekening</Label>
              <Select value={formData.account_type} onValueChange={(v) => setFormData({...formData, account_type: v})}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Checking">Checking</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs md:text-sm">Saldo Awal</Label><NumberInput value={formData.balance} onChange={(e) => setFormData({...formData, balance: e.target.value})} className="mt-1 text-sm" placeholder="0" /></div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-sm">Batal</Button>
              <Button type="submit" disabled={isSaving} className="text-sm">{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader><DialogTitle>Hapus Rekening</DialogTitle></DialogHeader>
          <p className="text-sm">Yakin ingin menghapus rekening <strong>{deleteAccount?.bank_name} - {deleteAccount?.account_number}</strong>?</p>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeleteAccount(null)} className="text-sm">Batal</Button>
            <Button variant="destructive" onClick={handleDelete} className="text-sm">Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
