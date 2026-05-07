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
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, List, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';

const CATEGORIES = ['Pulsa', 'Listrik', 'PDAM', 'BPJS', 'Internet', 'TV Kabel', 'E-Wallet', 'Transfer', 'Lainnya'];

export default function DaftarLayanan({ store }) {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteService, setDeleteService] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'Pulsa', fee: 0, commission: 0, is_active: true
  });

  useEffect(() => {
    if (store?.id) loadServices();
  }, [store]);

  const loadServices = async () => {
    const data = await api.entities.AgentService.filter({ store_id: store.id });
    setServices(data);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const serviceData = { ...formData, store_id: store.id, fee: Number(formData.fee), commission: Number(formData.commission) };
    if (editingService) {
      await api.entities.AgentService.update(editingService.id, serviceData);
    } else {
      await api.entities.AgentService.create(serviceData);
    }
    setIsSaving(false);
    setShowForm(false);
    setEditingService(null);
    setFormData({ name: '', category: 'Pulsa', fee: 0, commission: 0, is_active: true });
    loadServices();
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || '',
      category: service.category || 'Pulsa',
      fee: service.fee || 0,
      commission: service.commission || 0,
      is_active: service.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.AgentService.delete(deleteService.id);
    setDeleteService(null);
    loadServices();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Layanan"
        subtitle="Kelola layanan agen keuangan"
        icon={List}
        actions={
          <Button onClick={() => { setEditingService(null); setFormData({ name: '', category: 'Pulsa', fee: 0, commission: 0, is_active: true }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Layanan
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Nama Layanan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <List className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada layanan
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service, index) => (
                  <TableRow key={service.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell><Badge variant="outline">{service.category}</Badge></TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(service.fee)}</TableCell>
                    <TableCell className="text-right text-emerald-600">Rp {formatCurrency(service.commission)}</TableCell>
                    <TableCell>
                      <Badge className={service.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {service.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteService(service)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle>{editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nama Layanan *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1.5" required /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fee</Label><NumberInput value={formData.fee} onChange={(e) => setFormData({...formData, fee: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Komisi</Label><NumberInput value={formData.commission} onChange={(e) => setFormData({...formData, commission: e.target.value})} className="mt-1.5" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
              <Label>Aktif</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteService} onOpenChange={() => setDeleteService(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Layanan</DialogTitle></DialogHeader>
          <p>Yakin ingin menghapus layanan <strong>{deleteService?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteService(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
