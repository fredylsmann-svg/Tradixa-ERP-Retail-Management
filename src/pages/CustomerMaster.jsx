import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Loader2, Users, Eye, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ExportToolbar from '@/components/layout/ExportToolbar';
import moment from 'moment';
import PageHeader from '@/components/layout/PageHeader';
import { executeAutomation } from '@/utils/automation';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

export default function CustomerMaster({ store }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    country_code: '+62',
    phone_main: '',
    email: '',
    bank_name: '',
    bank_account: '',
    status: 'Active',
    photo_url: '',
    latitude: null,
    longitude: null,
    place_id: '',
    formatted_address: ''
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address || place.name,
          formatted_address: place.formatted_address || place.name,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          place_id: place.place_id
        }));
      }
    }
  };

  useEffect(() => {
    if (store?.id) loadCustomers();
  }, [store]);

  const loadCustomers = async () => {
    const data = await api.entities.Customer.filter({ store_id: store.id }, '-created_date');
    setCustomers(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Combine country code and main number
    const finalPhone = `${formData.country_code}${formData.phone_main}`;
    const { country_code, phone_main, ...restData } = formData;
    const customerData = { ...restData, phone: finalPhone, store_id: store.id };

    if (editingCustomer) {
      await api.entities.Customer.update(editingCustomer.id, customerData);
    } else {
      const newCustomer = await api.entities.Customer.create(customerData);
      // Pemicu Automasi: New Customer
      executeAutomation(store.id, 'New Customer', newCustomer);
    }

    setIsSaving(false);
    setShowForm(false);
    setEditingCustomer(null);
    setFormData({ name: '', address: '', phone: '', country_code: '+62', phone_main: '', email: '', bank_name: '', bank_account: '', status: 'Active', photo_url: '', latitude: null, longitude: null, place_id: '', formatted_address: '' });
    loadCustomers();
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    
    // Parse phone number
    let cCode = '+62';
    let pMain = customer.phone || '';
    
    const codes = ['+62', '+65', '+60', '+1', '+44', '+61', '+86', '+81'];
    for (const code of codes) {
      if (customer.phone?.startsWith(code)) {
        cCode = code;
        pMain = customer.phone.substring(code.length);
        break;
      }
    }

    setFormData({
      name: customer.name,
      address: customer.address || '',
      phone: customer.phone || '',
      country_code: cCode,
      phone_main: pMain,
      email: customer.email || '',
      bank_name: customer.bank_name || '',
      bank_account: customer.bank_account || '',
      status: customer.status,
      photo_url: customer.photo_url || '',
      latitude: customer.latitude || null,
      longitude: customer.longitude || null,
      place_id: customer.place_id || '',
      formatted_address: customer.formatted_address || ''
    });
    setShowForm(true);
  };
  
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const res = await api.storage.upload(file);
      setFormData(prev => ({ ...prev, photo_url: res.url }));
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus customer ini?')) {
      await api.entities.Customer.delete(id);
      loadCustomers();
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Master"
        subtitle="Kelola data pelanggan"
        icon={Users}
        actions={
          <>
            <ExportToolbar 
              title="Daftar Master Pelanggan" 
              date={moment().format('DD MMMM YYYY')} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-customers-detailed" 
            />
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Customer
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada customer
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell className="text-slate-400 font-bold">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {customer.photo_url ? (
                          <img src={customer.photo_url} className="w-8 h-8 rounded-full object-cover border" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.address}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>
                      {customer.bank_name ? (
                        <div className="text-sm">
                          <p className="font-medium">{customer.bank_name}</p>
                          <p className="text-slate-500">{customer.bank_account}</p>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`${createPageUrl('CustomerProfile')}?id=${customer.id}`}>
                          <Button variant="ghost" size="icon" title="View Profile">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent 
          className="max-w-xl"
          onInteractOutside={(e) => {
            if (e.target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-6">
              <div 
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : formData.photo_url ? (
                    <img src={formData.photo_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 group-hover:bg-blue-100">
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-500 uppercase tracking-wider">Upload Foto</span>
                    </>
                  )}
                </div>
                
                {formData.photo_url && !isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>
            <div>
              <Label>Nama Customer *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="mt-1.5" required />
            </div>
            <div>
              <Label>Alamat</Label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <Input 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    className="mt-1.5" 
                    placeholder="Ketik alamat untuk pencarian otomatis..." 
                  />
                </Autocomplete>
              ) : (
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  className="mt-1.5" 
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nomor Kontak</Label>
                <div className="flex gap-2 mt-1.5">
                  <Select 
                    value={formData.country_code || '+62'} 
                    onValueChange={(v) => setFormData({...formData, country_code: v})}
                  >
                    <SelectTrigger className="w-[100px] h-11 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+62">🇮🇩 +62</SelectItem>
                      <SelectItem value="+65">🇸🇬 +65</SelectItem>
                      <SelectItem value="+60">🇲🇾 +60</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      <SelectItem value="+86">🇨🇳 +86</SelectItem>
                      <SelectItem value="+81">🇯🇵 +81</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="812XXXXX"
                    value={formData.phone_main || ''} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('0')) val = val.substring(1);
                      setFormData({...formData, phone_main: val});
                    }} 
                    className="h-11" 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Pilih kode negara dan masukkan nomor (tanpa angka 0 di depan)</p>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Bank</Label>
                <Input value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} className="mt-1.5" />
              </div>
              <div>
                <Label>Nomor Rekening</Label>
                <Input value={formData.bank_account} onChange={(e) => setFormData({...formData, bank_account: e.target.value})} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-customers-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pelanggan</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>No. Rekening</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-bold">{c.name}</TableCell>
                <TableCell>{c.address || '-'}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.bank_name || '-'}</TableCell>
                <TableCell>{c.bank_account || '-'}</TableCell>
                <TableCell>{c.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
