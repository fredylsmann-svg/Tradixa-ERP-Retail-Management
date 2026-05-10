import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Eye, ClipboardList, Trash2, Loader2, Send, X, FileText, ChevronRight, Check, Printer, Smartphone, History, Signature, XCircle, CheckCircle2, MessageSquare, ExternalLink, Calendar, UserCircle, Building2, Mail, Phone, Calculator, Clock, Search, ShoppingCart, FileSearch, Info, Save, HelpCircle, Truck, ChevronDown } from 'lucide-react';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import SignaturePad from '@/components/ui/SignaturePad';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar, { exportToPDF } from '@/components/layout/ExportToolbar';
import moment from 'moment';
import 'moment/locale/id';
import PageHeader from '@/components/layout/PageHeader';
import { useTaxRate } from '@/hooks/useTaxRate';

export default function PurchaseOrders({ store }) {
  const { toast } = useToast();
  const { ppnRate, ppnLabel, ppnDecimal } = useTaxRate(store?.id);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [],
    notes: '',
    delivery_date: moment().format('YYYY-MM-DDTHH:mm'),
    payment_terms: '',
    shipping_address: '',
    shipping_via: 'Kurir Internal',
    custom_shipping_via: '',
    use_tax: false
  });
  const [newItem, setNewItem] = useState({
    product_id: '',
    description: '',
    category: '',
    quantity: 1,
    unit: 'pcs',
    unit_price: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');

  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [delegateApproval, setDelegateApproval] = useState('');

  const [showPrDialog, setShowPrDialog] = useState(false);
  const [approvedPrs, setApprovedPrs] = useState([]);
  const [selectedPr, setSelectedPr] = useState(null);
  const [poFromPrData, setPoFromPrData] = useState({
    supplier_id: '',
    delivery_date: moment().format('YYYY-MM-DDTHH:mm'),
    notes: '',
    shipping_via: 'Kurir Internal',
    custom_shipping_via: '',
    use_tax: false
  });

  const [adminName, setAdminName] = useState('Authorized');
  const [adminRole, setAdminRole] = useState('Pimpinan');

  const [negotiationItems, setNegotiationItems] = useState([]);
  const [signatureHistory, setSignatureHistory] = useState([]);

  useEffect(() => {
    if (viewingOrder) {
      setNegotiationItems(JSON.parse(JSON.stringify(viewingOrder.items || [])));
    }
  }, [viewingOrder]);

  useEffect(() => {
    if (store?.id) {
      loadData();
      const saved = localStorage.getItem(`signatures_${store.id}_admin`);
      if (saved) setSignatureHistory(JSON.parse(saved));
    }
  }, [store]);

  // REALTIME: Auto-update PO detail when supplier signs (no manual refresh needed)
  useEffect(() => {
    if (!viewingOrder?.id) return;
    const channel = supabase
      .channel(`po_detail_${viewingOrder.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'purchase_orders',
        filter: `id=eq.${viewingOrder.id}`
      }, (payload) => {
        console.log('[PO Realtime] Auto-updated:', payload.new?.status);
        setViewingOrder(payload.new);
        // Also refresh the list to update status badges
        loadData();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [viewingOrder?.id]);

  const loadData = async () => {
    const [ordersData, suppliersData, productsData, prsData, receiptsData] = await Promise.all([
      api.entities.PurchaseOrder.filter({ store_id: store.id }, '-created_date'),
      api.entities.Supplier.filter({ store_id: store.id }),
      api.entities.Product.filter({ store_id: store.id }),
      api.entities.PurchaseRequisition?.filter({ store_id: store.id }) || [],
      api.entities.GoodsReceipt?.filter({ store_id: store.id }) || []
    ]);

    // Filter out already converted PRs in memory and check for approved status (both EN and ID)
    const availablePrs = prsData.filter(pr =>
      (pr.status === 'Approved' || pr.status === 'Disetujui') && !pr.converted_to_po
    );

    setOrders(ordersData);
    setSuppliers(suppliersData);
    setProducts(productsData);
    setApprovedPrs(availablePrs);
    setReceipts(receiptsData);
    setIsLoading(false);
  };

  // Filter by global selected date, status, and search term
  const filteredOrders = orders.filter(o => {
    const isDateMatch = matchesDate(o, selectedDate);
    const isStatusMatch = statusFilter === 'Semua Status' || o.status === statusFilter;
    const isSearchMatch = !searchTerm ||
      o.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return isDateMatch && isStatusMatch && isSearchMatch;
  });

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const getReceivedQty = (poNumber, productId, itemName) => {
    if (!receipts || receipts.length === 0) return 0;
    // Sum received_qty from all 'Terverifikasi' or 'Posted' GRNs matching this po_number
    return receipts
      .filter(r => r.po_number === poNumber && (r.status === 'Terverifikasi' || r.status === 'Posted'))
      .reduce((sum, r) => {
        // Match by product_id OR by name/description (for custom items)
        const item = r.items?.find(i =>
          (productId && i.product_id === productId) ||
          (i.product_name === itemName || i.description === itemName)
        );
        return sum + (item?.received_qty || 0);
      }, 0);
  };

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const addItem = () => {
    if (!newItem.description && !newItem.product_id) return;

    let itemName = newItem.description;
    let itemUnitPrice = Number(newItem.unit_price);

    if (newItem.product_id) {
      const product = products.find(p => p.id === newItem.product_id);
      itemName = product?.name || itemName;
      itemUnitPrice = itemUnitPrice || (product?.buy_price || 0);
    }

    setFormData({
      ...formData,
      items: [...formData.items, {
        product_id: newItem.product_id || null,
        product_name: itemName,
        sku: newItem.product_id ? (products.find(p => p.id === newItem.product_id)?.sku || '') : '',
        quantity: Number(newItem.quantity),
        unit: newItem.unit,
        unit_price: itemUnitPrice,
        subtotal: Number(newItem.quantity) * itemUnitPrice,
        category: newItem.category || (newItem.product_id ? products.find(p => p.id === newItem.product_id)?.category : null) || 'Uncategorized'
      }]
    });
    setNewItem({ product_id: '', description: '', category: '', quantity: 1, unit: 'pcs', unit_price: 0 });
  };

  const removeItem = (idx) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (formData.items.length === 0 || !formData.supplier_id) return;
    setIsSaving(true);

    const supplier = suppliers.find(v => v.id === formData.supplier_id);
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = formData.use_tax ? subtotal * ppnDecimal : 0;
    const total = subtotal + tax;
    const poNumber = `PO-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    try {
      const newOrder = {
        store_id: store.id,
        po_number: poNumber,
        supplier_id: formData.supplier_id,
        supplier_name: supplier?.name || '',
        supplier_phone: supplier?.phone || '',
        supplier_email: supplier?.email || '',
        supplier_address: supplier?.address || '',
        items: formData.items,
        original_items: formData.items,
        subtotal,
        tax_amount: tax,
        total: total,
        status: 'Draft',
        delivery_date: formData.delivery_date,
        payment_terms: formData.payment_terms,
        shipping_address: formData.shipping_address,
        shipping_via: formData.shipping_via === 'Lainnya' ? formData.custom_shipping_via : formData.shipping_via,
        notes: formData.notes,
        timestamp_wib: getWIBTimestamp()
      };

      // Remove fields if they might cause issues (optional safety)
      if (!supplier?.phone) delete newOrder.supplier_phone;
      if (!supplier?.email) delete newOrder.supplier_email;

      await api.entities.PurchaseOrder.create(newOrder);

      setIsSaving(false);
      setShowForm(false);
      setFormData({
        supplier_id: '',
        items: [],
        notes: '',
        delivery_date: moment().format('YYYY-MM-DDTHH:mm'),
        payment_terms: '',
        shipping_address: '',
        shipping_via: 'Kurir Internal',
        custom_shipping_via: '',
        use_tax: false
      });
      loadData();
    } catch (err) {
      console.error("Failed to create manual PO", err);
      setIsSaving(false);
    }
  };

  const handleCreatePoFromPr = async () => {
    if (!selectedPr || !poFromPrData.supplier_id) return;
    setIsSaving(true);

    const supplier = suppliers.find(v => v.id === poFromPrData.supplier_id);
    const subtotal = selectedPr.subtotal || 0;
    const tax = poFromPrData.use_tax ? subtotal * ppnDecimal : 0;
    const total = subtotal + tax;
    const poNumber = `PO-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    try {
      const newPo = {
        store_id: store.id,
        po_number: poNumber,
        pr_id: selectedPr.id,
        pr_number: selectedPr.pr_number,
        supplier_id: poFromPrData.supplier_id,
        supplier_name: supplier?.name || '',
        supplier_phone: supplier?.phone || '',
        supplier_email: supplier?.email || '',
        supplier_address: supplier?.address || '',
        items: (selectedPr.items || []).map(item => {
          const rawPrice = String(item.price || '0').replace(/\./g, '').replace(/,/g, '.');
          const price = parseFloat(rawPrice) || 0;
          const qty = Number(item.qty || 0);
          return {
            product_id: item.product_id,
            product_name: item.description || 'Tanpa Deskripsi',
            sku: item.sku || '',
            quantity: qty,
            unit_price: price,
            subtotal: qty * price,
            unit: item.unit || 'pcs',
            category: item.category || 'Uncategorized'
          };
        }),
        original_items: (selectedPr.items || []).map(item => {
          const rawPrice = String(item.price || '0').replace(/\./g, '').replace(/,/g, '.');
          const price = parseFloat(rawPrice) || 0;
          const qty = Number(item.qty || 0);
          return {
            product_name: item.description || 'Tanpa Deskripsi',
            sku: item.sku || '',
            quantity: qty,
            unit_price: price,
            subtotal: qty * price,
            unit: item.unit || 'pcs',
            category: item.category || 'Uncategorized'
          };
        }),
        subtotal,
        tax_amount: tax,
        total: total,
        status: 'Draft',
        delivery_date: poFromPrData.delivery_date,
        shipping_via: poFromPrData.shipping_via === 'Lainnya' ? poFromPrData.custom_shipping_via : (poFromPrData.shipping_via || 'Kurir Internal'),
        notes: poFromPrData.notes,
        timestamp_wib: getWIBTimestamp()
      };

      // Safety check for supplier info
      if (!supplier?.phone) delete newPo.supplier_phone;
      if (!supplier?.email) delete newPo.supplier_email;

      await api.entities.PurchaseOrder.create(newPo);

      // Mark PR as converted & updated nomenclature
      await api.entities.PurchaseRequisition.update(selectedPr.id, {
        converted_to_po: true,
        po_id: poNumber,
        status: 'PO Dibuat'
      });

      setShowPrDialog(false);
      setSelectedPr(null);
      setPoFromPrData({
        supplier_id: '',
        delivery_date: moment().format('YYYY-MM-DDTHH:mm'),
        notes: '',
        shipping_via: 'Kurir Internal',
        custom_shipping_via: '',
        use_tax: false
      });
      loadData();
    } catch (err) {
      console.error("Failed to convert PR to PO", err);
    }
    setIsSaving(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Sent: 'bg-blue-100 text-blue-700 border-blue-200',
      Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Negotiation: 'bg-amber-100 text-amber-700 border-amber-200',
      'In Transit': 'bg-amber-500 text-white border-amber-600',
      Confirmed: 'bg-blue-600 text-white border-blue-600',
      'Partial Received': 'bg-amber-100 text-amber-700 border-amber-200',
      'Fully Received': 'bg-blue-600 text-white border-blue-600',
      Closed: 'bg-slate-600 text-white border-slate-700',
      Cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return <Badge variant="outline" className={`${styles[status] || styles.Draft} font-semibold px-2.5 py-0.5 rounded-full border`}>
      {status}
    </Badge>;
  };

  const handleWhatsAppClick = async (order) => {
    const supplier = suppliers.find(v => v.id === order.supplier_id);
    if (!supplier?.phone) {
      toast({
        title: "Gagal Kirim WhatsApp",
        description: "Nomor WA Supplier tidak ditemukan!",
        variant: "destructive"
      });
      return;
    }

    // Update status to Sent if it's currently Draft or Negotiation
    if (order.status === 'Draft' || order.status === 'Negotiation') {
      try {
        const historyEntry = {
          time_wib: getWIBTimestamp(),
          activity: 'Sent to Supplier',
          detail: `PO dikirim ke WhatsApp supplier (${supplier.name})`
        };

        await api.entities.PurchaseOrder.update(order.id, {
          status: 'Sent',
          approval_history: [...(order.approval_history || []), historyEntry]
        });

        // Refresh local data if we are viewing this order
        if (viewingOrder?.id === order.id) {
          const refreshed = await api.entities.PurchaseOrder.get(order.id);
          if (refreshed) setViewingOrder(refreshed);
        }
        loadData();
      } catch (err) {
        console.error("Failed to update status to Sent", err);
      }
    }

    const publicUrl = `${window.location.origin}/public/po/${order.id}/sign`;
    let message = `Halo ${supplier.name},\n\nBerikut kami kirimkan Purchase Order *${order.po_number}* dari *${store?.store_name}*.\n\nMohon tinjau detail pesanan dan bubuhkan tanda tangan persetujuan melalui link berikut:\n${publicUrl}\n\nTerima kasih.`;

    if (order.status === 'Negotiation') {
      message = `Halo ${supplier.name},\n\nTerkait negosiasi pada Purchase Order *${order.po_number}* dari *${store?.store_name}*, kami telah *mengajukan penawaran harga baru* berdasarkan diskusi kita.\n\nMohon tinjau kembali detail pesanan dengan harga terbaru dan bubuhkan tanda tangan persetujuan melalui link berikut:\n${publicUrl}\n\nTerima kasih.`;
    }

    const cleanPhone = supplier.phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAdminSign = async (signatureData) => {
    if (!viewingOrder) return;
    setIsSaving(true);

    const historyEntry = {
      time_wib: getWIBTimestamp(),
      activity: 'Admin Signed',
      detail: `PO ditandatangani secara digital oleh Administrator. Status berubah menjadi Confirmed.`,
      type: 'sign'
    };

    const updatedHistory = [...(viewingOrder.approval_history || []), historyEntry];

    try {
      await api.entities.PurchaseOrder.update(viewingOrder.id, {
        admin_signature: signatureData,
        admin_name: adminName,
        admin_role: adminRole,
        status: 'Confirmed',
        approval_history: updatedHistory
      });

      // Save to history
      const newHistoryItem = { signature: signatureData, name: adminName, role: adminRole };
      const updatedSignatureHistory = [
        newHistoryItem,
        ...signatureHistory.filter(h => h.signature !== signatureData)
      ].slice(0, 5);

      setSignatureHistory(updatedSignatureHistory);
      localStorage.setItem(`signatures_${store.id}_admin`, JSON.stringify(updatedSignatureHistory));

      const refreshed = await api.entities.PurchaseOrder.get(viewingOrder.id);
      if (refreshed) setViewingOrder(refreshed);
      setShowSignaturePad(false);
      loadData();
    } catch (err) {
      console.error("Failed to sign PO", err);
    }
    setIsSaving(false);
  };

  const handleCancelPo = async () => {
    if (!viewingOrder || !cancellationReason) return;
    setIsSaving(true);

    const historyEntry = {
      time_wib: getWIBTimestamp(),
      activity: 'PO Cancelled',
      detail: `PO dibatalkan. Alasan: ${cancellationReason}`,
      type: 'cancel'
    };

    const updatedHistory = [...(viewingOrder.approval_history || []), historyEntry];

    await api.entities.PurchaseOrder.update(viewingOrder.id, {
      status: 'Cancelled',
      cancellation_reason: cancellationReason,
      approval_history: updatedHistory
    });

    setViewingOrder({ ...viewingOrder, status: 'Cancelled', approval_history: updatedHistory });
    setCancellationReason('');
    setIsSaving(false);
    loadData();
  };

  const handleSaveNegotiation = async () => {
    if (!viewingOrder) return;
    setIsSaving(true);

    const newSubtotal = negotiationItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    const newTax = viewingOrder.tax_amount > 0 ? newSubtotal * ppnDecimal : 0;
    const newTotal = newSubtotal + newTax;

    const historyEntry = {
      time_wib: getWIBTimestamp(),
      activity: 'Admin Revision',
      detail: `Admin menyimpan revisi harga hasil negosiasi.`,
      type: 'negotiation'
    };
    const updatedHistory = [...(viewingOrder.approval_history || []), historyEntry];

    await api.entities.PurchaseOrder.update(viewingOrder.id, {
      items: negotiationItems,
      subtotal: newSubtotal,
      tax_amount: newTax,
      total: newTotal,
      approval_history: updatedHistory
    });

    setViewingOrder({
      ...viewingOrder,
      items: negotiationItems,
      subtotal: newSubtotal,
      tax_amount: newTax,
      total: newTotal,
      approval_history: updatedHistory
    });

    setIsSaving(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Kelola pesanan pembelian untuk inventory"
        icon={ClipboardList}
        actions={
          <>
            <ExportToolbar
              title="Daftar Purchase Orders"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-po-detailed"
            />
            <Button variant="outline" onClick={() => setShowPrDialog(true)} className="border-blue-200 text-blue-600 hover:bg-blue-50 h-11 px-6 font-semibold rounded-xl">
              <ClipboardList className="w-4 h-4 mr-2" />
              Ambil dari PR
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-bold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Buat PO Baru
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
            placeholder="Cari nomor PO atau supplier..."
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
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="In Transit">In Transit</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Fully Received">Fully Received</SelectItem>
            <SelectItem value="Partial Received">Partial Received</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-[200px] h-11 bg-white border-slate-200 text-slate-700 flex items-center justify-between px-3 pr-4 rounded-md hover:bg-slate-50 transition-all shadow-sm group">
              <span className="text-sm">Keterangan Warna</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 rounded-2xl border-slate-200 shadow-2xl" side="bottom" align="end">
            <h4 className="font-bold text-slate-800 mb-4 text-sm">
              Detail Warna Logistik
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 leading-none">REQ: REQUEST</p>
                  <p className="text-[9px] text-slate-500 mt-1">Permintaan awal dari Admin</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 leading-none">ETA: ON-TIME</p>
                  <p className="text-[9px] text-slate-500 mt-1">Konfirmasi Supplier (Sesuai Jadwal)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div>
                  <p className="text-[10px] font-black text-rose-600 leading-none">ETA: DELAY</p>
                  <p className="text-[9px] text-slate-500 mt-1">Konfirmasi Supplier (Terlambat)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <div>
                  <p className="text-[10px] font-black text-indigo-600 leading-none">ACT: ARRIVAL</p>
                  <p className="text-[9px] text-slate-500 mt-1">Realisasi kedatangan barang (GRN)</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead className="w-64 pl-6">PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Arrival Date</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada purchase order untuk tanggal ini
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800 whitespace-nowrap" title={order.po_number}>{order.po_number}</div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {order.timestamp_wib ? moment(order.timestamp_wib.split(' ')[0], 'DD/MM/YYYY').locale('id').format('dddd, DD MMMM YYYY') : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">{order.supplier_name}</TableCell>
                    <TableCell>
                      {/* 1. REQUESTED DATE */}
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-black w-7 text-center">Req</span>
                        <span className="text-[13px]">{order.delivery_date ? moment(order.delivery_date).locale('id').format('DD/MM/YYYY HH:mm') : '-'}</span>
                      </div>

                      {/* 2. CONFIRMED ETA (SUPPLIER) */}
                      {order.confirmed_delivery_date && (
                        <div className={`font-bold flex items-center gap-1.5 mt-1.5 ${moment.utc(order.confirmed_delivery_date).isAfter(moment.utc(order.delivery_date))
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                          }`}>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black w-7 text-center ${moment.utc(order.confirmed_delivery_date).isAfter(moment.utc(order.delivery_date))
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>Eta</span>
                          <span className="text-[13px]">{moment.utc(order.confirmed_delivery_date).locale('id').format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      )}

                      {/* 3. ACTUAL ARRIVAL (GRN / REALITY) */}
                      {(() => {
                        const relatedReceipt = receipts.find(r => r.po_number === order.po_number && (r.status === 'Posted' || r.status === 'Terverifikasi'));
                        const arrivalDate = relatedReceipt?.actual_arrival_at || order.received_at;

                        if (arrivalDate) {
                          return (
                            <div className="font-bold text-indigo-600 flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-black w-7 text-center">Act</span>
                              <span className="text-[13px]">{moment.utc(arrivalDate).locale('id').format('DD/MM/YYYY HH:mm')}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">{order.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-medium">Rp {formatCurrency(order.total)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setViewingOrder(order)}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showPrDialog} onOpenChange={setShowPrDialog}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <DialogTitle>Buat PO dari PR yang Disetujui</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1.5">
              <Label>Pilih Purchase Requisition *</Label>
              <Select value={selectedPr?.id} onValueChange={v => {
                const pr = approvedPrs.find(p => p.id === v);
                setSelectedPr(pr ? JSON.parse(JSON.stringify(pr)) : null);
              }}>
                <SelectTrigger className="border-blue-200 h-11 focus:ring-blue-500">
                  <SelectValue placeholder="Pilih PR yang sudah disetujui..." />
                </SelectTrigger>
                <SelectContent>
                  {approvedPrs.map(pr => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.pr_number} - {pr.department} - {pr.timestamp_wib.split(' ')[0]} - Rp {formatCurrency(pr.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPr && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-blue-400">PR Number</p>
                    <p className="font-bold text-slate-800">{selectedPr.pr_number}</p>
                    <p className="text-[10px] uppercase font-bold text-blue-400 mt-2">Department</p>
                    <p className="font-semibold text-slate-700">{selectedPr.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-blue-400">Diminta oleh</p>
                    <p className="font-bold text-slate-800">{selectedPr.approved_by || 'Administrator'}</p>
                    <p className="text-[10px] uppercase font-bold text-blue-400 mt-2">Total Amount (PR Asli)</p>
                    <p className="text-blue-600 font-bold">Rp {formatCurrency(approvedPrs.find(p => p.id === selectedPr.id)?.total_amount || selectedPr.total_amount)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-800">Item yang Akan Dipesan</p>
                    <p className="text-[10px] text-amber-600 font-medium italic">* Harga rill hasil sourcing / cari harga awal</p>
                  </div>
                  <Table className="border rounded-lg">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-center">SKU</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Est. Harga (Rp)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPr.items?.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 text-slate-500 border-slate-200">
                              {item.sku || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{item.qty} {item.unit}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...selectedPr.items];
                                newItems[i].price = e.target.value;
                                const newSubtotal = newItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
                                setSelectedPr({ ...selectedPr, items: newItems, subtotal: newSubtotal, total_amount: newSubtotal * (1 + ppnDecimal) });
                              }}
                              className="w-32 text-right h-8 inline-block bg-amber-50 focus:bg-white ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold">Rp {formatCurrency(item.qty * item.price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Pilih Supplier *</Label>
                    <Select value={poFromPrData.supplier_id} onValueChange={v => setPoFromPrData({ ...poFromPrData, supplier_id: v })}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl"><SelectValue placeholder="Pilih supplier..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {suppliers.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">Requested Arrival Date *</Label>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Estimasi kebutuhan barang diterima (Pengajuan ke Supplier)</p>
                    <Input type="datetime-local" value={poFromPrData.delivery_date} onChange={e => setPoFromPrData({ ...poFromPrData, delivery_date: e.target.value })} className="h-11 bg-white border-slate-200 rounded-xl font-bold text-blue-600" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Catatan</Label>
                    <Textarea
                      placeholder="Catatan tambahan untuk PO..."
                      value={poFromPrData.notes}
                      onChange={e => setPoFromPrData({ ...poFromPrData, notes: e.target.value })}
                      className="min-h-[80px] bg-white border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Kenakan {ppnLabel}?</span>
                    <div className="flex items-center gap-2">
                      <span className={!poFromPrData.use_tax ? "text-xs font-bold text-blue-600" : "text-xs text-slate-400"}>Tidak</span>
                      <Switch checked={poFromPrData.use_tax} onCheckedChange={v => setPoFromPrData({ ...poFromPrData, use_tax: v })} />
                      <span className={poFromPrData.use_tax ? "text-xs font-bold text-blue-600" : "text-xs text-slate-400"}>Ya</span>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200"></div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal:</span>
                    <span>Rp {formatCurrency(selectedPr.subtotal)}</span>
                  </div>
                  {poFromPrData.use_tax && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>{ppnLabel}:</span>
                      <span>Rp {formatCurrency(selectedPr.subtotal * ppnDecimal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-base font-bold text-slate-800">Total PO:</span>
                    <span className="text-xl font-black text-blue-600">Rp {formatCurrency(selectedPr.subtotal * (poFromPrData.use_tax ? (1 + ppnDecimal) : 1))}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPrDialog(false)} className="rounded-xl h-11 px-6 font-bold">Batal</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 font-black shadow-lg shadow-blue-100"
              onClick={handleCreatePoFromPr}
              disabled={!selectedPr || !poFromPrData.supplier_id || isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              PROSES BUAT PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redesigned Manual PO Creation Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent hideFullscreen={true} className="max-w-6xl p-0 overflow-hidden bg-white shadow-2xl border-none">
          <div className="flex flex-col h-[90vh]">
            {/* Header */}
            <div className="bg-blue-600 px-8 py-6 pr-14 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Buat Purchase Order</h2>
                  <p className="text-slate-400 text-sm font-medium">Pembuatan PO Manual (Tanpa Referensi PR)</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <form id="manual-po-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  {/* Left Column: Supplier & Shipping */}
                  <div className="md:col-span-3 space-y-6">
                    <Card className="border shadow-sm rounded-2xl overflow-hidden">
                      <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-sm font-bold text-slate-800">Informasi Supplier & Pengiriman</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 bg-white space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Supplier *</Label>
                          <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl focus:ring-slate-400">
                              <SelectValue placeholder="Cari atau pilih supplier..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                              {suppliers.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal & Waktu Kirim *</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              <Input
                                type="datetime-local"
                                value={formData.delivery_date}
                                onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                                className="h-11 pl-10 bg-white border-slate-200 rounded-xl focus:ring-slate-400"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ship Via (Ekspedisi)</Label>
                            <div className="flex gap-2">
                              <Select value={formData.shipping_via} onValueChange={(v) => setFormData({ ...formData, shipping_via: v })}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl focus:ring-slate-400 flex-1">
                                  <SelectValue placeholder="Pilih pengiriman..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Kurir Internal">Kurir Internal</SelectItem>
                                  <SelectItem value="Ambil Sendiri">Ambil Sendiri</SelectItem>
                                  <SelectItem value="JNE">JNE (Jalur Nugraha Ekakurir)</SelectItem>
                                  <SelectItem value="J&T Express">J&T Express</SelectItem>
                                  <SelectItem value="SiCepat">SiCepat Ekspres</SelectItem>
                                  <SelectItem value="Ninja Xpress">Ninja Xpress</SelectItem>
                                  <SelectItem value="Wahana">Wahana Express</SelectItem>
                                  <SelectItem value="Grab/Gojek">Grab / Gojek</SelectItem>
                                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                                </SelectContent>
                              </Select>
                              {formData.shipping_via === 'Lainnya' && (
                                <div className="relative flex-1">
                                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <Input
                                    placeholder="Nama Ekspedisi..."
                                    value={formData.custom_shipping_via}
                                    onChange={e => setFormData({ ...formData, custom_shipping_via: e.target.value })}
                                    className="h-11 pl-10 bg-white border-slate-200 rounded-xl"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alamat Pengiriman</Label>
                          <Textarea
                            placeholder="Alamat lengkap pengiriman barang..."
                            value={formData.shipping_address}
                            onChange={e => setFormData({ ...formData, shipping_address: e.target.value })}
                            className="bg-white border-slate-200 rounded-xl focus:ring-slate-400 min-h-[80px]"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm rounded-2xl overflow-hidden">
                      <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-slate-500" />
                          <CardTitle className="text-sm font-bold text-slate-800">Item yang Dipesan</CardTitle>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addItem}
                          className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-bold gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6 bg-white space-y-6">
                        {/* New Item Inputs */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Pilih Produk (Opsional)</Label>
                              <Select value={newItem.product_id} onValueChange={(v) => {
                                const p = products.find(pr => pr.id === v);
                                setNewItem({
                                  ...newItem,
                                  product_id: v,
                                  description: p?.name || '',
                                  category: p?.category || 'Uncategorized',
                                  unit: p?.unit || 'pcs',
                                  unit_price: p?.buy_price || 0
                                });
                              }}>
                                <SelectTrigger className="bg-white border-slate-200 rounded-xl h-10">
                                  <SelectValue placeholder="Ambil dari master data..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Kategori</Label>
                              <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                                <SelectTrigger className="bg-white border-slate-200 rounded-xl h-10">
                                  <SelectValue placeholder="Pilih kategori..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Elektronik', 'Makanan', 'Minuman', 'Pakaian', 'Kesehatan', 'Kecantikan', 'Rumah Tangga', 'Alat Tulis', 'Rokok', 'Sembako', 'Uncategorized', 'Lainnya'].map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Nama Item / Deskripsi *</Label>
                              <Input
                                placeholder="Ketik nama item manual..."
                                value={newItem.description}
                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                className="bg-white border-slate-200 rounded-xl h-10"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 items-end">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Qty</Label>
                              <NumberInput
                                value={newItem.quantity}
                                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                className="bg-white border-slate-200 rounded-xl h-10 text-center font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Unit</Label>
                              <Select value={newItem.unit} onValueChange={v => setNewItem({ ...newItem, unit: v })}>
                                <SelectTrigger className="bg-white border-slate-200 rounded-xl h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['pcs', 'box', 'kg', 'gram', 'meter', 'liter', 'roll', 'paket', 'sak', 'bal', 'lusin'].map(u => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Harga Satuan (Rp)</Label>
                              <NumberInput
                                value={newItem.unit_price}
                                onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                                className="bg-white border-slate-200 rounded-xl h-10 text-right font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow>
                                <TableHead className="pl-6">Deskripsi</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-10 pr-6"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.items.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic text-sm">
                                    Belum ada item ditambahkan
                                  </TableCell>
                                </TableRow>
                              ) : (
                                formData.items.map((item, idx) => (
                                  <TableRow key={idx} className="hover:bg-slate-50/50">
                                    <TableCell className="pl-6 font-bold text-slate-700">{item.product_name}</TableCell>
                                    <TableCell className="text-center font-medium">
                                      {item.quantity} {item.unit}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-600 font-medium">
                                      Rp {formatCurrency(item.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900">
                                      Rp {formatCurrency(item.subtotal)}
                                    </TableCell>
                                    <TableCell className="pr-6">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Summary & Actions */}
                  <div className="md:col-span-2 space-y-6">
                    <Card className="border shadow-lg rounded-2xl overflow-hidden bg-white">
                      <CardHeader className="bg-blue-600 py-5 px-6">
                        <CardTitle className="text-white font-bold text-base flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-slate-400" />
                          Ringkasan PO
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {(() => {
                          const subtotalItems = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
                          // Include draft item in calculation for real-time feedback
                          const draftSubtotal = (Number(newItem.quantity) || 0) * (Number(newItem.unit_price) || 0);
                          const subtotal = subtotalItems + draftSubtotal;

                          const tax = formData.use_tax ? subtotal * ppnDecimal : 0;
                          const total = subtotal + tax;

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-500">Subtotal</span>
                                <span className="font-bold text-slate-800">Rp {formatCurrency(subtotal)}</span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">Kenakan PPN?</span>
                                  <span className="text-[10px] text-slate-400 font-medium italic">Tarif Pajak: {ppnRate}%</span>
                                </div>
                                <Switch checked={formData.use_tax} onCheckedChange={v => setFormData({ ...formData, use_tax: v })} />
                              </div>

                              {formData.use_tax && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-slate-500">{ppnLabel}</span>
                                  <span className="font-bold text-slate-800">Rp {formatCurrency(tax)}</span>
                                </div>
                              )}

                              <div className="h-px bg-slate-100 my-2"></div>

                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pesanan</span>
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">Rp {formatCurrency(total)}</span>
                              </div>

                              <div className="pt-6 space-y-3">
                                <Button
                                  type="submit"
                                  form="manual-po-form"
                                  disabled={isSaving || formData.items.length === 0 || !formData.supplier_id}
                                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                  Simpan Purchase Order
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 font-medium">
                                  PO akan disimpan sebagai Draft. Anda dapat mengirim ke WhatsApp supplier nanti.
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm rounded-2xl overflow-hidden">
                      <CardContent className="p-5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Catatan Tambahan</Label>
                        <Textarea
                          placeholder="Catatan tambahan untuk PO ini..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="bg-white border-slate-100 rounded-xl focus:ring-slate-400 min-h-[100px] text-sm"
                        />
                      </CardContent>
                    </Card>

                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wider">Panduan Cepat</span>
                      </div>
                      <ul className="text-[10px] text-blue-700/70 space-y-2 font-medium">
                        <li className="flex gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          Pilih supplier terlebih dahulu untuk menampilkan nomor WhatsApp mereka.
                        </li>
                        <li className="flex gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          Anda bisa mengisi nama barang manual tanpa harus memilih dari Master Produk.
                        </li>
                        <li className="flex gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          Klik tombol "Tambah" setelah mengisi detail item di atas tabel.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redesigned PO Detail Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent hideFullscreen={true} className="max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col">
          {viewingOrder && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-6 pr-14 border-b bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-800">Purchase Order {viewingOrder?.po_number}</h2>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            onClick={async () => {
                              const refreshed = await api.entities.PurchaseOrder.get(viewingOrder.id);
                              if (refreshed) setViewingOrder(refreshed);
                              loadData();
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-xl border-slate-200 shadow-xl">
                          <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-blue-500" />
                            Refresh Data
                          </p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Klik untuk mengambil data terbaru dari server, termasuk pembaruan tanda tangan digital dari supplier.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-sm text-slate-500">{viewingOrder?.timestamp_wib}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(viewingOrder?.status)}
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Left Column: Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Supplier Info */}
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        Informasi Supplier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-white">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Supplier</p>
                            <p className="font-bold text-slate-800 text-lg">{viewingOrder?.supplier_name}</p>
                          </div>
                          {(() => {
                            const supplier = suppliers.find(v => v.id === viewingOrder?.supplier_id);
                            return (
                              <>
                                {supplier?.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    {supplier.email}
                                  </div>
                                )}
                                {supplier?.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    WA: {supplier.phone}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-right space-y-3">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Requested Arrival Date</p>
                            <p className="font-bold text-slate-800">{viewingOrder?.delivery_date ? moment.utc(viewingOrder.delivery_date).locale('id').format('dddd, D MMMM YYYY [pukul] HH:mm [WIB]') : '-'}</p>
                          </div>
                          {viewingOrder?.confirmed_delivery_date && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Confirmed Arrival Date (ETA)</p>
                              <p className="font-bold text-emerald-700">{moment.utc(viewingOrder.confirmed_delivery_date).locale('id').format('dddd, D MMMM YYYY [pukul] HH:mm [WIB]')}</p>
                            </div>
                          )}
                          {viewingOrder?.notes && (
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catatan</p>
                              <p className="text-sm text-slate-600 italic">"{viewingOrder.notes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Item List */}
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        Item Pesanan (Harga Awal)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="pl-6">Deskripsi</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center pr-6">Diterima</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(viewingOrder?.original_items || viewingOrder?.items || []).map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="pl-6">
                                <div className="font-bold text-slate-700">{item.product_name || 'Tanpa Nama'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.sku || '-'}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                {item.quantity || 0} <span className="text-slate-900 font-bold">{item.unit || 'pcs'}</span>
                              </TableCell>
                              <TableCell className="text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-semibold">Rp {formatCurrency(item.quantity * item.unit_price)}</TableCell>
                              <TableCell className="text-center pr-6 text-slate-400 text-xs">
                                <span className="font-bold text-blue-600">{getReceivedQty(viewingOrder.po_number, item.product_id, item.product_name)}</span> / {item.quantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-6 bg-slate-50/30">
                        {(() => {
                          const origItems = viewingOrder?.original_items || viewingOrder?.items || [];
                          const origSubtotal = origItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
                          const origTax = viewingOrder?.tax_amount > 0 ? origSubtotal * ppnDecimal : 0;
                          const origTotal = origSubtotal + origTax;
                          return (
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex gap-12 text-sm text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-800 w-32 text-right">Rp {formatCurrency(origSubtotal)}</span>
                              </div>
                              {viewingOrder?.tax_amount > 0 && (
                                <div className="flex gap-12 text-sm text-slate-500">
                                  <span>{ppnLabel}</span>
                                  <span className="font-semibold text-slate-800 w-32 text-right">Rp {formatCurrency(origTax)}</span>
                                </div>
                              )}
                              <div className="flex gap-12 text-lg pt-2 border-t mt-2">
                                <span className="font-black text-slate-800 uppercase tracking-tighter">Total Awal</span>
                                <span className="font-black text-slate-900 w-32 text-right">Rp {formatCurrency(origTotal)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Negotiation Table — only visible after supplier submits negotiation */}
                  {viewingOrder?.status === 'Negotiation' && (
                    <Card className="border border-amber-200 shadow-sm overflow-hidden bg-amber-50/10">
                      <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-amber-600 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Revisi Harga (Hasil Negosiasi)
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-1 mb-2">Ubah harga di bawah ini jika ada penyesuaian harga dengan supplier sebelum PO dikonfirmasi.</p>
                          {viewingOrder?.status === 'Negotiation' && (
                            <div className="mt-2 bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-center justify-between shadow-sm">
                              <div className="flex gap-3 text-xs text-blue-800 leading-relaxed items-center">
                                <Info className="w-4 h-4 shrink-0 text-blue-500" />
                                <p className="font-bold">Butuh Bantuan Navigasi?</p>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-100 px-3 rounded-full border border-blue-200">
                                    Buka Panduan
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 rounded-2xl border-slate-200 shadow-2xl" side="bottom" align="end">
                                  <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-blue-500" />
                                    Panduan Tindak Lanjut
                                  </p>
                                  <ul className="space-y-3">
                                    <li className="flex gap-3">
                                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-[10px] font-bold">1</div>
                                      <p className="text-xs text-slate-600">Jika <b>SETUJU</b> dengan harga Supplier, klik tombol <b>"Setujui Harga Supplier"</b> di menu Actions kanan.</p>
                                    </li>
                                    <li className="flex gap-3">
                                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-[10px] font-bold">2</div>
                                      <p className="text-xs text-slate-600">Jika <b>TIDAK SETUJU</b>, ubah harga di tabel, klik <b>"Simpan Revisi Harga"</b>, lalu gunakan tombol WA untuk ajukan penawaran baru.</p>
                                    </li>
                                  </ul>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead className="pl-6">Deskripsi</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Harga Baru</TableHead>
                              <TableHead className="text-right pr-6">Total Baru</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {negotiationItems.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="pl-6 font-medium text-slate-700">{item.product_name}</TableCell>
                                <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-right">
                                  <NumberInput
                                    value={item.unit_price}
                                    onChange={e => {
                                      const newArr = [...negotiationItems];
                                      newArr[idx].unit_price = Number(e.target.value);
                                      newArr[idx].subtotal = newArr[idx].quantity * newArr[idx].unit_price;
                                      setNegotiationItems(newArr);
                                    }}
                                    className="w-32 text-right h-8 inline-block"
                                  />
                                </TableCell>
                                <TableCell className="text-right pr-6 font-bold">Rp {formatCurrency(item.quantity * item.unit_price)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="p-4 bg-slate-50 flex items-center justify-between">
                          <div className="text-sm text-slate-600">
                            <span className="font-bold text-slate-800">Total Negosiasi:</span> Rp {formatCurrency(negotiationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) * (viewingOrder?.tax_amount > 0 ? 1.11 : 1))}
                          </div>
                          <Button onClick={handleSaveNegotiation} disabled={isSaving} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Simpan Revisi Harga
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Signatures Display */}
                  {(viewingOrder?.supplier_signature || viewingOrder?.admin_signature) && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        {viewingOrder?.admin_signature && (
                          <Card className="border-none shadow-sm bg-white dark:bg-slate-800 p-6 flex flex-col items-center h-full">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-4 tracking-widest">Administrator / Authorized</p>
                            <img src={viewingOrder.admin_signature} alt="Admin Sign" className="h-24 object-contain mb-2 dark:invert dark:brightness-150" />
                            <div className="w-24 h-px bg-slate-200 dark:bg-slate-700 mb-2"></div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{viewingOrder.admin_name || 'Authorized'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{viewingOrder.admin_role || 'Pimpinan'}</p>
                          </Card>
                        )}
                      </div>
                      <div>
                        {viewingOrder?.supplier_signature && (
                          <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 flex flex-col items-center h-full">
                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase mb-4 tracking-widest">
                              <CheckCircle2 className="w-3 h-3" />
                              Supplier Verified Digitally
                            </div>
                            <img src={viewingOrder.supplier_signature} alt="Supplier Sign" className="h-24 object-contain mb-2 grayscale dark:invert dark:brightness-150 hover:grayscale-0 transition-all" />
                            <div className="w-24 h-px bg-blue-200 dark:bg-blue-800 mb-2"></div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{viewingOrder.supplier_name}</p>
                            <p className="text-[10px] text-slate-400">Disetujui pada {moment(viewingOrder.supplier_signed_at).format('D/M/YYYY, HH.mm [WIB]')}</p>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informasi Pengiriman (dari Supplier) */}
                  {viewingOrder?.shipping_confirmation && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                        <Truck className="w-4 h-4 text-amber-500" />
                        Informasi Pengiriman
                        <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-200 bg-amber-50 ml-auto">
                          Dari Supplier
                        </Badge>
                      </h3>
                      <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">No. SJ Supplier</p>
                            <p className="font-black text-slate-800 text-sm">{viewingOrder.shipping_confirmation.supplier_delivery_note_no || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Metode Kirim</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.delivery_method || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Ekspedisi / Kurir</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.courier_name || viewingOrder.shipping_confirmation.driver_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Driver / Pengirim</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.driver_name || viewingOrder.shipping_confirmation.courier_person_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">No. Telp Kurir</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.courier_person_phone || viewingOrder.shipping_confirmation.driver_phone || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">No. Kendaraan</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.vehicle_number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Tipe Kendaraan</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.ship_via || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">No. Resi / Tracking</p>
                            <p className="font-bold text-slate-700 text-xs">{viewingOrder.shipping_confirmation.tracking_number || '-'}</p>
                          </div>
                        </div>
                        {viewingOrder.shipping_confirmation.shipping_notes && (
                          <div className="pt-2 border-t border-amber-100">
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Catatan Pengiriman</p>
                            <p className="font-medium text-slate-600 text-xs mt-1">{viewingOrder.shipping_confirmation.shipping_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* History Section */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Riwayat Persetujuan & Aktivitas
                    </h3>
                    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-48 pl-6">Waktu (WIB)</TableHead>
                            <TableHead className="w-32">Aktivitas</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="pl-6 text-xs text-slate-500 font-medium">{viewingOrder?.timestamp_wib || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600">Draft Created</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">PO dibuat oleh Sistem</TableCell>
                          </TableRow>
                          {viewingOrder?.approval_history?.map((h, i) => (
                            <TableRow key={i}>
                              <TableCell className="pl-6 text-xs text-slate-500 font-medium">{h.time_wib}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-blue-50 text-blue-600 border-blue-100">{h.activity}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">{h.detail}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions Sidebar */}
                <div className="w-80 bg-white border-l p-6 space-y-8 shrink-0 overflow-y-auto max-h-[80vh]">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Actions</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-slate-600 border-slate-200 h-11 hover:bg-slate-50 transition-all shadow-sm"
                        onClick={() => {
                          const content = document.getElementById('print-viewing-po-detail').innerHTML;
                          const htmlContent = `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Purchase Order ${viewingOrder?.po_number}</title>
                              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                              <style>
                                body { margin: 0; padding: 0; background: #f1f5f9; }
                                @media print {
                                  body { background: white; }
                                  @page { margin: 0; size: A4; }
                                }
                              </style>
                            </head>
                            <body>
                              ${content}
                              <script>
                                window.onload = function() {
                                  setTimeout(() => {
                                    window.print();
                                    window.close();
                                  }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `;
                          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const w = window.open(url, '_blank', 'noopener,noreferrer');
                          if (!w) { alert("Popup diblokir! Izinkan popup untuk mencetak."); return; }
                          setTimeout(() => URL.revokeObjectURL(url), 10000);
                        }}
                      >
                        <Printer className="w-5 h-5 mr-3 text-blue-500" />
                        Print PO (Standard)
                      </Button>

                      {/* Cetak Surat Jalan — muncul jika supplier sudah isi SJ number */}
                      {viewingOrder?.shipping_confirmation?.supplier_delivery_note_no && (
                        <Button
                          variant="outline"
                          className="w-full justify-start text-amber-700 border-amber-100 bg-amber-50/50 h-11 hover:bg-amber-100 transition-all shadow-sm"
                          onClick={() => {
                            const content = document.getElementById('print-viewing-po-sj')?.innerHTML;
                            if (!content) return;
                            const htmlContent = `<!DOCTYPE html><html><head>
                              <title>Surat Jalan ${viewingOrder?.shipping_confirmation?.supplier_delivery_note_no}</title>
                              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                              <style>body{margin:0;padding:0;background:#f1f5f9}@media print{body{background:white}@page{margin:0;size:A4}}</style>
                            </head><body>
                              ${content}
                              <script>window.onload=function(){setTimeout(()=>{window.print();window.close()},500)};</script>
                            </body></html>`;
                            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const w = window.open(url, '_blank', 'noopener,noreferrer');
                            if (!w) { alert("Popup diblokir! Izinkan popup untuk mencetak."); return; }
                            setTimeout(() => URL.revokeObjectURL(url), 10000);
                          }}
                        >
                          <Truck className="w-5 h-5 mr-3 text-amber-500" />
                          Cetak Surat Jalan
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="w-full justify-start text-emerald-700 border-emerald-100 bg-emerald-50/50 h-11 hover:bg-emerald-100 transition-all shadow-sm"
                        onClick={() => {
                          const supplierPhone = suppliers.find(s => s.id === viewingOrder?.supplier_id)?.phone;
                          const phone = supplierPhone?.replace(/[^0-9]/g, '');
                          const publicLink = `${window.location.origin}/public/po/${viewingOrder?.id}/sign`;
                          if (phone) {
                            const message = viewingOrder?.status === 'Confirmed'
                              ? `Halo, berikut adalah Purchase Order Final ${viewingOrder?.po_number} yang telah ditandatangani lengkap. Anda dapat mengunduh salinannya di sini: ${publicLink}`
                              : `Halo, berikut adalah Purchase Order ${viewingOrder?.po_number}. Silakan tinjau dan tanda tangani dokumen di sini: ${publicLink}`;

                            window.open(`https://wa.me/${phone.startsWith('0') ? '62' + phone.slice(1) : phone}?text=${encodeURIComponent(message)}`, '_blank');
                          } else {
                            alert("Nomor WA supplier tidak tersedia.");
                          }
                        }}
                      >
                        <Smartphone className="w-5 h-5 mr-3 text-emerald-500" />
                        {viewingOrder?.status === 'Confirmed' ? 'Kirim PO Final via WA' : 'Kirim Link PO via WA'}
                      </Button>
                      {/* Action Buttons based on status */}
                      {viewingOrder?.status === 'Negotiation' ? (
                        <div className="space-y-3 pt-2">
                          <Button
                            onClick={() => setShowSignaturePad(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 h-11 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-white font-bold"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Setujui & Tanda Tangan
                          </Button>
                          <Button
                            onClick={() => handleWhatsAppClick(viewingOrder)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-white font-bold"
                          >
                            <MessageSquare className="w-5 h-5" />
                            Ajukan Penawaran Baru
                          </Button>
                        </div>
                      ) : (
                        <>
                          {viewingOrder?.status !== 'Confirmed' && viewingOrder?.status !== 'Cancelled' && (
                            <Button
                              onClick={() => handleWhatsAppClick(viewingOrder)}
                              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 h-11 transition-all shadow-md hover:shadow-lg text-white font-bold"
                            >
                              <MessageSquare className="w-5 h-5 mr-3" />
                              WhatsApp Supplier
                            </Button>
                          )}

                          {/* Status Approved: supplier belum isi shipping → kirim reminder via WA */}
                          {viewingOrder?.status === 'Approved' && !viewingOrder?.shipping_confirmation?.supplier_delivery_note_no && (
                            <div className="space-y-3 pt-2">
                              <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 h-11 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-white font-bold"
                                onClick={() => {
                                  const supplierPhone = suppliers.find(s => s.id === viewingOrder?.supplier_id)?.phone;
                                  const phone = supplierPhone?.replace(/[^0-9]/g, '');
                                  const publicLink = `${window.location.origin}/public/po/${viewingOrder?.id}/sign`;
                                  if (phone) {
                                    const message = `Halo, terima kasih telah menyetujui PO ${viewingOrder?.po_number}. Silakan lengkapi detail pengiriman (No. Surat Jalan, driver, kendaraan) melalui link berikut agar kami dapat memproses penerimaan barang: ${publicLink}`;
                                    window.open(`https://wa.me/${phone.startsWith('0') ? '62' + phone.slice(1) : phone}?text=${encodeURIComponent(message)}`, '_blank');
                                  } else {
                                    alert("Nomor WA supplier tidak tersedia.");
                                  }
                                }}
                              >
                                <Truck className="w-5 h-5" />
                                Kirim Form Pengiriman via WA
                              </Button>
                              <p className="text-[10px] text-center text-amber-600 font-bold bg-amber-50 py-2 rounded-lg border border-amber-100">
                                Supplier sudah setuju harga. Menunggu isi detail pengiriman (Fase 2).
                              </p>
                            </div>
                          )}

                          {/* Status In Transit: barang sudah dikirim → admin bisa konfirmasi & TTD */}
                          {viewingOrder?.status === 'In Transit' && !viewingOrder?.admin_signature && (
                            <div className="space-y-3 pt-2">
                              <Button
                                onClick={() => setShowSignaturePad(true)}
                                className="w-full bg-blue-600 hover:bg-blue-700 h-11 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group text-white font-bold"
                              >
                                <Signature className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Konfirmasi & Tanda Tangan
                              </Button>
                              <p className="text-[10px] text-center text-slate-500 font-medium italic">
                                Barang sedang dikirim. Klik untuk konfirmasi penerimaan & tanda tangan admin.
                              </p>
                            </div>
                          )}

                          {viewingOrder?.status === 'Sent' && (
                            <p className="text-[10px] text-center text-blue-600 font-bold bg-blue-50 py-2 rounded-lg border border-blue-100">
                              Menunggu Persetujuan/Negosiasi Supplier...
                            </p>
                          )}
                        </>
                      )}

                      {!viewingOrder?.admin_signature && (
                        <div className="pt-4 space-y-2 border-t text-left">
                          <Label className="text-[10px] font-bold text-red-600 uppercase px-1">Danger Zone</Label>
                          <Textarea
                            placeholder="Alasan pembatalan..."
                            className="text-xs min-h-[80px] bg-slate-50 border-slate-100"
                            value={cancellationReason}
                            onChange={e => setCancellationReason(e.target.value)}
                          />
                          <Button
                            variant="destructive"
                            className="w-full h-10"
                            onClick={handleCancelPo}
                            disabled={!cancellationReason || isSaving}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Batalkan PO
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Delegasi Approval (Opsional)</h3>
                    <div className="space-y-2">
                      <Input
                        placeholder="email@example.com"
                        className="text-xs bg-slate-50 h-10"
                        value={delegateApproval}
                        onChange={e => setDelegateApproval(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Related PR</h3>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-10 text-slate-600 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        if (viewingOrder?.pr_number) {
                          // Simple way to navigate and filter
                          window.location.hash = `#/PurchaseRequisition?search=${viewingOrder.pr_number}`;
                          setViewingOrder(null);
                        }
                      }}
                    >
                      <FileSearch className="w-4 h-4 mr-2 text-slate-400" />
                      Lihat PR {viewingOrder?.pr_number || '-'}
                      <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Signature Dialog */}
      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tulis Tanda Tangan Digital</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama</Label>
                <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Nama Lengkap" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Jabatan</Label>
                <Input value={adminRole} onChange={e => setAdminRole(e.target.value)} placeholder="Jabatan" />
              </div>
            </div>

            {signatureHistory.length > 0 && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Dari Riwayat</Label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {signatureHistory.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAdminName(h.name);
                        setAdminRole(h.role);
                        handleAdminSign(h.signature);
                      }}
                      className="flex-shrink-0 group relative"
                    >
                      <div className="w-20 h-20 rounded-xl border border-slate-100 bg-slate-50/50 p-2 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center overflow-hidden">
                        <img src={h.signature} alt="History Sign" className="max-h-full max-w-full object-contain grayscale dark:invert dark:brightness-150 group-hover:grayscale-0 transition-all" />
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 mt-1 truncate w-20 text-center uppercase">{h.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan Baru</Label>
              <div className="p-2 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <SignaturePad
                  onSave={handleAdminSign}
                  title="Administrator Authorized Signature"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div id="print-viewing-po-detail" className="hidden">
        {viewingOrder && (
          <div
            dangerouslySetInnerHTML={{
              __html: getDocumentTemplate({
                type: 'PURCHASE ORDER',
                storeName: store?.store_name || 'TOKO ANDA',
                logoUrl: store?.logo_url,
                brandColor: store?.brand_color || '#2563eb',
                titleColor: store?.title_color || '#0f172a',
                data: {
                  ...viewingOrder,
                  supplier_phone: suppliers.find(s => s.id === viewingOrder.supplier_id)?.phone,
                  supplier_email: suppliers.find(s => s.id === viewingOrder.supplier_id)?.email,
                  supplier_address: suppliers.find(s => s.id === viewingOrder.supplier_id)?.address,
                  store_address: store?.address
                }
              })
            }}
          />
        )}
      </div>

      {/* Hidden Surat Jalan Print Template */}
      <div id="print-viewing-po-sj" className="hidden">
        {viewingOrder?.shipping_confirmation?.supplier_delivery_note_no && (
          <div
            dangerouslySetInnerHTML={{
              __html: (() => {
                const relatedReceipt = receipts.find(r => r.po_number === viewingOrder.po_number);
                return getDocumentTemplate({
                  type: 'DELIVERY ORDER',
                  storeName: store?.store_name || 'TOKO ANDA',
                  logoUrl: store?.logo_url,
                  brandColor: store?.brand_color || '#2563eb',
                  titleColor: store?.title_color || '#0f172a',
                  layout: store?.invoice_layout_style || 'Modern',
                  data: {
                    ...viewingOrder,
                    received_signature: relatedReceipt?.received_signature,
                    received_by: relatedReceipt?.received_by,
                    no: viewingOrder.shipping_confirmation.supplier_delivery_note_no,
                    po_reference: viewingOrder.po_number,
                    supplier_sj_number: viewingOrder.shipping_confirmation.supplier_delivery_note_no,
                    delivery_date: (viewingOrder.confirmed_delivery_date || viewingOrder.delivery_date)
                      ? moment.utc(viewingOrder.confirmed_delivery_date || viewingOrder.delivery_date).format('DD/MM/YYYY HH:mm [WIB]')
                      : '-',
                    supplier_phone: suppliers.find(s => s.id === viewingOrder.supplier_id)?.phone,
                    supplier_email: suppliers.find(s => s.id === viewingOrder.supplier_id)?.email,
                    supplier_address: suppliers.find(s => s.id === viewingOrder.supplier_id)?.address,
                    store_address: store?.address
                  }
                });
              })()
            }}
          />
        )}
      </div>

      <div id="print-po-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.flatMap((order) =>
              order.items?.map((item, idx) => (
                <TableRow key={`${order.id}-${idx}`}>
                  {idx === 0 ? (
                    <>
                      <TableCell rowSpan={order.items.length || 1} className="font-bold border-r">{order.po_number}</TableCell>
                      <TableCell rowSpan={order.items.length || 1} className="border-r">{order.timestamp_wib}</TableCell>
                      <TableCell rowSpan={order.items.length || 1} className="border-r">
                        <div className="font-semibold">{order.supplier_name}</div>
                        {suppliers.find(v => v.id === order.supplier_id)?.phone && <div>{suppliers.find(v => v.id === order.supplier_id)?.phone}</div>}
                        {suppliers.find(v => v.id === order.supplier_id)?.email && <div>{suppliers.find(v => v.id === order.supplier_id)?.email}</div>}
                      </TableCell>
                      <TableCell rowSpan={order.items.length || 1} className="border-r">{order.status}</TableCell>
                    </>
                  ) : null}
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>Rp {formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>Rp {formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              )) || []
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
