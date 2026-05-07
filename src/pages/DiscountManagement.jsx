import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Percent, DollarSign, Calendar, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';

export default function DiscountManagement({ store }) {
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'Percentage',
    discount_value: '',
    apply_to: 'All',
    product_ids: [],
    min_purchase: 0,
    start_date: '',
    end_date: '',
    max_usage: ''
  });

  useEffect(() => {
    if (store?.id) {
      loadData();
      loadCurrentUser();
    }
  }, [store]);

  const loadCurrentUser = async () => {
    try {
      const user = await api.auth.me();
      setCurrentUser(user);
    } catch (e) {
      console.error("Failed to load user:", e);
    }
  };

  const loadData = async () => {
    const [discData, prodData, usageData] = await Promise.all([
      api.entities.Discount.filter({ store_id: store.id }),
      api.entities.Product.filter({ store_id: store.id }),
      api.entities.DiscountUsage.filter({ store_id: store.id })
    ]);
    // Count actual usage from DiscountUsage history
    const usageMap = {};
    if (usageData) {
      usageData.forEach(usage => {
        if (usage.discount_id) {
          usageMap[usage.discount_id] = (usageMap[usage.discount_id] || 0) + 1;
        }
      });
    }
    const enriched = discData.map(d => ({
      ...d,
      used_count: usageMap[d.id] || d.usage_count || 0
    }));
    setDiscounts(enriched);
    setProducts(prodData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check discount limit authorities
    if (currentUser && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      const maxLimit = currentUser.max_discount_limit || 0;
      const val = Number(formData.discount_value);

      if (formData.discount_type === 'Percentage' && val > maxLimit) {
        toast({ title: "Melebihi Batas Otoritas", description: `Batas maksimal diskon yang dapat Anda buat adalah ${maxLimit}%.`, variant: 'destructive' });
        return;
      }

      // If nominal discount and limit is 0, forbid creating discount entirely
      if (maxLimit === 0) {
        toast({ title: "Tidak Diizinkan", description: `Anda tidak memiliki otoritas untuk memberikan diskon.`, variant: 'destructive' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const dataToSave = {
        store_id: store.id,
        code: formData.code,
        name: formData.name,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_purchase: Number(formData.min_purchase),
        usage_limit: formData.max_usage ? Number(formData.max_usage) : 0,
        start_date: formData.start_date,
        end_date: formData.end_date,
        applicable_products: formData.apply_to === 'Specific Products' ? formData.product_ids : [],
        status: 'Active'
      };

      if (selectedDiscount) {
        await api.entities.Discount.update(selectedDiscount.id, dataToSave);
      } else {
        await api.entities.Discount.create(dataToSave);
      }
    } catch (error) {
      console.error("Error saving discount:", error);
    } finally {
      setIsSaving(false);
      setShowForm(false);
      resetForm();
      loadData();
    }
  };

  const handleEdit = (discount) => {
    setSelectedDiscount(discount);
    setFormData({
      code: discount.code || '',
      name: discount.name,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      apply_to: discount.applicable_products?.length > 0 ? 'Specific Products' : 'All',
      product_ids: discount.applicable_products || [],
      min_purchase: discount.min_purchase,
      start_date: discount.start_date,
      end_date: discount.end_date,
      max_usage: discount.usage_limit || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus diskon ini?')) {
      await api.entities.Discount.delete(id);
      loadData();
    }
  };

  const handleViewHistory = async (discount) => {
    const history = await api.entities.DiscountUsage.filter({
      store_id: store.id,
      discount_id: discount.id
    });
    setUsageHistory(history);
    setSelectedDiscount(discount);
    setShowHistory(true);
  };

  const resetForm = () => {
    setSelectedDiscount(null);
    setFormData({
      code: '',
      name: '',
      discount_type: 'Percentage',
      discount_value: '',
      apply_to: 'All',
      product_ids: [],
      min_purchase: 0,
      start_date: '',
      end_date: '',
      max_usage: ''
    });
  };

  const isDiscountActive = (discount) => {
    const now = new Date();
    const start = new Date(discount.start_date);
    const end = new Date(discount.end_date);
    return discount.is_active && now >= start && now <= end;
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-32" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts & Promotions"
        subtitle="Kelola diskon dan promosi untuk transaksi"
        icon={DollarSign}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
            <Plus className="w-4 h-4 mr-2" />
            Buat Diskon Baru
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Percent className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Diskon</p>
                <p className="text-2xl font-bold text-slate-800">{discounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Diskon Aktif</p>
                <p className="text-2xl font-bold text-slate-800">
                  {discounts.filter(isDiscountActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Penggunaan</p>
                <p className="text-2xl font-bold text-slate-800">
                  {discounts.reduce((sum, d) => sum + (d.used_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discount List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Diskon</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Berlaku</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Penggunaan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                    Belum ada diskon dibuat
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount, idx) => (
                  <TableRow key={discount.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{discount.code || '-'}</TableCell>
                    <TableCell>{discount.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {discount.discount_type === 'Percentage' ? <Percent className="w-3 h-3 mr-1" /> : <DollarSign className="w-3 h-3 mr-1" />}
                        {discount.discount_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {discount.discount_type === 'Percentage'
                        ? `${discount.discount_value}%`
                        : `Rp ${formatCurrency(discount.discount_value)}`
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {discount.applicable_products?.length > 0 ? 'Specific Products' : 'All'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(discount.start_date).toLocaleDateString('id-ID')} - {new Date(discount.end_date).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {discount.used_count || 0} {discount.usage_limit ? `/ ${discount.usage_limit}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge className={isDiscountActive(discount) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {isDiscountActive(discount) ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewHistory(discount)}>
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(discount)}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(discount.id)}>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDiscount ? 'Edit Diskon' : 'Buat Diskon Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kode Diskon</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="mt-1.5" placeholder="PROMO10" />
              </div>
              <div>
                <Label>Nama Diskon *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipe Diskon</Label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Persentase (%)</SelectItem>
                    <SelectItem value="Nominal">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai Diskon *</Label>
                <NumberInput value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} className="mt-1.5" required />
              </div>
            </div>

            <div>
              <Label>Berlaku Untuk</Label>
              <Select value={formData.apply_to} onValueChange={(v) => setFormData({ ...formData, apply_to: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Semua Produk</SelectItem>
                  <SelectItem value="Specific Products">Produk Tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.apply_to === 'Specific Products' && (
              <div>
                <Label>Pilih Produk</Label>
                <div className="mt-1.5 border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.product_ids.includes(p.id)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            product_ids: checked
                              ? [...formData.product_ids, p.id]
                              : formData.product_ids.filter(id => id !== p.id)
                          });
                        }}
                      />
                      <label className="text-sm">{p.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Minimum Pembelian</Label>
              <NumberInput value={formData.min_purchase} onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })} className="mt-1.5" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="mt-1.5" required />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="mt-1.5" required />
              </div>
            </div>

            <div>
              <Label>Maksimal Penggunaan</Label>
              <NumberInput value={formData.max_usage} onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })} className="mt-1.5" placeholder="Kosongkan untuk unlimited" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Riwayat Penggunaan - {selectedDiscount?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-right">Nilai Diskon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      Belum ada penggunaan
                    </TableCell>
                  </TableRow>
                ) : (
                  usageHistory.map(usage => (
                    <TableRow key={usage.id}>
                      <TableCell>{usage.timestamp_wib}</TableCell>
                      <TableCell className="font-medium">{usage.invoice_number}</TableCell>
                      <TableCell>{usage.customer_name}</TableCell>
                      <TableCell className="text-right font-medium">Rp {formatCurrency(usage.discount_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
