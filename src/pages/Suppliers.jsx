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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Pencil, Trash2, Users, Loader2, Upload, X, Truck, Contact } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { getEffectiveLimits } from '@/planConfig';
import { toast as sonnerToast } from 'sonner';

export default function Suppliers({ store }) {
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryGrns, setInventoryGrns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [overpaymentRefs, setOverpaymentRefs] = useState([]);
  const [depositUsageRefs, setDepositUsageRefs] = useState([]);
  const [realAdvanceBalance, setRealAdvanceBalance] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: '', contact_person: '', phone: '', phone_code: '+62', email: '',
    address: '', city: '', npwp: '', payment_terms: '',
    bank_name: '', bank_account: '', status: 'Active', notes: ''
  });

  // Fetch overpayment references, deposit usage & auto-sync advance_balance
  useEffect(() => {
    if (viewingSupplier && store?.id) {
      (async () => {
        try {
          const [payments, payables] = await Promise.all([
            api.entities.InvoicePayment.filter({ store_id: store.id, invoice_type: 'Payable' }),
            api.entities.Payable.filter({ store_id: store.id, supplier_name: viewingSupplier.name })
          ]);
          const refs = [];
          const usageRefs = [];
          let totalOverpayments = 0;
          let totalDepositUsed = 0;

          payables.forEach(inv => {
            const invPayments = payments.filter(p => p.invoice_id === inv.id);
            const nonDepositPayments = invPayments.filter(p => p.payment_method !== 'Deposit');
            const depositPayments = invPayments.filter(p => p.payment_method === 'Deposit');
            
            const totalTransfer = nonDepositPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const depositUsedHere = depositPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const allocated = Number(inv.paid_amount || 0);
            const overpayment = totalTransfer > allocated ? (totalTransfer - allocated) : 0;
            
            totalOverpayments += overpayment;
            totalDepositUsed += depositUsedHere;

            if (overpayment > 0) {
              refs.push({
                invoice_number: inv.invoice_number,
                total_transfer: totalTransfer,
                allocated: allocated,
                overpayment: overpayment,
                date: inv.timestamp_wib || inv.created_date
              });
            }

            // Collect deposit usage entries
            depositPayments.forEach(dp => {
              usageRefs.push({
                invoice_number: inv.invoice_number,
                invoice_amount: Number(inv.amount || 0),
                deposit_used: Number(dp.amount || 0),
                reference: dp.reference,
                date: dp.payment_date || dp.timestamp_wib
              });
            });
          });

          setOverpaymentRefs(refs);
          setDepositUsageRefs(usageRefs);
          const calculatedBalance = Math.max(0, totalOverpayments - totalDepositUsed);
          setRealAdvanceBalance(calculatedBalance);

          // Auto-sync: silently update database if mismatch detected
          const storedBalance = Number(viewingSupplier.advance_balance || 0);
          if (Math.abs(calculatedBalance - storedBalance) > 0) {
            await api.entities.Supplier.update(viewingSupplier.id, { advance_balance: calculatedBalance });
            setViewingSupplier(prev => prev ? { ...prev, advance_balance: calculatedBalance } : prev);
            setSuppliers(prev => prev.map(s => s.id === viewingSupplier.id ? { ...s, advance_balance: calculatedBalance } : s));
          }
        } catch (e) {
          setOverpaymentRefs([]);
          setDepositUsageRefs([]);
          setRealAdvanceBalance(null);
        }
      })();
    } else {
      setOverpaymentRefs([]);
      setDepositUsageRefs([]);
      setRealAdvanceBalance(null);
    }
  }, [viewingSupplier]);

  useEffect(() => {
    if (store?.id) loadSuppliers();
  }, [store]);

  // Listen for global refresh event from Header
  useEffect(() => {
    const handler = () => { if (store?.id) loadSuppliers(); };
    window.addEventListener('refresh_data', handler);
    return () => window.removeEventListener('refresh_data', handler);
  }, [store]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const [suppliersData, grnsData] = await Promise.all([
        api.entities.Supplier.filter({ store_id: store.id }),
        api.entities.InventoryGRN.filter({ store_id: store.id })
      ]);
      setSuppliers(suppliersData);
      setInventoryGrns(grnsData);
    } catch (err) {
      console.error("Failed to load suppliers data", err);
    }
    setIsLoading(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        sonnerToast.error(`Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)}MB melebihi batas maksimal 2MB.`, { duration: 5000 });
        e.target.value = ''; return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // --- SUPPLIER LIMIT CHECK ---
    const limits = getEffectiveLimits(store);
    if (!editingSupplier && limits.maxSuppliers !== Infinity) {
      if (suppliers.length >= limits.maxSuppliers) {
        sonnerToast.error(`Kuota supplier habis (${suppliers.length}/${limits.maxSuppliers}). Upgrade ke Pro Plan untuk menambah kuota.`, { duration: 5000 });
        setIsSaving(false);
        return;
      }
    }
    // ----------------------------

    let imageUrl = editingSupplier?.image_url || '';
    if (imageFile) {
      const _uploadRes = await api.storage.upload(imageFile, 'logo');
      imageUrl = _uploadRes.url;
    }
    const finalPhone = formData.phone ? `${formData.phone_code}${formData.phone.replace(/^0+/, '')}` : '';
    const supplierData = {
      ...formData,
      phone: finalPhone,
      image_url: imageUrl,
      store_id: store.id,
      supplier_code: formData.supplier_code || `SPL-${String(suppliers.length + 1).padStart(5, '0')}`
    };
    if (editingSupplier) {
      await api.entities.Supplier.update(editingSupplier.id, supplierData);
    } else {
      await api.entities.Supplier.create(supplierData);
    }
    setIsSaving(false);
    setShowForm(false);
    setEditingSupplier(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      name: '', type: '', contact_person: '', phone: '', phone_code: '+62', email: '',
      address: '', city: '', npwp: '', payment_terms: '',
      bank_name: '', bank_account: '', status: 'Active', notes: ''
    });
    loadSuppliers();
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setImagePreview(supplier.image_url || null);
    setImageFile(null);

    let pCode = '+62';
    let pNum = supplier.phone || '';
    if (pNum.startsWith('+')) {
      const match = pNum.match(/^(\+\d{1,3})(.*)/);
      if (match) {
        pCode = match[1];
        pNum = match[2];
      }
    } else if (pNum.startsWith('62')) {
      pCode = '+62';
      pNum = pNum.substring(2);
    }

    setFormData({
      name: supplier.name || '',
      type: supplier.type || '',
      contact_person: supplier.contact_person || '',
      phone_code: pCode,
      phone: pNum,
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      npwp: supplier.npwp || '',
      payment_terms: supplier.payment_terms || '',
      bank_name: supplier.bank_name || '',
      bank_account: supplier.bank_account || '',
      status: supplier.status || 'Active',
      notes: supplier.notes || '',
      supplier_code: supplier.supplier_code // preserve the code
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    await api.entities.Supplier.delete(deleteSupplier.id);
    setDeleteSupplier(null);
    loadSuppliers();
  };

  const filteredSuppliers = suppliers.filter(v =>
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Kelola database supplier dan informasi kontak"
        icon={Contact}
        actions={
          <>
            <ExportToolbar
              title="Daftar Suppliers"
              date={new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-suppliers-detailed"
            
            store={store}
          />
            <Button onClick={() => {
              setEditingSupplier(null);
              setImageFile(null);
              setImagePreview(null);
              setFormData({
                name: '', type: '', contact_person: '', phone: '', phone_code: '+62', email: '',
                address: '', city: '', npwp: '', payment_terms: '',
                bank_name: '', bank_account: '', status: 'Active', notes: ''
              });
              setShowForm(true);
            }} className="bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Supplier
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div id="print-suppliers">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center pl-6">No.</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>WhatsApp / Tlp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Saldo Deposit</TableHead>
                  <TableHead className="text-center">Total Order</TableHead>
                  <TableHead className="text-right">Total Pembelian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Tidak ada supplier ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier, idx) => (
                    <TableRow key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center text-slate-400 font-medium pl-6">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {supplier.image_url ? (
                            <img src={supplier.image_url} className="w-9 h-9 rounded-full object-cover border-2 border-slate-100" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                              {supplier.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{supplier.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{supplier.supplier_code || `SPL-${String(idx + 1).padStart(5, '0')}`}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 italic text-sm">{supplier.contact_person || '-'}</TableCell>
                      <TableCell className="font-medium text-slate-700">{supplier.phone || '-'}</TableCell>
                      <TableCell className="text-slate-500 font-medium text-sm">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        {Number(supplier.advance_balance || 0) > 0 ? (
                          <span className="text-sm font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                            Rp {new Intl.NumberFormat('id-ID').format(supplier.advance_balance)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Rp 0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3">
                          {inventoryGrns.filter(g => g.supplier_name === supplier.name).length} Order
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-black text-slate-900">
                          Rp {new Intl.NumberFormat('id-ID').format(
                            inventoryGrns
                              .filter(g => g.supplier_name === supplier.name)
                              .reduce((sum, g) => sum + Number(g.total_amount || 0), 0)
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-none' : 'bg-slate-100 text-slate-700 border-none'}>
                          {supplier.status === 'Active' ? 'Aktif' : 'Non-Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingSupplier(supplier)} className="hover:bg-blue-50 hover:text-blue-600 rounded-xl"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)} className="hover:bg-slate-100 rounded-xl"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteSupplier(supplier)} className="hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Profile Detail Dialog */}
      <Dialog open={!!viewingSupplier} onOpenChange={() => setViewingSupplier(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white border-none rounded-xl">
          {viewingSupplier && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 pt-8 pb-12 relative">
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Supplier Profile</p>
              </div>

              {/* Profile Card overlapping header */}
              <div className="px-8 -mt-8">
                <Card className="border-none shadow-xl rounded-xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      {viewingSupplier.image_url ? (
                        <img src={viewingSupplier.image_url} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" alt="" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                          {viewingSupplier.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h2 className="text-xl font-black text-slate-900">{viewingSupplier.name}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          {viewingSupplier.phone && <span>📞 {viewingSupplier.phone}</span>}
                          {viewingSupplier.email && <span>✉️ {viewingSupplier.email}</span>}
                        </div>
                      </div>
                      <Badge className={viewingSupplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-none font-bold' : 'bg-slate-100 text-slate-700 border-none font-bold'}>
                        {viewingSupplier.status === 'Active' ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kode Supplier</p>
                        <p className="text-sm font-black text-slate-900 font-mono">{viewingSupplier.supplier_code || '-'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipe</p>
                        <p className="text-sm font-black text-slate-900">{viewingSupplier.type || '-'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Deposit</p>
                        <p className={`text-sm font-black ${(realAdvanceBalance !== null ? realAdvanceBalance : Number(viewingSupplier.advance_balance || 0)) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          Rp {new Intl.NumberFormat('id-ID').format(realAdvanceBalance !== null ? Math.max(0, realAdvanceBalance) : (viewingSupplier.advance_balance || 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Content - scrollable */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {/* Supplier Info */}
                <div>
                  <h3 className="text-sm font-black text-slate-800 mb-4">Informasi Supplier</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.contact_person || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kota</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.city || '-'}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.address || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NPWP</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.npwp || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Termin Pembayaran</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.payment_terms ? `${viewingSupplier.payment_terms} hari` : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Bank Info */}
                <div>
                  <h3 className="text-sm font-black text-slate-800 mb-4">Informasi Bank</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Bank</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{viewingSupplier.bank_name || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. Rekening</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{viewingSupplier.bank_account || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Deposit Info with References */}
                {(() => {
                  const displayBalance = realAdvanceBalance !== null ? Math.max(0, realAdvanceBalance) : Number(viewingSupplier.advance_balance || 0);
                  if (displayBalance <= 0 && overpaymentRefs.length === 0 && depositUsageRefs.length === 0) return null;
                  return (
                  <div className="space-y-3">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-amber-900">Saldo Deposit Supplier</h3>
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5">Dihitung real-time & auto-sinkronisasi</p>
                        </div>
                        <p className="text-xl font-black text-amber-600">Rp {new Intl.NumberFormat('id-ID').format(displayBalance)}</p>
                      </div>
                    </div>

                    {/* Overpayment Reference Table - Sumber Deposit */}
                    {overpaymentRefs.length > 0 && (
                      <div className="border border-emerald-200 rounded-xl overflow-hidden">
                        <div className="bg-emerald-50 px-4 py-2.5 flex items-center gap-2">
                          <span className="text-sm">📥</span>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Sumber Deposit (Kelebihan Bayar)</p>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-emerald-50/30">
                              <TableHead className="py-2 text-emerald-800">Invoice</TableHead>
                              <TableHead className="py-2 text-emerald-800">Tanggal</TableHead>
                              <TableHead className="text-right py-2 text-emerald-800">Ditransfer</TableHead>
                              <TableHead className="text-right py-2 text-emerald-800">Dialokasikan</TableHead>
                              <TableHead className="text-right py-2 text-emerald-800">Masuk Deposit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {overpaymentRefs.map((ref, i) => (
                              <TableRow key={i} className="hover:bg-emerald-50/20">
                                <TableCell className="text-xs font-bold text-slate-900 py-2">{ref.invoice_number}</TableCell>
                                <TableCell className="text-[10px] text-slate-500 py-2">{ref.date}</TableCell>
                                <TableCell className="text-xs font-medium text-right text-slate-700 py-2">Rp {new Intl.NumberFormat('id-ID').format(ref.total_transfer)}</TableCell>
                                <TableCell className="text-xs font-medium text-right text-emerald-600 py-2">Rp {new Intl.NumberFormat('id-ID').format(ref.allocated)}</TableCell>
                                <TableCell className="text-xs font-black text-right text-emerald-600 py-2">+Rp {new Intl.NumberFormat('id-ID').format(ref.overpayment)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-emerald-50/50">
                              <TableCell colSpan={4} className="text-[10px] font-black text-emerald-800 py-2">Total Masuk Deposit</TableCell>
                              <TableCell className="text-xs font-black text-right text-emerald-700 py-2">+Rp {new Intl.NumberFormat('id-ID').format(overpaymentRefs.reduce((s, r) => s + r.overpayment, 0))}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Deposit Usage History Table - Penggunaan Deposit */}
                    {depositUsageRefs.length > 0 && (
                      <div className="border border-blue-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                          <span className="text-sm">📤</span>
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Riwayat Penggunaan Deposit</p>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50/30">
                              <TableHead className="py-2 text-blue-800">Invoice Tujuan</TableHead>
                              <TableHead className="py-2 text-blue-800">Tanggal</TableHead>
                              <TableHead className="text-right py-2 text-blue-800">Nilai Hutang</TableHead>
                              <TableHead className="text-right py-2 text-blue-800">Deposit Digunakan</TableHead>
                              <TableHead className="py-2 text-blue-800">Referensi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {depositUsageRefs.map((u, i) => (
                              <TableRow key={i} className="hover:bg-blue-50/20">
                                <TableCell className="text-xs font-bold text-slate-900 py-2">{u.invoice_number}</TableCell>
                                <TableCell className="text-[10px] text-slate-500 py-2">{u.date}</TableCell>
                                <TableCell className="text-xs font-medium text-right text-slate-700 py-2">Rp {new Intl.NumberFormat('id-ID').format(u.invoice_amount)}</TableCell>
                                <TableCell className="text-xs font-black text-right text-blue-600 py-2">-Rp {new Intl.NumberFormat('id-ID').format(u.deposit_used)}</TableCell>
                                <TableCell className="text-[10px] text-slate-400 py-2 font-mono">{u.reference}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50/50">
                              <TableCell colSpan={3} className="text-[10px] font-black text-blue-800 py-2">Total Deposit Terpakai</TableCell>
                              <TableCell className="text-xs font-black text-right text-blue-700 py-2">-Rp {new Intl.NumberFormat('id-ID').format(depositUsageRefs.reduce((s, u) => s + u.deposit_used, 0))}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Notes */}
                {viewingSupplier.notes && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Catatan</p>
                    <p className="text-sm text-slate-700">{viewingSupplier.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-1/3">
                <Label>Foto Supplier</Label>
                <div className="mt-1.5 flex flex-col items-center">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="supplier-image" />
                  {imagePreview ? (
                    <div className="relative w-full aspect-square border rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label htmlFor="supplier-image" className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500 font-medium">Upload Foto</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-2/3 grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Nama Supplier *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" required placeholder="Nama perusahaan" /></div>
                <div><Label>Tipe</Label><Input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="mt-1.5" placeholder="Sparepart" /></div>
                <div><Label>Contact Person</Label><Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="mt-1.5" /></div>
                <div>
                  <Label>Telepon *</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Select value={formData.phone_code} onValueChange={(v) => setFormData({ ...formData, phone_code: v })}>
                      <SelectTrigger className="w-24 bg-slate-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+62">🇮🇩 +62</SelectItem>
                        <SelectItem value="+65">🇸🇬 +65</SelectItem>
                        <SelectItem value="+60">🇲🇾 +60</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+86">🇨🇳 +86</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="812XXXXXX" required />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Tanpa angka 0 di depan jika sudah ada kode negara</p>
                </div>
                <div className="col-span-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Alamat</Label><Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1.5" rows={2} /></div>
                <div><Label>Kota</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="mt-1.5" /></div>
                <div><Label>NPWP</Label><Input value={formData.npwp} onChange={(e) => setFormData({ ...formData, npwp: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Termin Pembayaran (hari)</Label><Input type="number" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} className="mt-1.5" placeholder="30" /></div>
                <div><Label>Nama Bank</Label><Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Nomor Rekening</Label><Input value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} className="mt-1.5" /></div>
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Aktif</SelectItem>
                      <SelectItem value="Inactive">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Catatan</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1.5" rows={2} /></div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Supplier</DialogTitle></DialogHeader>
          <p>Yakin ingin menghapus supplier <strong>{deleteSupplier?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplier(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-suppliers-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Supplier</TableHead>
              <TableHead>Nama Supplier</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>No. Rekening</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-black text-slate-900">{v.supplier_code || '-'}</TableCell>
                <TableCell className="font-bold">{v.name}</TableCell>
                <TableCell>{v.contact_person || '-'}</TableCell>
                <TableCell>{v.phone || '-'}</TableCell>
                <TableCell>{v.email || '-'}</TableCell>
                <TableCell>{v.address || '-'}</TableCell>
                <TableCell>{v.bank_name || '-'}</TableCell>
                <TableCell>{v.bank_account || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
