import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Eye, Truck, Loader2, ArrowLeft, Package, Check, ClipboardCheck, Info, MapPin, Gauge, Search, Clock, X, Building2, UserCircle, Signature, FileSearch, ShieldCheck, Send, RefreshCw, RotateCcw, Printer, Boxes } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/layout/PageHeader';
import moment from 'moment';
import 'moment/locale/id';
import SignaturePad from '@/components/ui/SignaturePad';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { getDocumentTemplate } from '@/utils/documentTemplates';

// Info Tooltip for GRN fields
const InfoTip = ({ text }) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button"
          className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0 ml-1.5 cursor-pointer">
          <Info className="w-2.5 h-2.5 pointer-events-none" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="bg-slate-900 text-white text-[11px] font-medium leading-relaxed p-3 rounded-xl shadow-xl w-60 border-slate-800 z-[9999]"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
};

export default function GoodsReceipt({ store }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [receipts, setReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [allPurchaseOrders, setAllPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Signature States
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showDriverSignaturePad, setShowDriverSignaturePad] = useState(false);
  const [showManagerSignaturePad, setShowManagerSignaturePad] = useState(false);

  const [driverSignerName, setDriverSignerName] = useState('');
  const [managerSignerName, setManagerSignerName] = useState('Gudang Manager');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivedItems, setReceivedItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const { selectedDate, formattedDate, isToday } = useGlobalDate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [actualArrivalAt, setActualArrivalAt] = useState(moment().format('YYYY-MM-DDTHH:mm'));
  const [confirmedDateSnapshot, setConfirmedDateSnapshot] = useState('');

  const [grForm, setGrForm] = useState({
    surat_jalan: localStorage.getItem('last_gr_surat_jalan') || '',
    vehicle_no: localStorage.getItem('last_gr_vehicle_no') || '',
    driver_name: localStorage.getItem('last_gr_driver_name') || '',
    driver_phone: localStorage.getItem('last_gr_driver_phone') || '',
    storage_location: localStorage.getItem('last_gr_storage_location') || '',
    delivery_method: '',
    courier_name: '',
    ship_via: '',
    tracking_number: '',
    notes: ''
  });

  const [signerName, setSignerName] = useState('Administrator');
  const [signerRole, setSignerRole] = useState('');

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  // REALTIME: Auto-update GRN detail when driver signs from public portal
  useEffect(() => {
    if (!viewingReceipt?.id) return;
    const channel = supabase
      .channel(`grn_detail_${viewingReceipt.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'goods_receipts',
        filter: `id=eq.${viewingReceipt.id}`
      }, (payload) => {
        console.log('[GRN Realtime] Auto-updated:', payload.new?.driver_signature ? 'Driver signed' : 'Updated');
        setViewingReceipt(payload.new);
        loadData();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [viewingReceipt?.id]);

  const loadData = async () => {
    try {
      const [receiptsData, poData, locationsData, suppliersData] = await Promise.all([
        api.entities.GoodsReceipt.filter({ store_id: store.id }, '-created_date'),
        api.entities.PurchaseOrder.filter({ store_id: store.id }),
        api.entities.ProductLocation.filter({ store_id: store.id }),
        api.entities.Supplier.filter({ store_id: store.id })
      ]);

      setSuppliers(suppliersData);

      // Only show POs that can be received AND don't already have a GRN
      const poIdsWithGRN = new Set(receiptsData.map(r => r.po_id).filter(Boolean));
      const activePOs = poData.filter(po =>
        ['Sent', 'Confirmed', 'Approved', 'Partial Received'].includes(po.status) &&
        !poIdsWithGRN.has(po.id)
      );

      setReceipts(receiptsData);
      setPurchaseOrders(activePOs);
      setAllPurchaseOrders(poData);
      setLocations(locationsData);
    } catch (err) {
      console.error("Failed to load GRN data", err);
    }
    setIsLoading(false);
  };

  // Filter by global selected date, status, and search term
  const filteredReceipts = receipts.filter(r => {
    const isDateMatch = matchesDate(r, selectedDate);
    const isStatusMatch = statusFilter === 'Semua Status' || r.status === statusFilter;
    const isSearchMatch = !searchTerm ||
      r.gr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return isDateMatch && isStatusMatch && isSearchMatch;
  });

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const getWIBTimestamp = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;
  };

  const handleSelectPO = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setConfirmedDateSnapshot(po.confirmed_delivery_date || po.delivery_date);

      // Auto-fill SJ dan shipping details dari supplier confirmation
      if (po.shipping_confirmation) {
        setGrForm(prev => ({
          ...prev,
          surat_jalan: po.shipping_confirmation.supplier_delivery_note_no || prev.surat_jalan,
          driver_name: po.shipping_confirmation.driver_name || po.shipping_confirmation.courier_person_name || prev.driver_name,
          driver_phone: po.shipping_confirmation.driver_phone || po.shipping_confirmation.courier_person_phone || prev.driver_phone,
          vehicle_no: po.shipping_confirmation.vehicle_number || prev.vehicle_no,
          delivery_method: po.shipping_confirmation.delivery_method || prev.delivery_method,
          courier_name: po.shipping_confirmation.courier_name || prev.courier_name,
          ship_via: po.shipping_confirmation.ship_via || prev.ship_via,
          tracking_number: po.shipping_confirmation.tracking_number || po.shipping_confirmation.tracking_no || prev.tracking_number,
        }));
      }

      setReceivedItems(po.items.map(item => ({
        ...item,
        sku: item.sku || '',
        qty_ordered: item.quantity,
        received_qty: item.quantity,
        reject_qty: 0,
        backorder_qty: 0,
        accepted_qty: item.quantity,
        qc_status: 'Passed',
        warehouse_bin: '',
        condition: 'Baik'
      })));
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedPO(null);
    setReceivedItems([]);
    setGrForm({
      surat_jalan: localStorage.getItem('last_gr_surat_jalan') || '',
      vehicle_no: localStorage.getItem('last_gr_vehicle_no') || '',
      driver_name: localStorage.getItem('last_gr_driver_name') || '',
      driver_phone: localStorage.getItem('last_gr_driver_phone') || '',
      storage_location: localStorage.getItem('last_gr_storage_location') || '',
      notes: ''
    });
  };

  const updateItemField = (idx, field, value) => {
    setReceivedItems(receivedItems.map((item, i) => {
      if (i !== idx) return item;
      let updated = { ...item, [field]: value };

      // Auto-calculate Accepted Qty
      if (field === 'received_qty' || field === 'reject_qty') {
        const received = field === 'received_qty' ? Number(value) : Number(item.received_qty);
        const reject = field === 'reject_qty' ? Number(value) : Number(item.reject_qty);
        updated.accepted_qty = Math.max(0, received - reject);


      }

      // Validation: Received + Backorder <= Ordered
      if (field === 'backorder_qty' || field === 'received_qty') {
        const received = field === 'received_qty' ? Number(value) : Number(item.received_qty);
        const backorder = field === 'backorder_qty' ? Number(value) : Number(item.backorder_qty);
        if (received + backorder > item.qty_ordered) {
          toast({
            title: "Peringatan Qty",
            description: `Total Received + Backorder (${received + backorder}) melebihi Qty Pesanan (${item.qty_ordered})`,
            variant: "destructive"
          });
        }
      }

      return updated;
    }));
  };



  const handleSubmit = () => {
    if (!selectedPO) return;
    setShowConfirmSubmit(true);
  };

  const processSubmit = async () => {
    setShowConfirmSubmit(false);
    setIsSaving(true);
    const grNumber = `GRN-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const totalValue = receivedItems.reduce((sum, item) => sum + (item.accepted_qty * item.unit_price), 0);
    const wibTimestamp = getWIBTimestamp();

    try {
      // Create goods receipt with enterprise fields
      await api.entities.GoodsReceipt.create({
        store_id: store.id,
        gr_number: grNumber,
        po_id: selectedPO.id,
        po_number: selectedPO.po_number,
        supplier_name: selectedPO.supplier_name,
        supplier_address: selectedPO.supplier_address || '',
        supplier_phone: selectedPO.supplier_phone || '',
        supplier_email: selectedPO.supplier_email || '',
        confirmed_delivery_date: selectedPO.confirmed_delivery_date || selectedPO.delivery_date,
        delivery_reference_snapshot: {
          ...(selectedPO.shipping_confirmation || {}),
          confirmed_delivery_date: selectedPO.confirmed_delivery_date || selectedPO.delivery_date,
          delivery_method: grForm.delivery_method,
          courier_name: grForm.courier_name,
          ship_via: grForm.ship_via,
          tracking_number: grForm.tracking_number
        },
        actual_arrival_at: actualArrivalAt,
        items: receivedItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku || '',
          qty_ordered: item.qty_ordered,
          received_qty: Number(item.received_qty),
          reject_qty: Number(item.reject_qty || 0),
          backorder_qty: Number(item.backorder_qty || 0),
          accepted_qty: Number(item.accepted_qty || 0),
          qc_status: item.qc_status || 'Passed',
          warehouse_bin: item.warehouse_bin || '',
          condition: item.condition || 'Baik',
          unit_price: item.unit_price,
          unit: item.unit || 'pcs',
          category: item.category || 'Uncategorized'
        })),
        total_value: totalValue,
        status: 'Draft',
        receiving_status: 'pending',
        timestamp_wib: wibTimestamp,
        surat_jalan: grForm.surat_jalan,
        vehicle_no: grForm.vehicle_no,
        driver_name: grForm.driver_name,
        driver_phone: grForm.driver_phone,
        storage_location: grForm.storage_location,
        notes: grForm.notes
      });

      // Save to localStorage so it autofills next time
      localStorage.setItem('last_gr_surat_jalan', grForm.surat_jalan);
      localStorage.setItem('last_gr_vehicle_no', grForm.vehicle_no);
      localStorage.setItem('last_gr_driver_name', grForm.driver_name);
      localStorage.setItem('last_gr_driver_phone', grForm.driver_phone);
      localStorage.setItem('last_gr_storage_location', grForm.storage_location);

      setShowForm(false);
      setSelectedPO(null);
      setReceivedItems([]);
      loadData();

      toast({
        title: "GRN Berhasil Disimpan",
        description: `Goods Receipt ${grNumber} telah masuk antrean verifikasi.`,
      });
    } catch (err) {
      console.error("Failed to save GRN", err);
      toast({
        title: "Gagal Menyimpan GRN",
        description: err.message || "Terjadi kesalahan pada server. Pastikan skema database sudah diperbarui.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyReceipt = async () => {
    if (!viewingReceipt || viewingReceipt.status === 'Posted') return;
    setIsSaving(true);

    try {
      // 1. Update GRN status to Terverifikasi
      await api.entities.GoodsReceipt.update(viewingReceipt.id, {
        status: 'Terverifikasi',
        verified_at: getWIBTimestamp()
      });

      // 2. Update PO status and items received_qty
      const poList = await api.entities.PurchaseOrder.filter({ id: viewingReceipt.po_id });
      if (poList.length > 0) {
        const po = poList[0];
        const allGrns = await api.entities.GoodsReceipt.filter({ po_id: po.id });
        const activeGrns = [...allGrns.filter(g => g.id !== viewingReceipt.id && (g.status === 'Terverifikasi' || g.status === 'Posted')), { ...viewingReceipt, status: 'Terverifikasi' }];

        let allReceived = true;
        const updatedItems = po.items.map(poItem => {
          const totalReceived = activeGrns.reduce((sum, g) => {
            const itemMatch = g.items?.find(i => i.product_id === poItem.product_id || (i.sku && i.sku === poItem.sku));
            return sum + (itemMatch?.received_qty || 0);
          }, 0);
          if (totalReceived < poItem.quantity) allReceived = false;
          return { ...poItem, received_qty: totalReceived };
        });

        await api.entities.PurchaseOrder.update(po.id, {
          status: allReceived ? 'Fully Received' : 'Partial Received',
          items: updatedItems
        });
      }

      setViewingReceipt(null);
      loadData();
    } catch (error) {
      console.error("Verification failed", error);
    }
    setIsSaving(false);
  };

  const handleAdminSign = async (signatureData) => {
    if (!viewingReceipt) return;
    try {
      await api.entities.GoodsReceipt.update(viewingReceipt.id, {
        admin_signature: signatureData,
        received_signature: signatureData, // Auto-sync for document template
        admin_name: signerName || 'Administrator',
        admin_role: signerRole || 'Warehouse Staff',
        received_by: signerName || 'Administrator', // Auto-sync for document template
        signed_at: getWIBTimestamp()
      });
      setShowSignaturePad(false);
      setViewingReceipt(prev => ({
        ...prev,
        admin_signature: signatureData,
        received_signature: signatureData,
        admin_name: signerName || 'Administrator',
        admin_role: signerRole || 'Warehouse Staff',
        received_by: signerName || 'Administrator'
      }));
      loadData();
    } catch (error) {
      console.error("Signature save failed", error);
    }
  };

  const handleManagerSign = async (signatureData) => {
    if (!viewingReceipt) return;
    try {
      await api.entities.GoodsReceipt.update(viewingReceipt.id, {
        warehouse_manager_signature: signatureData,
        warehouse_manager_name: managerSignerName || 'Warehouse Manager',
        manager_signed_at: getWIBTimestamp()
      });
      setShowManagerSignaturePad(false);
      setViewingReceipt(prev => ({
        ...prev,
        warehouse_manager_signature: signatureData,
        warehouse_manager_name: managerSignerName || 'Warehouse Manager'
      }));
      loadData();
    } catch (error) {
      console.error("Manager signature save failed", error);
    }
  };

  const handleDriverSign = async (signatureData) => {
    if (!viewingReceipt) return;
    try {
      await api.entities.GoodsReceipt.update(viewingReceipt.id, {
        driver_signature: signatureData,
        driver_name: driverSignerName || viewingReceipt.driver_name || 'Driver',
        driver_signed_at: getWIBTimestamp()
      });
      setShowDriverSignaturePad(false);
      setViewingReceipt(prev => ({
        ...prev,
        driver_signature: signatureData,
        driver_name: driverSignerName || prev.driver_name || 'Driver'
      }));
      loadData();
    } catch (error) {
      console.error("Driver signature save failed", error);
    }
  };

  const openViewingReceipt = (r) => {
    setViewingReceipt(r);
    setEditDriverPhone(r.driver_phone || '');
  };

  const handleSaveDriverPhone = async () => {
    if (!viewingReceipt) return;
    try {
      await api.entities.GoodsReceipt.update(viewingReceipt.id, { driver_phone: editDriverPhone });
      setViewingReceipt(prev => ({ ...prev, driver_phone: editDriverPhone }));
      toast({ title: 'Nomor HP Supir Disimpan', description: `Nomor ${editDriverPhone} berhasil disimpan.` });
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleRefreshDetail = async () => {
    if (!viewingReceipt) return;
    setIsSaving(true);
    try {
      const refreshed = await api.entities.GoodsReceipt.get(viewingReceipt.id);
      if (refreshed) {
        setViewingReceipt(refreshed);
        setEditDriverPhone(refreshed.driver_phone || '');
        loadData();
        toast({ title: 'Data Sinkron', description: 'Informasi GRN berhasil diperbarui dari server.' });
      }
    } catch (err) {
      console.error("Refresh failed", err);
      toast({ title: 'Gagal Sinkron', description: 'Terjadi kesalahan saat mengambil data terbaru.', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleWhatsAppDriver = (grn) => {
    if (!grn.driver_phone) {
      toast({
        title: "Nomor HP Supir Kosong",
        description: "Silakan isi nomor HP supir pada kolom 'No. HP Supir' di atas, lalu klik 'Simpan' sebelum menggunakan fitur WhatsApp.",
        variant: "destructive"
      });
      return;
    }
    if (!grn.received_signature && !grn.admin_signature) {
      toast({
        title: "Tanda Tangan Gudang Wajib",
        description: "Staf gudang (penerima) wajib memberikan tanda tangan digital terlebih dahulu sebelum membagikan link ke supir.",
        variant: "destructive"
      });
      return;
    }
    const publicUrl = `${window.location.origin}/public/grn/${grn.id}/sign`;
    const message = `Halo Bapak/Ibu Driver dari ${grn.supplier_name},\n\nBerikut adalah GOODS RECEIPT NOTES (GRN No: ${grn.gr_number}) dari kami.\n\nMohon untuk mengecek rincian barang dan memberikan tanda tangan secara digital pada link berikut:\n\n${publicUrl} \n\nTerima kasih.`;

    let phone = grn.driver_phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status) => {
    const styles = {
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Terverifikasi: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
      Posted: 'bg-blue-600 text-white border-blue-600'
    };
    return <Badge variant="outline" className={`${styles[status] || styles.Draft} font-semibold px-2.5 py-0.5 rounded-full border`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Penerimaan barang dari PO"
        icon={ClipboardCheck}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar
              title="Goods Receipt Notes"
              date={moment().format('DD MMMM YYYY')}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-gr-detailed"
            />
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Penerimaan Baru
            </Button>
          </div>
        }
      />
      <PageDatePicker />

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nomor GRN, nomor PO atau supplier..."
            className="pl-10 h-11 bg-white border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] h-11 bg-white border-slate-200 text-slate-600">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua Status">Semua Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Posted">Posted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead className="w-64 pl-6">GRN Number</TableHead>
                <TableHead>No. PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada penerimaan barang untuk tanggal ini
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt, idx) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800 whitespace-nowrap" title={receipt.gr_number}>{receipt.gr_number}</div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {receipt.timestamp_wib ? moment(receipt.timestamp_wib.split(' ')[0], 'DD/MM/YYYY').locale('id').format('dddd, DD MMMM YYYY') : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 whitespace-nowrap" title={receipt.po_number}>{receipt.po_number}</TableCell>
                    <TableCell>{receipt.supplier_name}</TableCell>
                    <TableCell className="text-right font-medium">Rp {formatCurrency(receipt.total_value)}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell className="text-center pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewingReceipt(receipt)}
                        className="rounded-full hover:bg-slate-100"
                      >
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

      {/* Redesigned Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent hideFullscreen={true} className={selectedPO ? "max-w-[95vw] xl:max-w-[1400px] p-0 md:overflow-hidden overflow-y-auto bg-white h-[95vh] md:h-auto flex flex-col" : "max-w-2xl"}>
          {!selectedPO ? (
            <div className="p-6 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-900" />
                  Mulai Penerimaan Barang
                </DialogTitle>
                <p className="text-sm text-slate-500">Silakan pilih Purchase Order yang akan diproses barangnya</p>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Purchase Order</Label>
                <Select onValueChange={handleSelectPO}>
                  <SelectTrigger className="h-14 border-2 border-slate-100 hover:border-slate-300 transition-all text-base px-4">
                    <SelectValue placeholder="Pilih PO untuk diproses..." />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">Tidak ada PO aktif yang siap diterima</div>
                    ) : (
                      purchaseOrders.map(po => (
                        <SelectItem key={po.id} value={po.id} className="py-3">
                          <div className="flex flex-col relative">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{po.po_number}</span>
                              {po.timestamp_wib?.includes(moment().format('DD/MM/YYYY')) && (
                                <Badge className="bg-blue-600 text-[9px] h-4 px-1.5 font-black uppercase text-white animate-pulse">NEW</Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">{po.supplier_name} • Rp {formatCurrency(po.total)} • {po.timestamp_wib?.split(' ')[0]}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hanya Purchase Order dengan status <b>Sent</b>, <b>Approved</b>, atau <b>Confirmed</b> yang muncul di daftar ini. Jika PO Anda tidak muncul, pastikan PO tersebut sudah disetujui Administrator atau Supplier.
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={resetForm} className="text-slate-500">Batal</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col md:h-[90vh] min-w-0 w-full overflow-hidden">
              {/* Form Header */}
              <div className="p-6 pr-14 border-b bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPO(null)} className="rounded-full hover:bg-slate-100">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      Detail Penerimaan PO: {selectedPO.po_number}
                    </h2>
                    <p className="text-sm text-slate-500">{selectedPO.supplier_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
                {/* Left Side: Items & Details */}
                <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                  {/* Receiving Items Table */}
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b py-4 px-6 flex flex-row items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-slate-500" />
                        Items yang Diterima
                      </h3>
                    </CardHeader>
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[1000px]">
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="pl-6">Produk</TableHead>
                            <TableHead className="text-center w-28">SKU</TableHead>
                            <TableHead className="text-center w-20"><div className="flex items-center justify-center">Ordered <InfoTip text="Kuantitas pesanan di PO" /></div></TableHead>
                            <TableHead className="text-center w-24"><div className="flex items-center justify-center">Received <InfoTip text="Jumlah fisik tiba di gudang" /></div></TableHead>
                            <TableHead className="text-center w-24"><div className="flex items-center justify-center">Reject <InfoTip text="Jumlah barang rusak/ditolak" /></div></TableHead>
                            <TableHead className="text-center w-24"><div className="flex items-center justify-center">B.Order <InfoTip text="Kekurangan (Backorder)" /></div></TableHead>

                            <TableHead className="text-center w-24 bg-blue-50/50"><div className="flex items-center justify-center">Accepted <InfoTip text="Final diterima masuk stok" /></div></TableHead>
                            <TableHead className="text-center w-32"><div className="flex items-center justify-center">QC Status <InfoTip text="Status Quality Control" /></div></TableHead>
                            <TableHead className="text-center w-32 pr-6"><div className="flex items-center justify-center">Condition <InfoTip text="Kondisi visual barang" /></div></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {receivedItems.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/30 transition-colors">
                              <TableCell className="pl-6 py-4">
                                <p className="font-bold text-slate-800 text-xs">{item.product_name}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Rp {formatCurrency(item.unit_price)} / {item.unit}</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  className="h-8 text-[10px] text-center border-slate-200 bg-slate-50/50 font-bold"
                                  value={item.sku}
                                  onChange={(e) => updateItemField(idx, 'sku', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center font-bold text-slate-400 text-xs">{item.qty_ordered}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  className="h-9 text-center font-black text-slate-900 border-blue-100 bg-blue-50/30 focus:ring-blue-500 text-xs"
                                  value={item.received_qty}
                                  onChange={(e) => updateItemField(idx, 'received_qty', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  className="h-9 text-center font-black text-red-600 border-red-100 bg-red-50/30 focus:ring-red-500 text-xs"
                                  value={item.reject_qty}
                                  onChange={(e) => updateItemField(idx, 'reject_qty', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  className="h-9 text-center font-bold text-amber-600 border-amber-100 bg-amber-50/30 text-xs"
                                  value={item.backorder_qty}
                                  onChange={(e) => updateItemField(idx, 'backorder_qty', e.target.value)}
                                />
                              </TableCell>

                              <TableCell className="text-center bg-blue-50/50">
                                <span className="font-black text-blue-700 text-xs">{item.accepted_qty}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Select value={item.qc_status} onValueChange={(val) => updateItemField(idx, 'qc_status', val)}>
                                  <SelectTrigger className="h-8 text-[10px] font-bold border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Passed">Passed (Post)</SelectItem>
                                    <SelectItem value="Pending QC">Pending QC</SelectItem>
                                    <SelectItem value="Quarantine">Quarantine</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center pr-6">
                                <Select value={item.condition} onValueChange={(val) => updateItemField(idx, 'condition', val)}>
                                  <SelectTrigger className="h-8 text-[10px] font-bold border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Baik">Baik</SelectItem>
                                    <SelectItem value="Rusak Sebagian">Rusak Sebagian</SelectItem>
                                    <SelectItem value="Rusak Total">Rusak Total</SelectItem>
                                    <SelectItem value="Kemasan Terbuka">Kemasan Terbuka</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>

                  {/* Delivery Info Grid */}
                  <Card className="border-none shadow-sm p-6 bg-white space-y-6">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Informasi Tambahan Pengiriman
                      <InfoTip text="Data pengiriman di bawah ini otomatis tersinkronisasi dari konfirmasi Surat Jalan Supplier (jika ada). Anda tetap dapat mengubahnya secara manual jika terjadi perbedaan di lapangan." />
                    </h3>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">Surat Jalan Supplier <InfoTip text="Nomor surat jalan dari supplier." /></Label>
                        <Input
                          placeholder="Contoh: SJ-2024-001"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.surat_jalan}
                          onChange={(e) => setGrForm({ ...grForm, surat_jalan: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode Pengiriman</Label>
                        <Input
                          placeholder="Contoh: Ekspedisi Eksternal"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.delivery_method}
                          onChange={(e) => setGrForm({ ...grForm, delivery_method: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ekspedisi / Kurir</Label>
                        <Input
                          placeholder="Contoh: J&T Express"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.courier_name}
                          onChange={(e) => setGrForm({ ...grForm, courier_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Resi / Tracking</Label>
                        <Input
                          placeholder="Nomor resi jika ada"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.tracking_number}
                          onChange={(e) => setGrForm({ ...grForm, tracking_number: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">Nama Driver <InfoTip text="Nama supir yang mengantarkan barang." /></Label>
                        <Input
                          placeholder="Masukkan nama supir pengirim"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.driver_name}
                          onChange={(e) => setGrForm({ ...grForm, driver_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">No. Telp Driver <InfoTip text="Nomor kontak supir untuk koordinasi di lapangan." /></Label>
                        <Input
                          placeholder="Contoh: 081234567890"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.driver_phone}
                          onChange={(e) => setGrForm({ ...grForm, driver_phone: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">Tipe Kendaraan</Label>
                        <Input
                          placeholder="Contoh: Motor, Mobil Box"
                          className="h-11 bg-slate-50 border-slate-200"
                          value={grForm.ship_via}
                          onChange={(e) => setGrForm({ ...grForm, ship_via: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">Nomor Kendaraan <InfoTip text="Nomor plat kendaraan pengirim." /></Label>
                        <Input
                          placeholder="Contoh: B 1234 XYZ"
                          className="h-11 bg-slate-50 border-slate-200 uppercase"
                          value={grForm.vehicle_no}
                          onChange={(e) => setGrForm({ ...grForm, vehicle_no: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5 pt-4 border-t col-span-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi Gudang/Toko</Label>
                        <Select
                          value={grForm.storage_location}
                          onValueChange={(v) => setGrForm({ ...grForm, storage_location: v })}
                        >
                          <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                            <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Pilih lokasi gudang atau toko" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.filter(l => l.type === 'store').length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">Belum ada master lokasi toko</div>
                            ) : (
                              locations.filter(l => l.type === 'store').map(loc => (
                                <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">Catatan Penerimaan <InfoTip text="Catatan tambahan seperti kondisi barang rusak, dll." /></Label>
                      <Textarea
                        placeholder="Tuliskan catatan jika ada barang yang kurang atau rusak..."
                        className="bg-slate-50 border-slate-200 min-h-[80px]"
                        value={grForm.notes}
                        onChange={(e) => setGrForm({ ...grForm, notes: e.target.value })}
                      />
                    </div>
                  </Card>
                </div>

                {/* Right Side: Summary Sidebar */}
                <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l p-6 space-y-6 shrink-0 flex flex-col md:overflow-y-auto">
                  <div className="flex-1 space-y-6 overflow-y-auto">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Logistics & SLA</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">Arrival At <InfoTip text="Waktu aktual kedatangan barang di gudang." /></Label>
                          </div>
                          <Input
                            type="datetime-local"
                            className="h-10 text-xs font-black border-blue-200 bg-white"
                            value={actualArrivalAt}
                            onChange={e => setActualArrivalAt(e.target.value)}
                          />
                          <p className="text-[9px] text-slate-400 font-medium leading-tight italic">
                            * Waktu kedatangan aktual barang untuk perhitungan rating vendor.
                          </p>
                        </div>

                      </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Inventory Summary</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                          <p className="text-[10px] uppercase font-black text-emerald-600/70 tracking-widest leading-none">Total Accepted Value</p>
                          <p className="text-2xl font-black text-emerald-700 tracking-tighter">
                            Rp {formatCurrency(receivedItems.reduce((sum, item) => sum + (item.accepted_qty * item.unit_price), 0))}
                          </p>
                          <p className="text-[9px] text-emerald-600 font-bold">Base on Accepted Qty only</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                            <span>Rec. Accuracy</span>
                            <span className={receivedItems.every(i => i.received_qty === i.qty_ordered) ? 'text-emerald-500' : 'text-amber-500'}>
                              {receivedItems.every(i => i.received_qty === i.qty_ordered) ? 'MATCH' : 'DISCREPANCY'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t font-semibold">
                    <Button
                      className="w-full bg-slate-900 hover:bg-black h-16 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200"
                      onClick={handleSubmit}
                      disabled={isSaving || !grForm.storage_location}
                    >
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5 mr-3" />}
                      SIMPAN GRN
                    </Button>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-tight">
                      Data akan masuk ke antrean verifikasi gudang sebelum posting stok.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Redesigned View Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent hideFullscreen={true} className="max-w-[95vw] xl:max-w-[1400px] md:h-[90vh] h-[95vh] flex flex-col p-0 md:overflow-hidden overflow-y-auto rounded-3xl bg-white shadow-2xl border-none">
          <div className="p-6 border-b flex items-center justify-between bg-white relative pr-14 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  GRN {viewingReceipt?.gr_number}
                  {viewingReceipt?.status === 'Draft' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-100 rounded-full transition-colors"
                      onClick={handleRefreshDetail}
                      title="Sinkronkan data ttd supplier/driver"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </h2>
                <p className="text-sm text-slate-500">{viewingReceipt?.timestamp_wib}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(viewingReceipt?.status)}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Informasi Pengadaan & GRN
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Supplier Partner</p><p className="font-bold text-slate-800 text-sm leading-tight">{viewingReceipt?.supplier_name}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Reference PO</p><p className="font-bold text-blue-600 underline text-sm leading-tight">{viewingReceipt?.po_number}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Surat Jalan (Note)</p><p className="font-bold text-slate-700 text-sm leading-tight">{viewingReceipt?.surat_jalan || '-'}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">No. Kendaraan</p><p className="font-bold text-slate-700 text-sm leading-tight uppercase">{viewingReceipt?.vehicle_no || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-blue-50/30">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Truck className="w-3 h-3" /> SLA Tracking (Logistik)
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Confirmed ETA</p>
                      <p className="font-bold text-slate-700 text-xs">
                        {(() => {
                          const date = viewingReceipt?.delivery_reference_snapshot?.confirmed_delivery_date ||
                            purchaseOrders.find(p => p.id === viewingReceipt?.po_id || p.po_number === viewingReceipt?.po_number)?.confirmed_delivery_date ||
                            purchaseOrders.find(p => p.id === viewingReceipt?.po_id || p.po_number === viewingReceipt?.po_number)?.delivery_date;
                          return date ? moment.utc(date).format('DD/MM/YYYY HH:mm') : '-';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Actual Arrival</p>
                      <p className="font-bold text-blue-700 text-xs">{viewingReceipt?.actual_arrival_at ? moment.utc(viewingReceipt.actual_arrival_at).format('DD/MM/YYYY HH:mm') : '-'}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-blue-100/50">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Performance</p>
                        {(() => {
                          const confirmedDate = viewingReceipt?.delivery_reference_snapshot?.confirmed_delivery_date ||
                            purchaseOrders.find(p => p.id === viewingReceipt?.po_id || p.po_number === viewingReceipt?.po_number)?.confirmed_delivery_date ||
                            purchaseOrders.find(p => p.id === viewingReceipt?.po_id || p.po_number === viewingReceipt?.po_number)?.delivery_date;

                          if (!viewingReceipt?.actual_arrival_at || !confirmedDate) return <Badge variant="outline" className="text-[9px] font-black">N/A</Badge>;

                          const actual = moment(viewingReceipt.actual_arrival_at);
                          const confirmed = moment(confirmedDate);

                          if (actual.isAfter(confirmed)) {
                            return <Badge className="bg-red-500 text-white text-[9px] font-black uppercase">LATE DELIVERY</Badge>;
                          } else if (actual.isBefore(confirmed)) {
                            return <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase">IN-TIME DELIVERY</Badge>;
                          } else {
                            return <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase">ON-TIME DELIVERY</Badge>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm md:col-span-2">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserCircle className="w-3 h-3" /> Petugas & Catatan
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Driver</p><p className="font-medium text-slate-700">{viewingReceipt?.driver_name || '-'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Gudang</p><p className="font-medium text-slate-700">{viewingReceipt?.storage_location || '-'}</p></div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">No. HP Supir <span className="text-slate-300 font-normal normal-case">(Opsional - Untuk WhatsApp)</span></p>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editDriverPhone}
                          onChange={(e) => setEditDriverPhone(e.target.value)}
                          placeholder="08xxx atau +62xxx"
                          className="h-9 text-sm border-slate-200 bg-slate-50 flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-9 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleSaveDriverPhone}
                        >
                          Simpan
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-slate-500 italic">"{viewingReceipt?.notes || 'Tidak ada catatan'}"</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Item yang Diterima
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Produk</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Reject</TableHead>
                      <TableHead className="text-center">B.Order</TableHead>
                      <TableHead className="text-center">Accepted</TableHead>
                      <TableHead className="text-center pr-6">Status/Kondisi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white">
                    {viewingReceipt?.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="pl-6">
                          <p className="font-bold text-slate-800 text-xs">{item.product_name}</p>
                          <p className="text-[9px] text-slate-400 font-medium">SKU: {item.sku || '-'}</p>
                        </TableCell>
                        <TableCell className="text-center text-slate-400 font-bold text-xs">{item.qty_ordered}</TableCell>
                        <TableCell className="text-center text-slate-700 font-bold text-xs">{item.received_qty}</TableCell>
                        <TableCell className="text-center text-red-500 font-bold text-xs">{item.reject_qty || 0}</TableCell>
                        <TableCell className="text-center text-amber-500 font-bold text-xs">{item.backorder_qty || 0}</TableCell>
                        <TableCell className="text-center text-blue-700 font-black text-xs">{item.accepted_qty}</TableCell>
                        <TableCell className="text-center pr-6">
                          <div className="flex flex-col gap-1 items-center">
                            <Badge variant="outline" className={`text-[8px] font-black uppercase ${item.qc_status === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {item.qc_status || 'Passed'}
                            </Badge>
                            <span className="text-[9px] text-slate-400 italic">{item.condition}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-6 bg-white border-t">
                <div className="flex justify-end gap-12 items-baseline">
                  <span className="text-sm text-slate-500 font-medium">Total Nilai Penerimaan:</span>
                  <span className="text-2xl font-black text-emerald-600">Rp {formatCurrency(viewingReceipt?.total_value || 0)}</span>
                </div>
              </div>
            </Card>

            {/* Signature Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(viewingReceipt?.status === 'Posted' || viewingReceipt?.status === 'Terverifikasi' || viewingReceipt?.status === 'Draft') && viewingReceipt?.admin_signature && (
                <Card className="border-none shadow-sm bg-white p-6 flex flex-col items-center">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-4 tracking-[0.2em]">Penerima (Staff)</p>
                  <div className="bg-slate-50 rounded-2xl p-4 w-full flex flex-col items-center border border-dashed border-slate-200">
                    <img src={viewingReceipt.admin_signature} alt="Admin Sign" className="h-24 object-contain mb-2 dark:invert dark:brightness-150" />
                    <div className="w-24 h-px bg-slate-200 mb-2"></div>
                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{viewingReceipt.admin_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{viewingReceipt.admin_role || 'Warehouse Staff'}</p>
                  </div>
                </Card>
              )}

              {settings.warehouseApprovalMode === 'Dual' && viewingReceipt?.warehouse_manager_signature && (
                <Card className="border-none shadow-sm bg-white p-6 flex flex-col items-center">
                  <p className="text-[9px] uppercase font-black text-blue-400 mb-4 tracking-[0.2em]">Manager Approval</p>
                  <div className="bg-blue-50/30 rounded-2xl p-4 w-full flex flex-col items-center border border-dashed border-blue-200">
                    <img src={viewingReceipt.warehouse_manager_signature} alt="Manager Sign" className="h-24 object-contain mb-2 dark:invert dark:brightness-150" />
                    <div className="w-24 h-px bg-blue-200 mb-2"></div>
                    <p className="text-xs font-black text-blue-800 uppercase leading-none">{viewingReceipt.warehouse_manager_name}</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">Warehouse Manager</p>
                  </div>
                </Card>
              )}

              {viewingReceipt?.driver_signature && (
                <Card className="border-none shadow-sm bg-white p-6 flex flex-col items-center">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-4 tracking-[0.2em]">Pengirim (Driver)</p>
                  <div className="bg-slate-50 rounded-2xl p-4 w-full flex flex-col items-center border border-dashed border-slate-200">
                    <img src={viewingReceipt.driver_signature} alt="Driver Sign" className="h-24 object-contain mb-2 dark:invert dark:brightness-150" />
                    <div className="w-24 h-px bg-slate-200 mb-2"></div>
                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{viewingReceipt.driver_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Supplier Logistic</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-5 bg-white border-t flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewingReceipt(null)} className="h-12 px-6 rounded-2xl font-bold">Tutup</Button>
              {viewingReceipt?.status !== 'Terverifikasi' && (
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-2xl border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                  onClick={() => {
                    const htmlContent = `<!DOCTYPE html><html><head>
                            <title>GRN ${viewingReceipt?.gr_number}</title>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                            <style>body{margin:0;padding:0;background:#f1f5f9}@media print{body{background:white}@page{margin:0;size:A4}}</style>
                          </head><body>
                            ${(() => {
                        const relatedPO = allPurchaseOrders.find(p => p.id === viewingReceipt?.po_id);
                        return getDocumentTemplate({
                          type: 'GOODS RECEIPT NOTE',
                          storeName: store?.store_name || 'TOKO ANDA',
                          logoUrl: store?.logo_url,
                          brandColor: store?.brand_color || '#2563eb',
                          titleColor: store?.title_color || '#0f172a',
                          data: {
                            ...viewingReceipt,
                            no: viewingReceipt?.gr_number,
                            date: viewingReceipt?.timestamp_wib?.split(' ')[0],
                            supplier_name: viewingReceipt?.supplier_name,
                            supplier_address: viewingReceipt?.supplier_address || relatedPO?.supplier_address || suppliers.find(s => s.name === viewingReceipt?.supplier_name)?.address,
                            supplier_phone: viewingReceipt?.supplier_phone || relatedPO?.supplier_phone || suppliers.find(s => s.name === viewingReceipt?.supplier_name)?.phone,
                            supplier_email: viewingReceipt?.supplier_email || relatedPO?.supplier_email || suppliers.find(s => s.name === viewingReceipt?.supplier_name)?.email,
                            shipping_confirmation: viewingReceipt?.delivery_reference_snapshot || relatedPO?.shipping_confirmation,
                            items: (viewingReceipt?.items || []).map(item => ({
                              ...item,
                              name: item.product_name || item.name,
                              qty: item.received_qty || item.quantity,
                              unit: item.unit || 'pcs'
                            })),
                            store_address: store?.address,
                            admin_name: viewingReceipt?.received_by,
                            admin_signature: viewingReceipt?.admin_signature
                          }
                        });
                      })()}
                            <script>window.onload=function(){setTimeout(()=>{window.print();window.close()},500)};</script>
                          </body></html>`;
                    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const w = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!w) { alert("Popup diblokir! Izinkan popup untuk mencetak."); return; }
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  }}
                >
                  <Printer className="w-4 h-4" /> Cetak GRN Note
                </Button>
              )}
            </div>

            <div className="flex flex-1 flex-wrap gap-3 justify-end items-center">
              {viewingReceipt?.status === 'Terverifikasi' ? (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 h-12 px-10 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95"
                  onClick={() => navigate(`/InventoryGRN?grn_id=${viewingReceipt.id}`)}
                >
                  <Send className="w-4 h-4 mr-3" />
                  Posting ke Ledger (IGRN)
                </Button>
              ) : viewingReceipt?.status === 'Draft' ? (
                <div className="flex items-center gap-3">
                  {/* Driver actions */}
                  {/* Driver actions - Only show if Admin has signed but Driver hasn't */}
                  {!viewingReceipt?.driver_signature && viewingReceipt?.admin_signature && (
                    <Button
                      variant="outline"
                      className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleWhatsAppDriver(viewingReceipt)}
                    >
                      <Truck className="w-4 h-4 mr-2" /> WhatsApp Driver
                    </Button>
                  )}

                  {/* Admin Sign */}
                  {!viewingReceipt?.admin_signature && (
                    <Button
                      className="bg-slate-900 hover:bg-black h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-slate-200"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <Signature className="w-4 h-4 mr-2" />
                      TTD Staff Gudang
                    </Button>
                  )}

                  {/* Manager Sign (Conditional) */}
                  {settings.warehouseApprovalMode === 'Dual' && !viewingReceipt?.warehouse_manager_signature && (
                    <Button
                      className="bg-blue-700 hover:bg-blue-800 h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white"
                      onClick={() => setShowManagerSignaturePad(true)}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      TTD Manager
                    </Button>
                  )}

                  {/* Final Verification */}
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 h-12 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleVerifyReceipt}
                    disabled={
                      isSaving || 
                      !viewingReceipt?.admin_signature || 
                      !viewingReceipt?.driver_signature || 
                      (settings.warehouseApprovalMode === 'Dual' && !viewingReceipt?.warehouse_manager_signature)
                    }
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                    Verifikasi GRN
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Dialog - Admin */}
      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Tanda Tangan Digital (Admin)</DialogTitle>
            <p className="text-sm text-slate-500">Goods Receipt Note - Tanda tangani dokumen ini</p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nama Penandatangan"
                className="h-11 border-slate-200 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan (Opsional)</Label>
              <Input
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                placeholder="Jabatan / Posisi"
                className="h-11 border-slate-200"
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border shadow-inner">
            <SignaturePad
              onSave={handleAdminSign}
              onCancel={() => setShowSignaturePad(false)}
              title="Tanda Tangan Admin *"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Dialog - Driver */}
      <Dialog open={showDriverSignaturePad} onOpenChange={setShowDriverSignaturePad}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Tanda Tangan Pengirim (Driver)</DialogTitle>
            <p className="text-sm text-slate-500">Bukti penyerahan barang dari kurir/driver supplier</p>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nama Driver / Kurir *</Label>
              <Input
                value={driverSignerName || viewingReceipt?.driver_name || ''}
                onChange={(e) => setDriverSignerName(e.target.value)}
                placeholder="Masukkan nama kurir"
                className="h-11 border-slate-200 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border shadow-inner">
            <SignaturePad
              onSave={handleDriverSign}
              onCancel={() => setShowDriverSignaturePad(false)}
              title="Tanda Tangan Driver *"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-gr-detailed" className="hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. GRN</TableHead>
              <TableHead>Ref PO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-center">Target PO</TableHead>
              <TableHead className="text-center">Diterima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.flatMap((gr) =>
              gr.items?.map((item, idx) => (
                <TableRow key={`${gr.id}-${idx}`}>
                  {idx === 0 ? (
                    <>
                      <TableCell rowSpan={gr.items.length || 1} className="font-bold border-r">{gr.gr_number}</TableCell>
                      <TableCell rowSpan={gr.items.length || 1} className="border-r">{gr.po_number}</TableCell>
                      <TableCell rowSpan={gr.items.length || 1} className="border-r">{gr.timestamp_wib}</TableCell>
                      <TableCell rowSpan={gr.items.length || 1} className="border-r">{gr.supplier_name}</TableCell>
                    </>
                  ) : null}
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell className="text-center">{item.ordered_qty}</TableCell>
                  <TableCell className="text-center font-bold">{item.received_qty}</TableCell>
                </TableRow>
              )) || []
            )}
          </TableBody>
        </Table>
      </div>
      {/* Signature Pad Dialog - Manager */}
      <Dialog open={showManagerSignaturePad} onOpenChange={setShowManagerSignaturePad}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[32px] bg-white">
          <div className="bg-blue-700 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                Warehouse Manager Signature
              </DialogTitle>
              <p className="text-blue-100 text-xs font-medium opacity-80">
                Persetujuan tingkat kedua untuk verifikasi akhir barang masuk.
              </p>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Manajer</Label>
              <Input
                value={managerSignerName}
                onChange={e => setManagerSignerName(e.target.value)}
                placeholder="Masukkan nama manajer..."
                className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>
            <div className="border-2 border-dashed border-blue-100 rounded-[32px] p-2 bg-slate-50/50">
              <SignaturePad
                onSave={handleManagerSign}
                title="Warehouse Manager Approval"
                initialSignature={localStorage.getItem('last_manager_signature')}
              />
            </div>
            <p className="text-[10px] text-center text-slate-400 font-bold italic">
              * Tanda tangan ini menyatakan bahwa seluruh item telah diverifikasi sesuai prosedur.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[32px] bg-white border-none shadow-2xl">
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-amber-100/50">
              <ClipboardCheck className="w-10 h-10 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Konfirmasi Penerimaan</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Apakah semua data yang diisi sudah benar?
                Mohon pastikan <span className="font-bold text-slate-900">Waktu Kedatangan Aktual</span> sudah sesuai dengan fisik kendaraan tiba di gudang.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Kedatangan</p>
                <p className="text-sm font-bold text-slate-800">{moment(actualArrivalAt).format('DD MMM YYYY, HH:mm')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => setShowConfirmSubmit(false)}
              >
                Cek Ulang
              </Button>
              <Button
                className="h-12 rounded-2xl font-bold bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-200"
                onClick={processSubmit}
              >
                Ya, Sudah Benar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
