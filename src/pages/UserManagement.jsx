import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Shield, Mail, Loader2, UserCircle, Edit, Briefcase, Key, ExternalLink, MessageCircle, RefreshCw, Download, FileText, MoreHorizontal, Save, LayoutGrid, Trash2, Camera, Building2, MapPin, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import moment from 'moment';
import PageHeader from '@/components/layout/PageHeader';
import { getPlanLimits, DEV_EMAILS } from '@/planConfig';

const MODULE_GROUPS = [
  {
    category: 'OVERVIEW',
    modules: ['Dashboard', 'Design Studio']
  },
  {
    category: 'WORKFLOW',
    modules: ['Workflow System']
  },
  {
    category: 'INVENTORY',
    modules: ['Product Master', 'Location Settings', 'Stock In', 'Stock Out', 'Inventory Ledger', 'Inventory Reports', 'Low Stock Alert']
  },
  {
    category: 'WAREHOUSE (WMS)',
    modules: ['WMS Workflow', 'Warehouse Dashboard', 'Transfer Gudang', 'Pick List', 'Stock Opname', 'Outbound Delivery']
  },
  {
    category: 'PROCUREMENT',
    modules: ['Procurement Workflow', 'Suppliers', 'Purchase Requisition', 'Purchase Orders', 'Goods Receipt', 'Inventory GRN', 'Supplier Return']
  },
  {
    category: 'CUSTOMERS & MARKETING',
    modules: ['Customer Master', 'Customer Segmentation', 'Marketing Automation']
  },
  {
    category: 'PROMOTIONS',
    modules: ['Discount Management', 'Loyalty Program']
  },
  {
    category: 'SALES',
    modules: ['Sales Transaction', 'Sales Invoices', 'Revenue Reports']
  },
  {
    category: 'FINANCIAL & OPERATIONS',
    modules: ['Bank Accounts', 'Bank Transactions', 'Cash Register', 'Bank Reconciliation', 'Account Receivables', 'Account Receivable Invoices', 'Account Payables', 'Account Payable Invoices', 'Payments', 'Operational Expenses', 'Journal Entries', 'Chart of Accounts', 'Tax Management']
  },
  {
    category: 'HRIS & MANAGEMENT',
    modules: ['Employee Management', 'Sales Performance', 'User Management']
  },
  {
    category: 'REPORTS',
    modules: ['Financial Statements', 'Stock Report', 'Sales Report', 'Reports']
  },
  {
    category: 'FINANCIAL AGENT',
    modules: ['Agent Workflow', 'Dashboard Agent', 'Transaksi Agen', 'Daftar Layanan', 'Saldo & Kas Agen', 'Laporan Fee', 'Agent Performance', 'Pengaturan Agen']
  },
  {
    category: 'SETTINGS & TOOLS',
    modules: ['Audit Log', 'Company Settings', 'Tradixa Assistant']
  }
];

const POSITION_MODS = {
  'Manager': MODULE_GROUPS.flatMap(g => g.modules),
  'Purchasing': [
    'Dashboard',
    ...MODULE_GROUPS.find(g => g.category === 'PROCUREMENT').modules,
    'Tradixa Assistant'
  ],
  'Warehouse': [
    'Dashboard',
    ...MODULE_GROUPS.find(g => g.category === 'INVENTORY').modules,
    ...MODULE_GROUPS.find(g => g.category === 'WAREHOUSE (WMS)').modules,
    'Tradixa Assistant'
  ],
  'Finance': [
    'Dashboard',
    ...MODULE_GROUPS.find(g => g.category === 'FINANCIAL & OPERATIONS').modules,
    'Financial Statements',
    'Tradixa Assistant'
  ],
  'Operator': [
    'Dashboard',
    ...MODULE_GROUPS.find(g => g.category === 'INVENTORY').modules.filter(m => m.includes('Stock')),
    ...MODULE_GROUPS.find(g => g.category === 'SALES').modules.filter(m => m.includes('Transaction')),
    'Tradixa Assistant'
  ],
  'Mechanic': [
    'Dashboard',
    ...MODULE_GROUPS.find(g => g.category === 'INVENTORY').modules.filter(m => m.includes('Stock')),
    'Tradixa Assistant'
  ]
};

export default function UserManagement({ store }) {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  
  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    position: '',
    customPosition: '',
    role: 'staff',
    phone: '',
    modules: [],
    authorities: [],
    approval_limit: 0,
    max_discount_limit: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua Role');

  useEffect(() => {
    checkOwnerAndLoadData();
  }, [store]);

  useEffect(() => {
    if (inviteForm.position && POSITION_MODS[inviteForm.position]) {
      setInviteForm(prev => ({ ...prev, modules: POSITION_MODS[inviteForm.position] }));
    }
  }, [inviteForm.position]);

  useEffect(() => {
    if (editingUser?.position && POSITION_MODS[editingUser.position]) {
      setEditingUser(prev => ({ ...prev, modules: POSITION_MODS[editingUser.position] }));
    }
  }, [editingUser?.position]);

  const checkOwnerAndLoadData = async () => {
    if (!store?.id) return;
    setIsLoading(true);
    try {
      const user = await api.auth.me();
      setCurrentUser(user);
      
      const storeData = await api.entities.Store.filter({ id: store.id });
      const currentStore = storeData[0];
      
      const isSuperAdmin = user.email && DEV_EMAILS.includes(user.email.toLowerCase());
      const userIsOwner = currentStore?.owner_user_id === user.id || user.role === 'owner' || isSuperAdmin;
      setIsOwner(userIsOwner);
      
      const allUsers = await api.entities.User.filter({ current_store_id: store.id });
      setUsers(allUsers);

      // Load employees for linking
      try {
        const allEmployees = await api.entities.Employee.filter({ store_id: store.id });
        setEmployees(allEmployees);
      } catch(e) { console.error('Employee load error:', e); }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  };

  const handleInviteUserWA = () => {
    const { name, position, customPosition, role, phone, modules } = inviteForm;
    const finalPosition = position === 'Custom' ? customPosition : position;
    
    if (!name || !finalPosition || !phone) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Harap isi Nama, Jabatan, dan Nomor WA!",
        variant: "destructive"
      });
      return;
    }

    const modulesParam = encodeURIComponent(modules.join(','));
    const authoritiesParam = encodeURIComponent((inviteForm.authorities || []).join(','));
    const limitParam = inviteForm.approval_limit || 0;
    const discountParam = inviteForm.max_discount_limit || 0;
    const regLink = `${window.location.origin}/register?store_id=${store.id}&role=${role}&pos=${encodeURIComponent(finalPosition)}&modules=${modulesParam}&auths=${authoritiesParam}&limit=${limitParam}&discount=${discountParam}&name=${encodeURIComponent(name)}`;
    const message = `Halo ${name},\n\nAnda diundang oleh *${store.store_name}* untuk bergabung ke sistem *Tradixa ERP* dengan posisi sebagai *${finalPosition}*.\n\nSilakan klik tautan di bawah ini untuk menyelesaikan pendaftaran akun Anda:\n${regLink}\n\nSalam,\nManajemen ${store.store_name}`;
    
    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(waUrl, '_blank');
    setShowInviteDialog(false);
    setInviteForm({ name: '', email: '', position: '', role: 'staff', phone: '', modules: [] });
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      modules: user.modules || [],
      authorities: user.authorities || [],
      approval_limit: user.approval_limit || 0,
      max_discount_limit: user.max_discount_limit || 0,
      photo_url: user.photo_url || user.avatar_url || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await api.entities.User.update(editingUser.id, {
        role: editingUser.role,
        position: editingUser.position,
        department: editingUser.department,
        site: editingUser.site,
        full_name: editingUser.full_name,
        phone: editingUser.phone,
        modules: editingUser.modules,
        authorities: editingUser.authorities,
        approval_limit: editingUser.approval_limit,
        max_discount_limit: editingUser.max_discount_limit,
        photo_url: editingUser.photo_url,
        avatar_url: editingUser.photo_url
      });

      // Sync photo to linked HRIS employee
      if (editingUser.photo_url) {
        const empId = editingUser.linked_employee_id || getLinkedEmployee(editingUser)?.id;
        if (empId) {
          try {
            await api.entities.Employee.update(empId, { photo_url: editingUser.photo_url });
          } catch (e) { console.error('Error syncing photo to HRIS:', e); }
        }
      }
      
      // Only update Header avatar if editing the currently logged-in user's own profile
      if (currentUser && editingUser.id === currentUser.id && editingUser.photo_url) {
        window.dispatchEvent(new CustomEvent('avatar_updated', { detail: { avatarUrl: editingUser.photo_url } }));
        // Invalidate auth cache so next api.auth.me() fetches fresh data
        api.auth._currentUser = null;
      }
      
      setShowEditDialog(false);
      setEditingUser(null);
      toast({ title: 'Berhasil', description: 'Data user berhasil diperbarui.' });
      checkOwnerAndLoadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Gagal', description: 'Gagal update user.', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.entities.User.delete(deletingUser.id);
      toast({ title: 'User Dihapus', description: `${deletingUser.full_name || deletingUser.email} berhasil dihapus.` });
      setShowDeleteDialog(false);
      setDeletingUser(null);
      checkOwnerAndLoadData();
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal menghapus user.', variant: 'destructive' });
    }
  };

  const handleSyncPermissions = async () => {
    setIsSaving(true);
    try {
      let synced = 0;
      for (const user of users) {
        let targetMods = [];
        if (user.role === 'admin') {
          targetMods = MODULE_GROUPS.flatMap(g => g.modules);
        } else if (user.position && POSITION_MODS[user.position]) {
          targetMods = POSITION_MODS[user.position];
        }

        if (targetMods.length > 0 && JSON.stringify(user.modules || []) !== JSON.stringify(targetMods)) {
          await api.entities.User.update(user.id, { modules: targetMods });
          synced++;
        }
      }
      toast({ title: 'Sync Selesai', description: `${synced} user telah di-sync permissions-nya berdasarkan role & jabatan.` });
      checkOwnerAndLoadData();
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal sync permissions.', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleLinkEmployees = async () => {
    setIsSaving(true);
    try {
      let linked = 0;
      for (const user of users) {
        const matchedEmp = employees.find(e => 
          e.name?.toLowerCase().trim() === (user.full_name || '').toLowerCase().trim()
        );
        if (matchedEmp && user.linked_employee_id !== matchedEmp.id) {
          await api.entities.User.update(user.id, { linked_employee_id: matchedEmp.id });
          linked++;
        }
      }
      toast({ title: 'Link Selesai', description: `${linked} user berhasil di-link ke data karyawan HRIS.` });
      checkOwnerAndLoadData();
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal link employees.', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const getLinkedEmployee = (user) => {
    if (user.linked_employee_id) {
      const byId = employees.find(e => e.id === user.linked_employee_id);
      if (byId) return byId;
    }
    return employees.find(e => 
      e.name?.toLowerCase().trim() === (user.full_name || '').toLowerCase().trim()
    );
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Terlalu Besar', description: 'Ukuran foto maksimal 2MB.', variant: 'destructive' });
        return;
      }
      setIsUploadingPhoto(true);
      try {
        const result = await api.storage.upload(file, 'profile');
        setEditingUser({...editingUser, photo_url: result.url});
      } catch (error) {
        toast({ title: 'Gagal Upload', description: 'Gagal mengunggah foto.', variant: 'destructive' });
      }
      setIsUploadingPhoto(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'Semua Role' || u.role === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  if (!isOwner && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center text-slate-600">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
            <p className="mb-4 text-sm">Halaman User Management hanya tersedia bagi pemilik toko.</p>
            <Button onClick={() => window.location.href = '/Dashboard'} className="bg-blue-700 hover:bg-blue-600">Kembali ke Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} user terdaftar dalam sistem`}
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 h-11 px-4 rounded-xl border-slate-200" onClick={handleLinkEmployees} disabled={isSaving}>
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> Link Employees
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 h-11 px-4 rounded-xl border-slate-200" onClick={handleSyncPermissions} disabled={isSaving}>
              <Shield className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> Sync Permissions
            </Button>
            <Button 
              onClick={() => {
                const limits = getPlanLimits(store?.plan || 'free');
                const isDev = currentUser?.email === 'dev@tradixa.com';
                
                if (!limits.userManagement && !isDev) {
                  toast({
                    title: "Akses Terbatas",
                    description: "Paket Free tidak mendukung User Management. Silakan upgrade ke Pro.",
                    variant: "destructive"
                  });
                  return;
                }
                const staffCount = users.filter(u => u.id !== store?.owner_user_id).length;
                if (staffCount >= limits.maxUsers && !isDev) {
                  toast({
                    title: "Batas User Tercapai",
                    description: `Paket ${store?.plan} maksimal ${limits.maxUsers} user karyawan. Silakan upgrade paket Anda.`,
                    variant: "destructive"
                  });
                  return;
                }
                setShowInviteDialog(true);
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Undang User
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cari nama atau email..." 
            className="pl-10" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-48 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua Role">Semua Role</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="bg-white"><Download className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="bg-white"><FileText className="w-4 h-4" /></Button>
        </div>
      </div>

      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead >User</TableHead>
                  <TableHead >Role</TableHead>
                  <TableHead >Position</TableHead>
                  <TableHead >Permissions</TableHead>
                  <TableHead >Employee Link</TableHead>
                  <TableHead >Status</TableHead>
                  <TableHead >Dibuat</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-16 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-slate-400">
                      <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      Belum ada user yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center text-slate-400 text-xs font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={
                            `w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm overflow-hidden ` +
                            (user.full_name?.startsWith('A') ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')
                          }>
                            {user.avatar_url || user.photo_url ? (
                              <img src={user.avatar_url || user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
                            ) : (
                              user.full_name ? user.full_name.substring(0, 1) : '?'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{user.full_name || user.username || 'System User'}</p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg w-fit">
                            <Shield className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-700 capitalize">{user.role || 'User'}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-lg w-fit">
                            <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-bold text-amber-700 capitalize">{user.position || (store?.owner_user_id === user.id ? 'Owner' : 'Staff')}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-400">
                             <span className="text-xs font-bold text-slate-600">
                               {user.role === 'admin' || store?.owner_user_id === user.id ? 'Full Access' : `${user.modules?.length || 0} modul`}
                             </span>
                          </div>
                      </TableCell>
                      <TableCell>
                         {(() => {
                           const linkedEmp = getLinkedEmployee(user);
                           return linkedEmp ? (
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">{linkedEmp.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{linkedEmp.position || user.role?.toUpperCase() || 'STAFF'}</span>
                             </div>
                           ) : (
                             <span className="text-xs text-slate-300 italic">No Employee Found</span>
                           );
                         })()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-600 border-none px-2 py-0.5 text-[10px] font-bold">Aktif</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{user.created_at ? moment(user.created_at).format('D/M/YYYY') : '17/4/2026'}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit Role & Data
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setDeletingUser(user); setShowDeleteDialog(true); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
         <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none max-h-[90vh] flex flex-col">
           <div className="bg-slate-50 p-6 border-b shrink-0">
            <h2 className="text-2xl font-bold text-slate-800">Undang User Baru</h2>
            <p className="text-sm text-slate-500">Kirim link pendaftaran aman ke karyawan baru</p>
          </div>
           <div className="p-8 space-y-6 bg-white overflow-y-auto flex-1">
             <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><UserPlus className="w-6 h-6" /></div>
                <div>
                   <h4 className="font-bold text-slate-800">Form Undangan Registrasi</h4>
                   <p className="text-xs text-slate-500">Pilih akses sesuai Role-Based Access Control (RBAC)</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-1.5">
                   <Label>Nama Lengkap Karyawan *</Label>
                   <Input 
                      placeholder="Contoh: Budi Santoso" 
                      value={inviteForm.name}
                      onChange={e => setInviteForm({...inviteForm, name: e.target.value})}
                   />
                </div>

                <div className="space-y-1.5">
                   <Label>Nomor WA Karyawan *</Label>
                   <Input 
                      placeholder="08xxxxxxxxxx" 
                      value={inviteForm.phone}
                      onChange={e => setInviteForm({...inviteForm, phone: e.target.value})}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label>Jabatan (Position) *</Label>
                      <Select value={inviteForm.position} onValueChange={val => setInviteForm({...inviteForm, position: val})}>
                        <SelectTrigger><SelectValue placeholder="Pilih jabatan kerja" /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Manager">Manager</SelectItem>
                           <SelectItem value="Purchasing">Purchasing</SelectItem>
                           <SelectItem value="Warehouse">Warehouse Staff</SelectItem>
                           <SelectItem value="Finance">Finance Officer</SelectItem>
                           <SelectItem value="Operator">Operator Lapangan</SelectItem>
                           <SelectItem value="Mechanic">Mechanic</SelectItem>
                           <SelectItem value="Custom">+ Tambah Jabatan Baru</SelectItem>
                        </SelectContent>
                      </Select>
                      {inviteForm.position === 'Custom' && (
                        <Input 
                          placeholder="Ketik jabatan baru..." 
                          value={inviteForm.customPosition}
                          onChange={e => setInviteForm({...inviteForm, customPosition: e.target.value})}
                          className="mt-2"
                        />
                      )}
                      <p className="text-[10px] text-slate-400 italic">Jabatan ini akan otomatis mengaktifkan modul aplikasi mana saja yang bisa mereka lihat (RBAC)</p>
                   </div>
                   <div className="space-y-1.5">
                      <Label>Sistem Role (Privilege) *</Label>
                      <Select value={inviteForm.role} onValueChange={val => setInviteForm({...inviteForm, role: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="staff">User (Akses Transaksi Terbatas)</SelectItem>
                           <SelectItem value="admin">Admin (Akses Operasional Penuh)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="space-y-1.5 mt-4">
                    <Label>Hak Akses Modul *</Label>
                    <div className="flex gap-2 mb-2">
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                        const allMods = MODULE_GROUPS.flatMap(g => g.modules);
                        setInviteForm({...inviteForm, modules: allMods});
                      }}>Pilih Semua</Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setInviteForm({...inviteForm, modules: []})}>Hapus Semua</Button>
                      <span className="text-xs text-slate-400 ml-auto self-center">{inviteForm.modules.length} modul dipilih</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto border rounded-xl bg-slate-50 p-4 space-y-4">
                      {MODULE_GROUPS.map(group => (
                        <div key={group.category}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.category}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {group.modules.map(mod => (
                              <div key={mod} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`mod-${mod}`} 
                                  checked={inviteForm.modules.includes(mod)} 
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setInviteForm({...inviteForm, modules: [...inviteForm.modules, mod]});
                                    } else {
                                      setInviteForm({...inviteForm, modules: inviteForm.modules.filter(m => m !== mod)});
                                    }
                                  }} 
                                />
                                <label htmlFor={`mod-${mod}`} className="text-xs font-medium leading-none cursor-pointer text-slate-700">{mod}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Pilih modul mana saja yang bisa diakses oleh karyawan ini.</p>
                </div>
             </div>

                 {/* Advanced DoA: Hak Otoritas & Approval */}
                 <div className="space-y-4 pt-4 border-t">
                    <Label>Hak Otoritas & Approval (Advanced DoA)</Label>
                    <div className="bg-slate-50 border rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procurement & Inventory</p>
                          {[
                            { id: 'APPROVE_PR_L1', label: 'Approve PR (Level 1)' },
                            { id: 'APPROVE_PR_L2', label: 'Approve PR (Level 2)' },
                            { id: 'APPROVE_PO', label: 'Approve Purchase Order (PO)' },
                            { id: 'SIGN_GRN', label: 'Tanda Tangan Goods Receipt (GRN)' },
                            { id: 'APPROVE_ADJUSTMENT', label: 'Approve Stock Opname/Adjustment' },
                            { id: 'APPROVE_RETURN', label: 'Approve Supplier Return/Kompensasi' }
                          ].map(auth => (
                            <div key={auth.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`auth-${auth.id}`} 
                                checked={inviteForm.authorities?.includes(auth.id)}
                                onCheckedChange={(checked) => {
                                  const currentAuths = inviteForm.authorities || [];
                                  if (checked) {
                                    setInviteForm({...inviteForm, authorities: [...currentAuths, auth.id]});
                                  } else {
                                    setInviteForm({...inviteForm, authorities: currentAuths.filter(a => a !== auth.id)});
                                  }
                                }}
                              />
                              <label htmlFor={`auth-${auth.id}`} className="text-xs font-medium cursor-pointer text-slate-700">{auth.label}</label>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finance & Keuangan</p>
                          {[
                            { id: 'APPROVE_PAYMENT', label: 'Approve Pembayaran (AP/AR/Kas)' },
                            { id: 'APPROVE_JOURNAL', label: 'Approve Jurnal Manual' }
                          ].map(auth => (
                            <div key={auth.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`auth-${auth.id}`} 
                                checked={inviteForm.authorities?.includes(auth.id)}
                                onCheckedChange={(checked) => {
                                  const currentAuths = inviteForm.authorities || [];
                                  if (checked) {
                                    setInviteForm({...inviteForm, authorities: [...currentAuths, auth.id]});
                                  } else {
                                    setInviteForm({...inviteForm, authorities: currentAuths.filter(a => a !== auth.id)});
                                  }
                                }}
                              />
                              <label htmlFor={`auth-${auth.id}`} className="text-xs font-medium cursor-pointer text-slate-700">{auth.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600">Batas Limit Approval (Rp)</Label>
                          <NumberInput 
                            min="0"
                            placeholder="0 = Unlimited"
                            value={inviteForm.approval_limit}
                            onChange={(e) => setInviteForm({...inviteForm, approval_limit: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                            className="h-9"
                          />
                          <p className="text-[10px] text-slate-400">Batasan nilai dokumen yang bisa di-approve</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600">Max Pemberian Diskon (%)</Label>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0 = Tidak Boleh"
                            value={inviteForm.max_discount_limit}
                            onChange={(e) => setInviteForm({...inviteForm, max_discount_limit: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                            className="h-9"
                          />
                          <p className="text-[10px] text-slate-400">Batas maks persentase diskon saat promosi</p>
                        </div>
                      </div>
                    </div>
                 </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                   </div>
                   <div className="space-y-1.5">
                      <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pendaftaran Tanpa Repot (B2B SaaS Flow)</h5>
                      <ul className="text-[11px] text-slate-600 font-medium space-y-1.5 list-disc ml-4">
                         <li>Sistem akan men-generate URL rahasia (Token Terenkripsi).</li>
                         <li>Karyawan menerima Link CTA pendaftaran di WhatsApp mereka.</li>
                         <li>Karyawan men-set password mereka secara pribadi (Bukan Admin yang buatkan).</li>
                         <li>Setelah mendaftar, mereka langsung divalidasi ke posisi <span className="font-bold text-blue-600">[{inviteForm.position || 'Pilih Jabatan'}]</span> secara aman.</li>
                      </ul>
                   </div>
                </div>
              </div>

             <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowInviteDialog(false)} className="font-bold">Kembali</Button>
                <Button onClick={handleInviteUserWA} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8">
                   <MessageCircle className="w-5 h-5 mr-2" /> Kirim Link Pendaftaran
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Full Edit with photo, role, position, modules */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none">
          <div className="bg-slate-50 p-6 border-b shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit User Role</DialogTitle>
              <DialogDescription>Sesuaikan data dan hak akses untuk {editingUser?.full_name}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
             {/* Photo Upload */}
             <div className="space-y-1.5">
                <Label>Foto Profil</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    ) : editingUser?.photo_url || editingUser?.avatar_url ? (
                      <img src={editingUser.photo_url || editingUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
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

             <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input value={editingUser?.full_name || ''} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} />
             </div>

             <div className="space-y-1.5">
                <Label>Email (Read-only)</Label>
                <Input value={editingUser?.email || ''} readOnly className="bg-slate-50" />
             </div>

             <div className="space-y-1.5">
                <Label>Nomor Telepon</Label>
                <Input value={editingUser?.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} placeholder="08xx-xxxx-xxxx" />
             </div>

             <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={editingUser?.role || 'staff'} onValueChange={val => setEditingUser({...editingUser, role: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="staff">User</SelectItem>
                     <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 italic">Admin: Akses penuh ke semua modul</p>
             </div>

             <div className="space-y-1.5">
                <Label>Position (menentukan permissions)</Label>
                <Select value={editingUser?.position || ''} onValueChange={val => setEditingUser({...editingUser, position: val})}>
                  <SelectTrigger><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="Manager">Manager</SelectItem>
                     <SelectItem value="Purchasing">Purchasing</SelectItem>
                     <SelectItem value="Warehouse">Warehouse Staff</SelectItem>
                     <SelectItem value="Finance">Finance Officer</SelectItem>
                     <SelectItem value="Operator">Operator Lapangan</SelectItem>
                     <SelectItem value="Mechanic">Mechanic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 italic">Permissions akan otomatis di-sync berdasarkan position</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label>Department</Label>
                   <Input value={editingUser?.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} placeholder="e.g., Operations" />
                </div>
                <div className="space-y-1.5">
                   <Label>Site</Label>
                   <Input value={editingUser?.site || ''} onChange={e => setEditingUser({...editingUser, site: e.target.value})} placeholder="-" />
                </div>
             </div>

             {/* Module Access */}
             <div className="space-y-1.5">
                <Label>Hak Akses Modul</Label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                    const allMods = MODULE_GROUPS.flatMap(g => g.modules);
                    setEditingUser({...editingUser, modules: allMods});
                  }}>Pilih Semua</Button>
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setEditingUser({...editingUser, modules: []})}>Hapus Semua</Button>
                  <span className="text-xs text-slate-400 ml-auto self-center">{editingUser?.modules?.length || 0} modul</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto border rounded-xl bg-slate-50 p-3 space-y-3">
                  {MODULE_GROUPS.map(group => (
                    <div key={group.category}>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{group.category}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.modules.map(mod => (
                          <div key={mod} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-mod-${mod}`}
                              checked={editingUser?.modules?.includes(mod)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditingUser({...editingUser, modules: [...(editingUser.modules || []), mod]});
                                } else {
                                  setEditingUser({...editingUser, modules: (editingUser.modules || []).filter(m => m !== mod)});
                                }
                              }}
                            />
                            <label htmlFor={`edit-mod-${mod}`} className="text-[11px] font-medium leading-none cursor-pointer text-slate-700">{mod}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                 </div>
              </div>

             {/* Advanced DoA for Edit User */}
             <div className="space-y-3 pt-3 border-t">
                <Label>Hak Otoritas & Approval</Label>
                <div className="bg-slate-50 border rounded-xl p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procurement</p>
                      {[
                        { id: 'APPROVE_PR_L1', label: 'Approve PR (Level 1)' },
                        { id: 'APPROVE_PR_L2', label: 'Approve PR (Level 2)' },
                        { id: 'APPROVE_PO', label: 'Approve PO' },
                        { id: 'SIGN_GRN', label: 'Tanda Tangan GRN' },
                        { id: 'APPROVE_ADJUSTMENT', label: 'Approve Opname' },
                        { id: 'APPROVE_RETURN', label: 'Approve Return' }
                      ].map(auth => (
                        <div key={auth.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`edit-auth-${auth.id}`} 
                            checked={editingUser?.authorities?.includes(auth.id)}
                            onCheckedChange={(checked) => {
                              const currentAuths = editingUser?.authorities || [];
                              if (checked) {
                                setEditingUser({...editingUser, authorities: [...currentAuths, auth.id]});
                              } else {
                                setEditingUser({...editingUser, authorities: currentAuths.filter(a => a !== auth.id)});
                              }
                            }}
                          />
                          <label htmlFor={`edit-auth-${auth.id}`} className="text-[11px] font-medium text-slate-700">{auth.label}</label>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finance</p>
                      {[
                        { id: 'APPROVE_PAYMENT', label: 'Approve Pembayaran' },
                        { id: 'APPROVE_JOURNAL', label: 'Approve Jurnal' }
                      ].map(auth => (
                        <div key={auth.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`edit-auth-${auth.id}`} 
                            checked={editingUser?.authorities?.includes(auth.id)}
                            onCheckedChange={(checked) => {
                              const currentAuths = editingUser?.authorities || [];
                              if (checked) {
                                setEditingUser({...editingUser, authorities: [...currentAuths, auth.id]});
                              } else {
                                setEditingUser({...editingUser, authorities: currentAuths.filter(a => a !== auth.id)});
                              }
                            }}
                          />
                          <label htmlFor={`edit-auth-${auth.id}`} className="text-[11px] font-medium text-slate-700">{auth.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-600">Limit Approval (Rp)</Label>
                      <NumberInput 
                        min="0" placeholder="0 = Unlimited"
                        value={editingUser?.approval_limit}
                        onChange={(e) => setEditingUser({...editingUser, approval_limit: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-600">Max Diskon (%)</Label>
                      <Input 
                        type="number" min="0" max="100" placeholder="0 = Tidak Boleh"
                        value={editingUser?.max_discount_limit}
                        onChange={(e) => setEditingUser({...editingUser, max_discount_limit: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
             </div>
          </div>
          <div className="p-6 border-t bg-slate-50 shrink-0 flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setShowEditDialog(false)}>Batal</Button>
             <Button onClick={handleUpdateRole} className="bg-blue-700 text-white" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Perubahan
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>Yakin ingin menghapus user <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? Aksi ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Hapus User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Search({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
