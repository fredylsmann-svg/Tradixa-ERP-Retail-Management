import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { Settings } from 'lucide-react';

export default function PengaturanAgen({ store }) {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deleteAgent, setDeleteAgent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', commission_rate: 0
  });

  useEffect(() => {
    if (store?.id) loadAgents();
  }, [store]);

  const loadAgents = async () => {
    const data = await api.entities.Agent.filter({ store_id: store.id });
    setAgents(data);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const agentData = { ...formData, store_id: store.id, commission_rate: Number(formData.commission_rate) };
    if (editingAgent) {
      await api.entities.Agent.update(editingAgent.id, agentData);
    } else {
      await api.entities.Agent.create({ ...agentData, balance: 0, status: 'Active' });
    }
    setIsSaving(false);
    setShowForm(false);
    setEditingAgent(null);
    setFormData({ name: '', phone: '', email: '', address: '', commission_rate: 0 });
    loadAgents();
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      address: agent.address || '',
      commission_rate: agent.commission_rate || 0
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.Agent.delete(deleteAgent.id);
    setDeleteAgent(null);
    loadAgents();
  };

  const toggleStatus = async (agent) => {
    const newStatus = agent.status === 'Active' ? 'Inactive' : 'Active';
    await api.entities.Agent.update(agent.id, { status: newStatus });
    loadAgents();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Agen"
        subtitle="Kelola data agen keuangan"
        icon={Settings}
        actions={
          <Button onClick={() => { setEditingAgent(null); setFormData({ name: '', phone: '', email: '', address: '', commission_rate: 0 }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Agen
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Nama Agen</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Komisi (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada agen
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent, index) => (
                  <TableRow key={agent.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.phone || '-'}</TableCell>
                    <TableCell>{agent.email || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">Rp {formatCurrency(agent.balance)}</TableCell>
                    <TableCell className="text-center">{agent.commission_rate || 0}%</TableCell>
                    <TableCell>
                      <Badge 
                        className={`cursor-pointer ${agent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                        onClick={() => toggleStatus(agent)}
                      >
                        {agent.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteAgent(agent)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAgent ? 'Edit Agen' : 'Tambah Agen Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nama Agen *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1.5" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telepon</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div><Label>Alamat</Label><Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="mt-1.5" rows={2} /></div>
            <div><Label>Rate Komisi (%)</Label><Input type="number" value={formData.commission_rate} onChange={(e) => setFormData({...formData, commission_rate: e.target.value})} className="mt-1.5" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Agen</DialogTitle></DialogHeader>
          <p>Yakin ingin menghapus agen <strong>{deleteAgent?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAgent(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
