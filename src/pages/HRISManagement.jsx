import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Pencil, Trash2, UserCircle, Loader2, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ExportToolbar from '@/components/layout/ExportToolbar';
import moment from 'moment';
import { getEffectiveLimits } from '@/planConfig';

export default function HRISManagement({ store }) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '', name: '', position: '', department: '', phone: '', email: '', address: '', join_date: '', salary: 0, status: 'Active', photo_url: ''
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Terlalu Besar', description: 'Ukuran foto maksimal 2MB.', variant: 'destructive' });
        return;
      }
      setIsUploadingPhoto(true);
      try {
        const result = await api.storage.upload(file);
        setFormData({...formData, photo_url: result.url});
      } catch (error) {
        toast({ title: 'Gagal Upload', description: 'Gagal mengunggah foto.', variant: 'destructive' });
      }
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (store?.id) loadEmployees();
  }, [store]);

  const loadEmployees = async () => {
    const data = await api.entities.Employee.filter({ store_id: store.id });
    setEmployees(data);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (!editingEmployee) {
      const limits = getEffectiveLimits(store);
      if (limits.maxEmployees !== Infinity && employees.length >= limits.maxEmployees) {
        toast({
          title: "Batas Karyawan Tercapai",
          description: `Anda telah mencapai batas maksimal karyawan (${limits.maxEmployees} data). Silakan upgrade ke Pro untuk akses tanpa batas.`,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
    }

    const employeeData = { ...formData, store_id: store.id, salary: Number(formData.salary) };
    if (!employeeData.employee_id) {
      employeeData.employee_id = `EMP-${Date.now().toString().slice(-6)}`;
    }
    if (editingEmployee) {
      await api.entities.Employee.update(editingEmployee.id, employeeData);
      
      // Sync photo change to linked User account
      if (employeeData.photo_url !== editingEmployee.photo_url) {
        try {
          const allUsers = await api.entities.User.filter({ store_id: store.id });
          const linkedUser = allUsers.find(u => 
            (u.linked_employee_id === editingEmployee.id) ||
            (u.full_name?.toLowerCase().trim() === employeeData.name.toLowerCase().trim())
          );
          
          if (linkedUser) {
            await api.entities.User.update(linkedUser.id, { 
              photo_url: employeeData.photo_url,
              avatar_url: employeeData.photo_url
            });
            // Only update Header avatar if the linked user IS the currently logged-in user
            const loggedInUser = await api.auth.me();
            if (loggedInUser && loggedInUser.id === linkedUser.id) {
              api.auth._currentUser = null;
              window.dispatchEvent(new CustomEvent('avatar_updated', { detail: { avatarUrl: employeeData.photo_url } }));
            }
          }
        } catch (e) { console.error('Error syncing HRIS photo to User:', e); }
      }
    } else {
      await api.entities.Employee.create(employeeData);
    }
    setIsSaving(false);
    setShowForm(false);
    setEditingEmployee(null);
    setFormData({ employee_id: '', name: '', position: '', department: '', phone: '', email: '', address: '', join_date: '', salary: 0, status: 'Active', photo_url: '' });
    loadEmployees();
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_id: employee.employee_id || '',
      name: employee.name || '',
      position: employee.position || '',
      department: employee.department || '',
      phone: employee.phone || '',
      email: employee.email || '',
      address: employee.address || '',
      join_date: employee.join_date || '',
      salary: employee.salary || 0,
      status: employee.status || 'Active',
      photo_url: employee.photo_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.Employee.delete(deleteEmployee.id);
    setDeleteEmployee(null);
    loadEmployees();
  };

  const filteredEmployees = employees.filter(e =>
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = { Active: 'bg-emerald-100 text-emerald-700', Inactive: 'bg-slate-100 text-slate-700', 'On Leave': 'bg-amber-100 text-amber-700' };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        subtitle="Kelola data karyawan"
        icon={UserCircle}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar 
              title="Laporan Data Karyawan" 
              date={moment().format('DD MMMM YYYY')} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-hris-detailed" 
            />
            <Button onClick={() => { setEditingEmployee(null); setFormData({ employee_id: '', name: '', position: '', department: '', phone: '', email: '', address: '', join_date: '', salary: 0, status: 'Active', photo_url: '' }); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Karyawan
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari karyawan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Gaji</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                    <UserCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Tidak ada karyawan ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee, idx) => (
                  <TableRow key={employee.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{employee.employee_id}</TableCell>
                    <TableCell>
                      {employee.photo_url ? (
                        <img src={employee.photo_url} alt={employee.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(employee.salary)}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingEmployee(employee)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteEmployee(employee)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload */}
            <div className="space-y-1.5">
              <Label>Foto Karyawan</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : formData.photo_url ? (
                    <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} className="text-sm" />
                  <p className="text-[10px] text-slate-400 mt-1">Max 2MB (JPG, PNG)</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ID Karyawan</Label><Input value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} className="mt-1.5" placeholder="Auto-generate" /></div>
              <div><Label>Nama *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1.5" required /></div>
              <div><Label>Posisi *</Label><Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} className="mt-1.5" required /></div>
              <div><Label>Department</Label><Input value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Telepon</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Tanggal Bergabung</Label><Input type="date" value={formData.join_date} onChange={(e) => setFormData({...formData, join_date: e.target.value})} className="mt-1.5" /></div>
              <div><Label>Gaji</Label><NumberInput value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} className="mt-1.5" /></div>
              <div className="col-span-2"><Label>Alamat</Label><Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="mt-1.5" rows={2} /></div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={() => setViewingEmployee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Karyawan</DialogTitle></DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4">
              {viewingEmployee.photo_url && (
                <div className="flex justify-center">
                  <img src={viewingEmployee.photo_url} alt={viewingEmployee.name} className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200 shadow-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-500">ID</p><p className="font-medium">{viewingEmployee.employee_id}</p></div>
                <div><p className="text-sm text-slate-500">Nama</p><p className="font-medium">{viewingEmployee.name}</p></div>
                <div><p className="text-sm text-slate-500">Posisi</p><p className="font-medium">{viewingEmployee.position}</p></div>
                <div><p className="text-sm text-slate-500">Department</p><p className="font-medium">{viewingEmployee.department || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Telepon</p><p className="font-medium">{viewingEmployee.phone || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{viewingEmployee.email || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Tanggal Bergabung</p><p className="font-medium">{viewingEmployee.join_date || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Gaji</p><p className="font-medium">Rp {formatCurrency(viewingEmployee.salary)}</p></div>
                <div><p className="text-sm text-slate-500">Status</p>{getStatusBadge(viewingEmployee.status)}</div>
                <div className="col-span-2"><p className="text-sm text-slate-500">Alamat</p><p className="font-medium">{viewingEmployee.address || '-'}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteEmployee} onOpenChange={() => setDeleteEmployee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Karyawan</DialogTitle></DialogHeader>
          <p>Yakin ingin menghapus karyawan <strong>{deleteEmployee?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEmployee(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-hris-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>ID Karyawan</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Jabatan/Dept</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tanggal Join</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Gaji Bulanan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((e, idx) => (
              <TableRow key={e.id}>
                <TableCell className="text-center">{idx + 1}</TableCell>
                <TableCell className="font-medium text-blue-600">{e.employee_id}</TableCell>
                <TableCell className="font-bold">{e.name}</TableCell>
                <TableCell>{e.position}</TableCell>
                <TableCell>{e.department || '-'}</TableCell>
                <TableCell>{e.phone || '-'}</TableCell>
                <TableCell>{e.email || '-'}</TableCell>
                <TableCell>{e.join_date || '-'}</TableCell>
                <TableCell>{e.address || '-'}</TableCell>
                <TableCell>Rp {formatCurrency(e.salary)}</TableCell>
                <TableCell>{e.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
