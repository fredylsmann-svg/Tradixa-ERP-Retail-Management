import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, X, Plus, LayoutGrid, Package, Eye, Send, FileText, Settings, PlusCircle, Save, CheckCircle2, XCircle, ShoppingCart, UserCircle, Calendar, Search, Building2, Loader2, Clock, ClipboardList, FileInput, HelpCircle, Calculator, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import moment from 'moment';
import 'moment/locale/id';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';

const COMMON_UNITS = ['pcs', 'box', 'kg', 'gram', 'meter', 'liter', 'roll', 'paket', 'sak', 'bal', 'lusin'];

export default function PurchaseRequisition({ store }) {
  const { toast } = useToast();
  const [prs, setPrs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingPr, setViewingPr] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showItemMaster, setShowItemMaster] = useState(false);
  const [itemProducts, setItemProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemDetails, setItemDetails] = useState({}); // {productId: {qty, price, justification}}
  const [itemPrDate, setItemPrDate] = useState(moment().add(7, 'days').format('YYYY-MM-DD'));
  const [itemPrNote, setItemPrNote] = useState('');
  const [itemPrPriority, setItemPrPriority] = useState('Normal');
  const [itemPrDept, setItemPrDept] = useState('');
  const [categories, setCategories] = useState([
    'Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Kesehatan',
    'Kecantikan', 'Rumah Tangga', 'Alat Tulis', 'Rokok', 'Sembako', 'Lainnya'
  ]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState({}); // {itemIndex: boolean}

  const [approvalComment, setApprovalComment] = useState('');
  const [isConditional, setIsConditional] = useState(false);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [itemIncludeTax, setItemIncludeTax] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');

  const { selectedDate, formattedDate } = useGlobalDate();

  const [formData, setFormData] = useState({
    department: '',
    days_needed: '7',
    priority: 'Normal',
    justification: '',
    include_tax: false,
    items: [{ product_id: '', description: '', category: '', qty: 1, unit: 'pcs', price: 0 }]
  });

  useEffect(() => {
    if (store?.id) {
      loadPrs();
      loadHRISData();
      loadCurrentUser();
      loadProducts();
    }
  }, [store]);

  const loadProducts = async () => {
    const data = await api.entities.Product.filter({ store_id: store.id });
    setItemProducts(data);
    const productCats = data.map(p => p.category).filter(Boolean);
    setCategories(prev => [...new Set([...prev, ...productCats])]);
  };

  const loadCurrentUser = async () => {
    const user = await api.auth.me();
    setCurrentUser(user);
  };

  const loadHRISData = async () => {
    try {
      const emps = await api.entities.Employee.filter({ store_id: store.id });
      const depts = [...new Set(emps.map(e => e.department).filter(Boolean))];
      setDepartments(depts);
      if (depts.length > 0 && !itemPrDept) {
        setItemPrDept(depts[0]);
      }
    } catch (err) {
      console.error("Failed to load HRIS depts", err);
    }
  };

  const loadPrs = async () => {
    // Assuming "PurchaseRequisition" entity exists in local mock or using a generic fallback.
    const data = await api.entities.PurchaseRequisition?.filter({ store_id: store.id }, '-created_date') || [];
    setPrs(data);
    setIsLoading(false);
  };

  const currentPrs = prs.filter(pr => {
    const isDateMatch = matchesDate(pr, selectedDate);
    const isStatusMatch = statusFilter === 'Semua Status' || pr.status === statusFilter;
    const isSearchMatch = !searchTerm ||
      pr.pr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requester?.toLowerCase().includes(searchTerm.toLowerCase());
    return isDateMatch && isStatusMatch && isSearchMatch;
  });

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
  };

  const subtotal = calculateSubtotal();
  const tax = formData.include_tax ? subtotal * 0.11 : 0; // 11% PPN (Optional)
  const grandTotal = subtotal + tax;

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', description: '', category: '', qty: 1, unit: 'pcs', price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const getCurrentTimeWIB = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 60 * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async (status) => {
    if (!formData.department || formData.items.length === 0) return;
    setIsSaving(true);

    const prNumber = `PR-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    try {
      if (api.entities.PurchaseRequisition) {
        await api.entities.PurchaseRequisition.create({
          store_id: store.id,
          pr_number: prNumber,
          department: formData.department,
          priority: formData.priority,
          days_needed: Number(formData.days_needed),
          justification: formData.justification,
          items: formData.items,
          subtotal,
          tax_amount: tax,
          total_amount: grandTotal,
          status, // 'Draft' or 'Diajukan'
          requester: currentUser?.full_name || store?.owner_name || 'Administrator',
          timestamp_wib: getCurrentTimeWIB()
        });
      }
    } catch (err) {
      console.error("Failed to create PR", err);
    }

    setFormData({
      department: '', days_needed: '7', priority: 'Normal',
      justification: '', items: [{ product_id: '', description: '', category: '', qty: 1, unit: 'pcs', price: 0 }]
    });
    setShowForm(false);
    setIsSaving(false);
    loadPrs();
  };

  const toggleItemSelection = (prod) => {
    if (selectedItems.find(i => i.id === prod.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== prod.id));
    } else {
      setSelectedItems([...selectedItems, prod]);
      setItemDetails({
        ...itemDetails,
        [prod.id]: { qty: 1, price: prod.buy_price || prod.price || 0, justification: '' }
      });
    }
  };

  const handleCreateFromMaster = async () => {
    if (selectedItems.length === 0) return;
    setIsSaving(true);
    try {
      const prNumber = `PR-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const items = selectedItems.map(prod => ({
        product_id: prod.id,
        sku: prod.sku || '',
        description: prod.name,
        category: prod.category || 'Uncategorized',
        qty: Number(itemDetails[prod.id]?.qty || 1),
        unit: prod.uom || prod.unit || 'pcs',
        price: Number(itemDetails[prod.id]?.price || 0),
        justification: itemDetails[prod.id]?.justification || 'Auto-generated PR from Item Master'
      }));

      const subtotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
      const tax_amount = itemIncludeTax ? subtotal * 0.11 : 0;

      await api.entities.PurchaseRequisition.create({
        store_id: store.id,
        pr_number: prNumber,
        department: itemPrDept,
        priority: itemPrPriority,
        days_needed: moment(itemPrDate).diff(moment(), 'days'),
        date_required: itemPrDate,
        justification: itemPrNote,
        items,
        subtotal,
        tax_amount,
        total_amount: subtotal + tax_amount,
        status: 'Diajukan',
        requester: currentUser?.full_name || store?.owner_name || 'Administrator',
        created_at: new Date().toISOString(),
        converted_to_po: false,
        timestamp_wib: getCurrentTimeWIB()
      });

      setShowItemMaster(false);
      setSelectedItems([]);
      setItemDetails({});
      setItemPrNote('');
      loadPrs();
    } catch (err) {
      console.error("Failed to create PR from master", err);
    }
    setIsSaving(false);
  };

  const currentInventoryDepts = departments.length > 0 ? departments : ['Inventory'];

  const handleUpdateStatus = async (prId, newStatus) => {
    setIsApproving(true);
    try {
      if (api.entities.PurchaseRequisition) {
        const existingPr = prs.find(p => p.id === prId);
        const currentLevel = (existingPr.approval_history?.length || 0) + 1;

        const approverName = currentUser?.full_name || currentUser?.name || currentUser?.email || 'Administrator';
        const approverRole = currentUser?.position || currentUser?.role || 'Staff';
        const formattedApprover = `${approverName} (${approverRole})`;

        const historyItem = {
          level: currentLevel,
          user_id: currentUser?.id,
          approver: formattedApprover,
          action: newStatus,
          timestamp: getCurrentTimeWIB(),
          comment: approvalComment,
          is_conditional: isConditional,
          delegated_to: delegateEmail
        };

        const newHistory = [...(existingPr.approval_history || []), historyItem];

        let finalStatus = existingPr.status;
        if (newStatus === 'Rejected') {
          finalStatus = 'Ditolak';
        } else if (newStatus === 'Approved') {
          if (currentLevel === 1) {
            finalStatus = 'Menunggu Level 2';
          } else {
            finalStatus = 'Disetujui';
          }
        }

        await api.entities.PurchaseRequisition.update(prId, {
          status: finalStatus,
          approved_by: formattedApprover,
          approved_at: getCurrentTimeWIB(),
          approval_history: newHistory
        });

        // Reset approval form
        setApprovalComment('');
        setIsConditional(false);
        setDelegateEmail('');

        await loadPrs();
        setViewingPr(null);
        toast({
          title: newStatus === 'Approved' ? '✅ PR Disetujui' : '❌ PR Ditolak',
          description: `Purchase Requisition telah berhasil ${newStatus === 'Approved' ? 'disetujui' : 'ditolak'}.`
        });
      }
    } catch (err) {
      console.error("Status update error", err);
      toast({ title: 'Gagal', description: 'Gagal memperbarui status PR. Coba lagi.', variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };


  const getApprovalStatus = () => {
    if (!currentUser) return { allowed: false, reason: 'Not loaded' };

    // Owner can always approve everything (Absolute Bypass)
    if (currentUser.role === 'owner') return { allowed: true };

    // Segregation of Duties: Prevent the same user from approving multiple levels
    const currentUserId = currentUser?.id;
    const approverName = currentUser?.full_name || currentUser?.email;
    if (viewingPr && viewingPr.approval_history && currentUserId) {
      const alreadyApproved = viewingPr.approval_history.some(h =>
        h.user_id === currentUserId || (h.approver && approverName && h.approver.includes(approverName))
      );
      if (alreadyApproved) {
        return { allowed: false, reason: 'already_approved' };
      }
    }


    // Check dynamic authorities based on current approval level (Enterprise DoA)
    const currentLevel = (viewingPr?.approval_history?.length || 0) + 1;
    const requiredAuthority = currentLevel === 1 ? 'APPROVE_PR_L1' : 'APPROVE_PR_L2';

    // We also fallback to 'APPROVE_PR' to maintain compatibility if anyone has the old tag
    const hasAuthority = currentUser.authorities?.includes(requiredAuthority) || currentUser.authorities?.includes('APPROVE_PR') || currentUser.role === 'admin';
    if (!hasAuthority) return { allowed: false, reason: 'no_authority' };

    // Check Nominal Limit (0 = Unlimited)
    if (currentUser.approval_limit > 0 && viewingPr && viewingPr.total_amount > currentUser.approval_limit) {
      return { allowed: false, reason: 'exceeds_limit' };
    }

    return { allowed: true };
  };

  if (showForm) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Buat Purchase Requisition</h1>
            <p className="text-sm text-slate-500">Ajukan permintaan pembelian divisi Anda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 grid grid-cols-2 gap-4">
                <div>
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={v => setFormData({ ...formData, department: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih Dept (dari HRIS)" /></SelectTrigger>
                    <SelectContent>
                      {departments.length > 0 ? (
                        departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)
                      ) : (
                        <SelectItem value="General">General</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dibutuhkan dalam (hari)</Label>
                  <NumberInput min="1" value={formData.days_needed} onChange={e => setFormData({ ...formData, days_needed: e.target.value })} className="mt-1.5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4 pb-2">
                <CardTitle className="text-base">Item yang Dibutuhkan</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="w-4 h-4 mr-2" /> Tambah</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[800px]">
                    <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">
                      <div className="col-span-3 flex items-center gap-2"><Package className="w-3 h-3" /> Deskripsi / Barang</div>
                      <div className="col-span-3 flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Kategori</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2">Satuan</div>
                      <div className="col-span-2 text-right pr-4">Est. Harga</div>
                      <div className="col-span-1"></div>
                    </div>
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white md:bg-transparent p-4 md:p-1 rounded-xl border border-slate-100 md:border-none mb-2 md:mb-0 relative group items-center">
                        <div className="col-span-1 md:col-span-3 space-y-1.5">
                          <Label className="md:hidden text-xs mb-1 block font-bold text-slate-600">Deskripsi / Pilih Produk</Label>
                          <div className="relative group">
                            <Input
                              placeholder="Ketik nama barang..."
                              value={item.description}
                              onChange={e => handleItemChange(idx, 'description', e.target.value)}
                              className="pr-10 h-10 border-slate-200 focus:border-blue-500 focus:ring-blue-100 transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <ShoppingCart className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                          </div>

                          {/* Quick Suggestions from Master */}
                          {item.description.length > 1 && !item.product_id && (
                            <div className="absolute z-50 mt-1 w-[300px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto">
                              <div className="p-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Hasil Master Produk</div>
                              {itemProducts.filter(p => p.name?.toLowerCase().includes(item.description.toLowerCase())).length > 0 ? (
                                itemProducts.filter(p => p.name?.toLowerCase().includes(item.description.toLowerCase())).map(p => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      const newItems = [...formData.items];
                                      newItems[idx] = {
                                        ...newItems[idx],
                                        product_id: p.id,
                                        sku: p.sku || '',
                                        description: p.name,
                                        category: p.category || '',
                                        unit: p.uom || p.unit || 'pcs',
                                        price: p.buy_price || 0
                                      };
                                      setFormData({ ...formData, items: newItems });
                                    }}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                  >
                                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                      <span>SKU: {p.sku || '-'}</span>
                                      <span className="text-blue-600">Rp {formatCurrency(p.buy_price)}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-xs text-slate-400 italic">Produk tidak ditemukan. Lanjutkan sebagai barang baru.</div>
                              )}
                            </div>
                          )}

                          {item.product_id && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg w-fit mt-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Terhubung ke Master</span>
                              <button
                                onClick={() => {
                                  const newItems = [...formData.items];
                                  newItems[idx].product_id = '';
                                  setFormData({ ...formData, items: newItems });
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-600 ml-1 underline"
                              >
                                Lepas
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="col-span-1 md:col-span-3">
                          <Label className="md:hidden text-xs mb-1 block font-bold text-slate-600">Kategori</Label>
                          {showNewCategoryInput[idx] ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                placeholder="Kategori baru..."
                                value={item.category}
                                onChange={e => handleItemChange(idx, 'category', e.target.value)}
                                className="h-10 text-xs border-blue-200 bg-blue-50/30"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowNewCategoryInput({ ...showNewCategoryInput, [idx]: false })}
                                className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center">
                              <Select
                                value={item.category}
                                onValueChange={v => handleItemChange(idx, 'category', v)}
                              >
                                <SelectTrigger className="h-10 text-xs border-slate-200">
                                  <SelectValue placeholder="Pilih Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowNewCategoryInput({ ...showNewCategoryInput, [idx]: true })}
                                    className="h-10 w-10 shrink-0 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 rounded-xl border-slate-200 shadow-xl" align="end">
                                  <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                                    <PlusCircle className="w-3.5 h-3.5 text-blue-500" />
                                    Kategori Baru
                                  </p>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">
                                    Klik untuk menambahkan kategori barang baru jika tidak ada di daftar pilihan.
                                  </p>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>

                        <div className="col-span-1 md:col-span-1">
                          <Label className="md:hidden text-xs mb-1 block font-bold text-slate-600">Qty</Label>
                          <NumberInput
                            min="1"
                            value={item.qty}
                            onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                            className="h-10 text-center font-bold border-slate-200"
                          />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <Label className="md:hidden text-xs mb-1 block font-bold text-slate-600">Satuan</Label>
                          <Select
                            value={COMMON_UNITS.includes(item.unit) ? item.unit : (item.unit ? 'Lain-lain' : '')}
                            onValueChange={v => {
                              if (v === 'Lain-lain') {
                                handleItemChange(idx, 'unit', '');
                              } else {
                                handleItemChange(idx, 'unit', v);
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 border-slate-200 text-xs"><SelectValue placeholder="Satuan" /></SelectTrigger>
                            <SelectContent>
                              {COMMON_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              <SelectItem value="Lain-lain">Lain-lain...</SelectItem>
                            </SelectContent>
                          </Select>
                          {!COMMON_UNITS.includes(item.unit) && (
                            <Input
                              placeholder="Satuan..."
                              value={item.unit}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              className="mt-1.5 h-10 border-blue-100 bg-blue-50/20"
                            />
                          )}
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <Label className="md:hidden text-xs mb-1 block font-bold text-slate-600">Harga (Rp)</Label>
                          <div className="relative">
                            <NumberInput
                              min="0"
                              value={item.price}
                              onChange={e => handleItemChange(idx, 'price', e.target.value)}
                              className="h-10 pl-7 text-right font-bold border-slate-200 focus:bg-white transition-all"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-1 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg h-9 w-9 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Label>Justifikasi Keseluruhan *</Label>
                <Textarea placeholder="Jelaskan alasan kebutuhan pembelian ini secara detail..." className="mt-1.5" rows={4} value={formData.justification} onChange={e => setFormData({ ...formData, justification: e.target.value })} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Ringkasan PR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
                  <Checkbox
                    id="include_tax"
                    checked={formData.include_tax}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_tax: checked })}
                  />
                  <Label htmlFor="include_tax" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    Kenakan PPN 11%
                  </Label>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">Rp {formatCurrency(subtotal)}</span>
                </div>
                {formData.include_tax && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">+ PPN 11%</span>
                    <span className="font-medium text-slate-800">Rp {formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800 uppercase tracking-tighter">TOTAL ESTIMASI</span>
                  <span className="text-xl font-black text-slate-900">Rp {formatCurrency(grandTotal)}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
                  <p className="text-xs font-semibold text-slate-800 mb-1 uppercase tracking-wider">Approval Flow:</p>
                  <p className="text-xs text-slate-600">• Level 1 (Supervisor)</p>
                  <p className="text-xs text-slate-600">• Level 2 (Finance / Manager)</p>
                </div>

                <div className="space-y-2 pt-4">
                  <Button variant="outline" className="w-full h-11" onClick={() => handleSubmit('Draft')} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" /> Simpan sebagai Draft
                  </Button>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-bold" onClick={() => handleSubmit('Diajukan')} disabled={isSaving || !formData.department}>
                    <Send className="w-4 h-4 mr-2" /> Submit untuk Approval
                  </Button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">PR akan dikirim ke email atasan untuk ditinjau</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requisition"
        subtitle="Ajukan dan filter permohonan PR"
        icon={FileInput}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowItemMaster(true)} className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl h-11 px-6">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buat PR dari Item Master
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl h-11 px-6">
              <Plus className="w-4 h-4 mr-2" />
              Buat PR Baru
            </Button>
          </>
        }
      />
      <PageDatePicker />

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nomor PR atau pemohon..."
            className="pl-10 h-11 bg-white border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] h-11 bg-white border-slate-200">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua Status">Semua Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Menunggu Level 2">Menunggu Level 2</SelectItem>
            <SelectItem value="Disetujui">Disetujui</SelectItem>
            <SelectItem value="PO Created">PO Created</SelectItem>
            <SelectItem value="Ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead className="w-64 pl-6">PR Number</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead className="text-right">Total Est.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
              ) : currentPrs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada pengajuan (PR) pada periode ini
                  </TableCell>
                </TableRow>
              ) : (
                currentPrs.map((pr, idx) => (
                  <TableRow key={pr.id}>
                    <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800 whitespace-nowrap" title={pr.pr_number}>{pr.pr_number}</div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {pr.timestamp_wib ? moment(pr.timestamp_wib.split(' ')[0], 'DD/MM/YYYY').locale('id').format('dddd, DD MMMM YYYY') : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">{pr.requester || store.owner_name || 'Administrator'}</div>
                      <div className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
                        {pr.requester === store?.owner_name ? (store?.owner_position || 'Owner') : (pr.department === 'General' && pr.requester === store?.owner_name ? 'Owner' : pr.department || 'Purchasing')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={pr.priority === 'High' || pr.priority === 'Tinggi (Urgent)' ? 'text-red-600 border-red-200 bg-red-50' : ''}>
                        {pr.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">Rp {formatCurrency(pr.total_amount)}</TableCell>
                    <TableCell>
                      <Badge className={
                        pr.status === 'Draft' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          pr.status === 'Diajukan' ? 'bg-blue-600 text-white border-slate-900 font-bold' :
                            pr.status === 'Menunggu Level 2' ? 'bg-amber-100 text-amber-700 border-amber-200 font-bold' :
                              pr.status === 'Disetujui' || pr.status === 'Approved' ? 'bg-emerald-600 text-white border-emerald-600 font-bold' :
                                pr.status === 'Ditolak' || pr.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                  pr.status === 'PO Dibuat' || pr.status === 'PO Created' ? 'bg-blue-600 text-white border-blue-600' :
                                    'bg-amber-100 text-amber-700 border-amber-200'
                      } variant="outline">
                        {pr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setViewingPr(pr)} className="rounded-full hover:bg-slate-100">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewingPr} onOpenChange={() => setViewingPr(null)}>
        <DialogContent hideFullscreen={true} className="max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col">
          {viewingPr && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-6 pr-14 border-b bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Purchase Requisition {viewingPr.pr_number}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{viewingPr.timestamp_wib}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={viewingPr.priority === 'Tinggi (Urgent)' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50'}>
                    {viewingPr.priority}
                  </Badge>
                  <Badge className={
                    viewingPr.status === 'Diajukan' ? 'bg-blue-600 text-white border-slate-900 font-bold' :
                      viewingPr.status === 'Menunggu Level 2' ? 'bg-amber-500 text-white border-amber-500 font-bold' :
                        viewingPr.status === 'Disetujui' ? 'bg-emerald-600 text-white border-emerald-600 font-bold' :
                          viewingPr.status === 'Ditolak' ? 'bg-red-600 text-white border-red-600' :
                            viewingPr.status === 'PO Dibuat' || viewingPr.status === 'PO Created' ? 'bg-blue-600 text-white border-blue-600' :
                              'bg-amber-600 text-white border-amber-600'
                  } variant="outline">
                    {viewingPr.status}
                  </Badge>
                </div>
              </div>

              {/* Main Layout: Split View */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 border-r bg-slate-50/30">
                  {/* Info Pemohon */}
                  <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">Informasi Pemohon</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserCircle className="w-5 h-5" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Diminta Oleh</p>
                          <p className="font-semibold text-slate-800">{viewingPr.requester || 'Administrator'}</p>
                          <p className="text-xs text-slate-500 uppercase font-medium">
                            {viewingPr.requester === store?.owner_name ? (store?.owner_position || 'Owner') : (viewingPr.department || 'Purchasing')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Calendar className="w-5 h-5" /></div>
                        <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanggal Dibutuhkan</p><p className="font-semibold text-slate-800">{viewingPr.date_required ? moment(viewingPr.date_required).format('dddd, D MMMM YYYY') : `H+ ${viewingPr.days_needed} Hari`}</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Item yang Diminta</h3>
                    <Table className="border rounded-xl">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead >Deskripsi</TableHead>
                          <TableHead >Kategori</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Estimasi Harga</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingPr.items?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-slate-700 text-sm">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline" className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                {item.category || 'Uncategorized'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.qty} {item.unit}</TableCell>
                            <TableCell className="text-right text-sm">Rp {formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900 border-l font-mono text-sm">Rp {formatCurrency(item.qty * item.price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex flex-col items-end gap-1 pt-2">
                      <div className="flex justify-between w-48 text-xs text-slate-400"><p>Subtotal</p><p className="font-mono">Rp {formatCurrency(viewingPr.subtotal)}</p></div>
                      <div className="flex justify-between w-48 text-lg font-bold text-slate-800"><p>Total</p><p className="font-mono text-slate-900 tracking-tight">Rp {formatCurrency(viewingPr.total_amount)}</p></div>
                    </div>
                  </div>

                  {/* Catatan */}
                  {viewingPr.justification && (
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
                      <h3 className="text-sm font-bold text-slate-800">Catatan</h3>
                      <p className="text-sm text-slate-600 leading-relaxed italic">{viewingPr.justification}</p>
                    </div>
                  )}
                </div>

                {/* Right Panel: Approval Sidebar */}
                <div className="w-[380px] bg-white p-8 space-y-8 overflow-y-auto border-l shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
                  {/* Approval Form */}
                  {(viewingPr.status === 'Diajukan' || viewingPr.status === 'Menunggu Level 2') && getApprovalStatus().reason !== 'no_authority' && (
                    <div className="bg-blue-600 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                      <h3 className="text-white font-bold flex items-center gap-2 tracking-tight text-base">
                        Atur Persetujuan PR - Level {(viewingPr.approval_history?.length || 0) + 1}
                      </h3>

                      {getApprovalStatus().reason === 'already_approved' ? (
                        <div className="bg-white p-4 rounded-xl text-slate-700 font-bold text-sm text-center shadow-inner border-2 border-slate-100">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          Tugas Selesai
                          <p className="text-xs text-slate-500 font-medium mt-1">Anda sudah menyetujui dokumen ini di level sebelumnya. Menunggu level selanjutnya.</p>
                        </div>
                      ) : getApprovalStatus().reason === 'exceeds_limit' ? (
                        <div className="bg-white p-4 rounded-xl text-red-600 font-bold text-sm text-center shadow-inner border-2 border-red-100">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                          Melebihi Batas Otoritas!
                          <p className="text-xs text-slate-600 font-medium mt-1">Nilai dokumen melebihi limit approval Anda (Max: Rp {formatCurrency(currentUser.approval_limit)}).</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 text-white">
                            <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-400">Catatan/Alasan (Opsional)</Label><Textarea placeholder="Berikan alasan jika menolak..." value={approvalComment} onChange={e => setApprovalComment(e.target.value)} className="bg-blue-700 border-slate-700 h-24 text-white placeholder:text-slate-500" /></div>

                            <div className="flex items-center space-x-2">
                              <Checkbox id="conditional" checked={isConditional} onCheckedChange={setIsConditional} className="border-slate-500 data-[state=checked]:bg-white data-[state=checked]:text-slate-900" />
                              <label htmlFor="conditional" className="text-xs font-medium leading-none text-slate-400 italic">Setujui dengan syarat tertentu</label>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 h-11 font-bold shadow-sm" onClick={() => handleUpdateStatus(viewingPr.id, 'Approved')} disabled={isApproving}>
                              {isApproving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                              Setujui
                            </Button>
                            <Button variant="destructive" className="h-11 font-bold shadow-sm" onClick={() => handleUpdateStatus(viewingPr.id, 'Rejected')} disabled={isApproving}>
                              {isApproving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                              Tolak
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Status Approval History */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Status Approval</h3>
                    <div className="space-y-4">
                      {viewingPr.approval_history && viewingPr.approval_history.length > 0 ? (
                        viewingPr.approval_history.map((h, i) => (
                          <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                            {i < viewingPr.approval_history.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-100" />}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${h.action === 'Approved' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                              {h.action === 'Approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="pt-0.5">
                              <p className="text-sm font-bold text-slate-800">Level {h.level}</p>
                              <p className="text-xs text-slate-600">{h.approver}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{h.timestamp}</p>
                              {h.comment && <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded mt-2 px-3">"{h.comment}"</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-50 rounded-2xl">Belum ada approval</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                <Button variant="outline" onClick={() => setViewingPr(null)}>Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Master Dialog */}
      <Dialog open={showItemMaster} onOpenChange={setShowItemMaster}>
        <DialogContent hideFullscreen={true} className="max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b flex-shrink-0">
            <DialogTitle>Buat PR Berdasarkan Item Master</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Department</Label>
                <Select value={itemPrDept} onValueChange={setItemPrDept}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500 uppercase font-bold">Priority</Label><Select value={itemPrPriority} onValueChange={setItemPrPriority}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="Emergency">Emergency</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs text-slate-500">Tanggal Dibutuhkan</Label><Input type="date" className="h-9" value={itemPrDate} onChange={e => setItemPrDate(e.target.value)} /></div>
            </div>

            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cari Kode atau Nama Item..." className="pl-10 h-10 border-slate-200 focus:ring-slate-500" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-xl bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-64 pl-6">PR Number</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemProducts.filter(p => !itemSearch || p.name?.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku?.toLowerCase().includes(itemSearch.toLowerCase())).map((prod) => (
                    <TableRow key={prod.id} className={selectedItems.find(i => i.id === prod.id) ? 'bg-slate-50' : ''}>
                      <TableCell><input type="checkbox" checked={!!selectedItems.find(i => i.id === prod.id)} onChange={() => toggleItemSelection(prod)} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" /></TableCell>
                      <TableCell className="font-mono text-xs">{prod.sku || prod.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{prod.name}</TableCell>
                      <TableCell><Badge variant="outline">{prod.category || 'General'}</Badge></TableCell>
                      <TableCell className="text-slate-500 text-sm">{prod.uom || 'pcs'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedItems.length > 0 && (
              <div className="h-64 flex-shrink-0 border-t pt-4 overflow-y-auto space-y-4">
                <p className="text-sm font-bold text-slate-800 flex items-center justify-between mb-2">Detail Kuantitas & Harga (Estimasi) <Badge className="bg-blue-600 text-white">{selectedItems.length} Item</Badge></p>
                <div className="grid grid-cols-1 gap-3">
                  {selectedItems.map(item => (
                    <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 px-2 bg-slate-50 text-slate-600 text-[10px] font-mono rounded-bl-lg border-l border-b border-slate-100">{item.sku || 'ITM-NEW'}</div>
                      <div className="flex-1 min-w-0"><p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{item.name}</p></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] text-slate-500 uppercase font-bold">QTY ({item.uom || 'PCS'})</Label><Input type="number" value={itemDetails[item.id]?.qty} onChange={e => setItemDetails({ ...itemDetails, [item.id]: { ...itemDetails[item.id], qty: e.target.value } })} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimasi Harga</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className="text-slate-300 hover:text-blue-500 transition-colors">
                                  <HelpCircle className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3 rounded-xl border-slate-200 shadow-xl" side="top">
                                <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                                  <Calculator className="w-3.5 h-3.5 text-blue-500" />
                                  Kalkulasi Estimasi
                                </p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  Harga diambil dari <b>Harga Beli terakhir</b> di master produk. Anda dapat menyesuaikannya sesuai penawaran supplier saat ini.
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Input type="number" value={itemDetails[item.id]?.price} onChange={e => setItemDetails({ ...itemDetails, [item.id]: { ...itemDetails[item.id], price: e.target.value } })} className="h-9 text-sm font-bold" />
                          {Number(itemDetails[item.id]?.price) > Number(item.buy_price || item.price || 0) * 1.1 && (
                            <p className="text-[10px] text-amber-600 mt-1 font-medium bg-amber-50 p-1 rounded border border-amber-200">⚠️ 10% lebih tinggi dari master</p>
                          )}
                        </div>
                        <div className="flex flex-col justify-end items-end pb-1"><p className="text-[10px] text-slate-400 uppercase font-bold">Subtotal</p><p className="font-black text-slate-900 font-mono text-sm tracking-tight">Rp {formatCurrency(itemDetails[item.id]?.qty * itemDetails[item.id]?.price || 0)}</p></div>
                      </div>
                      <div className="space-y-1.5"><Label className="text-[10px] text-slate-600 uppercase font-black tracking-wider">Justifikasi / Alasan Pengadaan *</Label><Input placeholder="Contoh: Stok kritis / Unit baru..." value={itemDetails[item.id]?.justification} onChange={e => setItemDetails({ ...itemDetails, [item.id]: { ...itemDetails[item.id], justification: e.target.value } })} className="h-9 text-sm border-slate-200 focus:border-slate-500" /></div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center space-x-2 py-2 border-b border-dashed border-slate-200">
                    <Checkbox
                      id="item_include_tax"
                      checked={itemIncludeTax}
                      onCheckedChange={(checked) => setItemIncludeTax(checked)}
                    />
                    <Label htmlFor="item_include_tax" className="text-xs font-bold text-slate-600 cursor-pointer">
                      Kenakan PPN 11%
                    </Label>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 mt-2">
                    <span className="text-lg font-bold text-slate-800 uppercase tracking-tighter">Total Estimasi:</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        Rp {formatCurrency(selectedItems.reduce((acc, item) => acc + (parseFloat(itemDetails[item.id]?.qty || 0) * parseFloat(itemDetails[item.id]?.price || 0)), 0) * (itemIncludeTax ? 1.11 : 1))}
                      </span>
                      {itemIncludeTax && <p className="text-[10px] text-slate-400 font-bold">Terhitung PPN 11%</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Catatan</Label>
                    <Textarea
                      placeholder="Tambahkan catatan untuk approver..."
                      value={itemPrNote}
                      onChange={e => setItemPrNote(e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
            <p className="text-xs text-slate-500">{selectedItems.length} item dipilih</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowItemMaster(false)}>Batal</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11" onClick={handleCreateFromMaster} disabled={selectedItems.length === 0 || isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Buat PR ({selectedItems.length} Item)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
