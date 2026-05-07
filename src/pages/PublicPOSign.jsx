import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, FileText, Building2, Package, Calendar, Clock, Lock, CheckCircle,
  UserCircle, Signature, Phone, Mail, Edit3, MessageSquare, Printer, Truck, MapPin,
  Hash, CreditCard, ArrowRight, ShieldCheck, Info
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '@/components/ui/SignaturePad';
import moment from 'moment';
import ExportToolbar, { exportToPDF } from '@/components/layout/ExportToolbar';
import { getDocumentTemplate } from '@/utils/documentTemplates';

// Utilities needed for formatting inside print view
const formatCurrency = (num) => new Intl.NumberFormat('id-ID').format(num || 0);

// Info Tooltip component for field guidance
const InfoTooltip = ({ text }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const timer = setTimeout(() => setOpen(false), 6000);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); document.removeEventListener('touchstart', handleClick); };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex ml-1.5">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0"
      >
        <Info className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900 text-white text-[11px] font-medium leading-relaxed p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
};

export default function PublicPOSign() {
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const isDriverMode = searchParams.get('mode') === 'driver';

  const { settings } = useSettings();
  const [po, setPo] = useState(null);
  const [store, setStore] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationItems, setNegotiationItems] = useState([]);
  const [negotiationReason, setNegotiationReason] = useState("");

  const [isVerified, setIsVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [verificationError, setVerificationError] = useState(false);

  // Enterprise Workflow State
  const [isAccepted, setIsAccepted] = useState(false);
  const [courierSignature, setCourierSignature] = useState(null);
  const [confirmedDeliveryDate, setConfirmedDeliveryDate] = useState("");
  const [negotiationTotal, setNegotiationTotal] = useState(0);
  const [driverHistory, setDriverHistory] = useState([]);
  const [shippingDetails, setShippingDetails] = useState({
    delivery_method: 'Armada Supplier',
    eta: '',
    ship_via: '',
    driver_name: '',
    driver_phone: '',
    vehicle_number: '',
    courier_name: '',
    courier_person_name: '',
    courier_person_phone: '',
    tracking_number: '',
    supplier_delivery_note_no: '',
    shipping_notes: '',
    confirmation_source: 'Supplier Portal'
  });

  useEffect(() => {
    if (po && po.items) {
      setNegotiationItems(JSON.parse(JSON.stringify(po.items)));
    }
  }, [po]);

  useEffect(() => {
    loadData();
  }, [id]);

  // Polling for courier signature in Supplier mode
  useEffect(() => {
    if (isDriverMode || !po || po.status !== 'Approved' || courierSignature) return;

    const interval = setInterval(async () => {
      try {
        const poData = await api.entities.PurchaseOrder.get(id);
        if (poData?.courier_signature) {
          setCourierSignature(poData.courier_signature);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isDriverMode, po?.status, courierSignature, id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const poData = await api.entities.PurchaseOrder.get(id);
      if (poData) {
        setPo(poData);

        // Fetch supplier phone for verification
        const supplierData = await api.entities.Supplier.get(poData.supplier_id);
        if (supplierData) {
          setSupplierPhone(supplierData.phone || "");
          // Merge missing supplier info into po object for rendering in templates
          setPo(prev => ({
            ...prev,
            supplier_phone: prev.supplier_phone || supplierData.phone,
            supplier_email: prev.supplier_email || supplierData.email,
            supplier_address: prev.supplier_address || supplierData.address
          }));

          // Load driver history from localStorage
          const storedHistory = localStorage.getItem('tradixa_driver_history_' + poData.supplier_id);
          if (storedHistory) {
            try {
              setDriverHistory(JSON.parse(storedHistory));
            } catch (e) {
              console.error("Failed to parse driver history");
            }
          }
        }

        const storeData = await api.entities.Store.get(poData.store_id);
        setStore(storeData);
        setConfirmedDeliveryDate(poData.delivery_date || "");
        setNegotiationTotal(poData.total || 0);

        // Auto-detect portal phase based on PO status
        if (poData.status === 'Approved') {
          // Phase 2: Supplier already approved price, now needs to fill shipping details
          setIsVerified(true);
          setIsSuccess(false); // Show Phase 2 form, not success
        } else if (poData.status === 'In Transit' || poData.status === 'Confirmed' ||
          poData.status === 'Fully Received' || poData.status === 'Partial Received') {
          // Complete: Everything done
          setIsVerified(true);
          setIsSuccess(true);
        } else if (poData.supplier_signature && poData.status !== 'Negotiation') {
          // Fallback: Has signature but status didn't change properly
          setIsVerified(true);
          setIsSuccess(true);
        }
      } else {
        setError("PO_NOT_FOUND");
      }
    } catch (err) {
      console.error("Failed to load PO data", err);
      setError("FETCH_ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = () => {
    // Normalize phone numbers for comparison (remove spaces, dashes, etc)
    const cleanInput = phoneInput.replace(/[^0-9]/g, '');
    const cleanStored = supplierPhone.replace(/[^0-9]/g, '');

    // Check if ends with the same numbers (handling 0 vs 62 vs +62)
    if (cleanInput.length >= 8 && cleanStored.endsWith(cleanInput.slice(-8))) {
      setIsVerified(true);
      setVerificationError(false);
    } else {
      setVerificationError(true);
    }
  };

  // Phase 1: Price Approval Signature (no shipping details)
  const handleSign = async (signatureData) => {
    setIsSubmitting(true);

    // Save signature for future use
    localStorage.setItem(`last_supplier_signature_${po.supplier_id}`, signatureData);

    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    const timestampWib = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;

    let updateData = {
      supplier_signature: signatureData,
      supplier_signed_at: new Date().toISOString(),
    };

    // Detect if prices/qty actually changed (not just panel opened)
    const hasActualChanges = (() => {
      if (!isNegotiating) return false;
      if (settings.negotiationMode === 'Total') {
        return negotiationTotal !== po.total;
      } else {
        return negotiationItems.some((item, idx) => {
          const original = po.items[idx];
          if (!original) return false;
          const qtyChanged = item.proposed_qty && item.proposed_qty !== item.quantity;
          const priceChanged = item.unit_price !== original.unit_price;
          return qtyChanged || priceChanged;
        });
      }
    })();

    if (isNegotiating && hasActualChanges) {
      if (settings.negotiationMode === 'Total') {
        const historyEntry = {
          time_wib: timestampWib,
          activity: 'Supplier Negotiation (Total)',
          detail: `Supplier mengajukan perubahan total harga menjadi Rp ${new Intl.NumberFormat('id-ID').format(negotiationTotal)}${negotiationReason ? `. Alasan: ${negotiationReason}` : ''}`,
          type: 'negotiation'
        };
        updateData.total = negotiationTotal;
        updateData.approval_history = [...(po.approval_history || []), historyEntry];
      } else {
        const hasQtyChange = negotiationItems.some(item => (item.proposed_qty && item.proposed_qty !== item.quantity));
        const newSubtotal = negotiationItems.reduce((acc, curr) => acc + ((curr.proposed_qty || curr.quantity) * curr.unit_price), 0);
        const newTax = po.tax_amount > 0 ? newSubtotal * 0.11 : 0;

        const historyEntry = {
          time_wib: timestampWib,
          activity: 'Supplier Negotiation (Items)',
          detail: `Supplier mengajukan perubahan ${hasQtyChange ? 'Kuantitas (MOQ) & ' : ''}Harga Item (Estimasi Total Baru: Rp ${new Intl.NumberFormat('id-ID').format(newSubtotal + newTax)})${negotiationReason ? `. Alasan: ${negotiationReason}` : ''}`,
          type: 'negotiation'
        };
        updateData.items = negotiationItems;
        updateData.subtotal = newSubtotal;
        updateData.tax_amount = newTax;
        updateData.total = newSubtotal + newTax;
        updateData.approval_history = [...(po.approval_history || []), historyEntry];
      }
      updateData.status = 'Negotiation';
    } else {
      const historyEntry = {
        time_wib: timestampWib,
        activity: 'Supplier Approved',
        detail: `PO ditandatangani dan disetujui secara digital oleh ${po.supplier_name}. Harga dan item telah disetujui.`,
        type: 'sign'
      };
      updateData.status = 'Approved';
      updateData.approval_history = [...(po.approval_history || []), historyEntry];
    }

    try {
      await api.entities.PurchaseOrder.update(id, updateData);
      setPo({ ...po, ...updateData });
      setIsSuccess(true);
    } catch (err) {
      alert("Gagal mengirim tanda tangan. Silakan coba lagi.");
    }
    setIsSubmitting(false);
  };

  // Phase 2: Shipping Confirmation Signature → In Transit
  const handleShippingSign = async (signatureData) => {
    setIsSubmitting(true);

    localStorage.setItem(`last_supplier_signature_${po.supplier_id}`, signatureData);

    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    const timestampWib = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;

    const historyEntry = {
      time_wib: timestampWib,
      activity: 'Shipment Confirmed',
      detail: `Pengiriman dikonfirmasi oleh ${po.supplier_name}. No. SJ: ${shippingDetails.supplier_delivery_note_no || '-'}, Metode: ${shippingDetails.delivery_method}, ETA: ${confirmedDeliveryDate}`,
      type: 'shipping'
    };

    const updateData = {
      shipping_signature: signatureData,
      courier_signature: courierSignature,
      shipping_signed_at: new Date().toISOString(),
      confirmed_delivery_date: confirmedDeliveryDate,
      shipping_confirmation: {
        ...shippingDetails,
        courier_name: shippingDetails.courier_name === 'Lainnya' ? (shippingDetails.courier_name_custom || 'Lainnya') : shippingDetails.courier_name,
        confirmed_by: po.supplier_name,
        confirmed_at: new Date().toISOString()
      },
      status: 'In Transit',
      approval_history: [...(po.approval_history || []), historyEntry]
    };

    try {
      await api.entities.PurchaseOrder.update(id, updateData);
      setPo({ ...po, ...updateData });
      setIsSuccess(true);
    } catch (err) {
      alert("Gagal mengkonfirmasi pengiriman. Silakan coba lagi.");
    }
    setIsSubmitting(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error === "FETCH_ERROR") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8 border-red-100 bg-red-50/30">
          <Lock className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900">Kesalahan Koneksi</h2>
          <p className="text-red-700/70 mt-2 text-sm">Gagal memuat detail pesanan. Silakan periksa koneksi internet Anda atau coba muat ulang halaman ini.</p>
          <Button variant="outline" className="mt-6 border-red-200 text-red-700 hover:bg-red-100" onClick={() => window.location.reload()}>
            Muat Ulang
          </Button>
        </Card>
      </div>
    );
  }

  if (!po || error === "PO_NOT_FOUND") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">PO Tidak Ditemukan</h2>
          <p className="text-slate-500 mt-2 text-sm">Maaf, link ini tidak valid, sudah kadaluwarsa, atau pesanan telah dibatalkan.</p>
        </Card>
      </div>
    );
  }

  // Determine which success page to show
  const isPhase2Complete = po?.status === 'In Transit' || po?.status === 'Confirmed' || po?.status === 'Fully Received' || po?.status === 'Partial Received';

  if (isSuccess) {
    // Helper: Print function
    const handlePrint = (containerId, title) => {
      const content = document.getElementById(containerId)?.innerHTML;
      if (!content) return;
      const htmlContent = `
        <!DOCTYPE html><html><head>
          <title>${title}</title>
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
    };

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className={`w-20 h-20 ${isPhase2Complete ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center mx-auto shadow-inner`}>
            {isPhase2Complete ? <Truck className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800">
              {isPhase2Complete ? 'Pengiriman Dikonfirmasi!' : 'Pesanan Telah Disetujui!'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isPhase2Complete
                ? 'Barang sedang dalam perjalanan. Status PO: In Transit.'
                : 'Terima kasih! Harga dan item telah Anda setujui. Silakan kembali ke halaman ini saat barang siap dikirim untuk mengisi detail pengiriman.'}
            </p>
          </div>
          <div className="h-px bg-slate-100"></div>
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            Authenticity Verified Digitally
          </div>
          <div className="pt-4 text-center">
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 relative overflow-hidden inline-block w-full max-w-[300px]">
              <img src={isPhase2Complete ? (po.shipping_signature || po.supplier_signature) : po.supplier_signature} alt="Signature" className="h-24 object-contain mx-auto relative z-10 dark:invert dark:brightness-150" />
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">SIGNED</div>
            </div>
            <p className="mt-4 font-bold text-slate-800 text-lg uppercase tracking-tight">{po.supplier_name}</p>
            <p className="text-xs text-slate-400">
              {isPhase2Complete ? 'Pengiriman dikonfirmasi' : 'Disetujui'} pada {moment().format('D/M/YYYY, HH.mm [WIB]')}
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100 border-dashed space-y-3">
              {/* Download PO Document — always available */}
              <Button
                onClick={() => handlePrint('print-public-po', `Purchase Order ${po.po_number}`)}
                className="w-full bg-blue-700 hover:bg-blue-600 h-12 text-white font-bold"
              >
                <Printer className="w-5 h-5 mr-2" />
                Download / Print PO Document
              </Button>

              {/* Download Surat Jalan — only when shipping confirmed (Phase 2 complete) */}
              {isPhase2Complete && po.shipping_confirmation?.supplier_delivery_note_no && (
                <Button
                  onClick={() => handlePrint('print-public-po-sj', `Surat Jalan ${po.shipping_confirmation.supplier_delivery_note_no}`)}
                  className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-white font-bold"
                >
                  <Truck className="w-5 h-5 mr-2" />
                  Download / Print Surat Jalan
                </Button>
              )}

              {/* Phase 1 success: Button to proceed to Phase 2 */}
              {!isPhase2Complete && po.status === 'Approved' && (
                <Button
                  onClick={() => { setIsSuccess(false); }}
                  variant="outline"
                  className="w-full h-12 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
                >
                  <Truck className="w-5 h-5 mr-2" />
                  Isi Detail Pengiriman →
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Hidden PO Print Template */}
        <div id="print-public-po" className="hidden">
          {po && (
            <div
              dangerouslySetInnerHTML={{
                __html: getDocumentTemplate({
                  type: 'PURCHASE ORDER',
                  storeName: store?.store_name || 'TOKO ANDA',
                  logoUrl: store?.logo_url,
                  brandColor: store?.brand_color || '#2563eb',
                  titleColor: store?.title_color || '#0f172a',
                  layout: store?.invoice_layout_style || 'Modern',
                  data: {
                    ...po,
                    delivery_date: po.delivery_date ? moment(po.delivery_date).format('DD/MM/YYYY HH:mm [WIB]') : '-',
                    created_at: po.created_at ? moment(po.created_at).format('DD/MM/YYYY HH:mm [WIB]') : '-',
                    store_address: store?.address
                  }
                })
              }}
            />
          )}
        </div>

        {/* Hidden Surat Jalan Print Template */}
        {isPhase2Complete && po?.shipping_confirmation && (
          <div id="print-public-po-sj" className="hidden">
            <div
              dangerouslySetInnerHTML={{
                __html: getDocumentTemplate({
                  type: 'DELIVERY ORDER',
                  storeName: store?.store_name || 'TOKO ANDA',
                  logoUrl: store?.logo_url,
                  brandColor: store?.brand_color || '#2563eb',
                  titleColor: store?.title_color || '#0f172a',
                  layout: store?.invoice_layout_style || 'Modern',
                  data: {
                    ...po,
                    // Use confirmed delivery date if available for DO, otherwise fallback to requested
                    delivery_date: (po.confirmed_delivery_date || po.delivery_date)
                      ? moment.utc(po.confirmed_delivery_date || po.delivery_date).format('DD/MM/YYYY HH:mm [WIB]')
                      : '-',
                    created_at: po.created_at ? moment(po.created_at).format('DD/MM/YYYY HH:mm [WIB]') : '-',
                    no: po.shipping_confirmation.supplier_delivery_note_no || po.po_number,
                    po_reference: po.po_number,
                    supplier_sj_number: po.shipping_confirmation.supplier_delivery_note_no,
                    store_address: store?.address
                  }
                })
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // --- GATEWAY ---
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-6 font-sans">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[40px] overflow-hidden relative z-10">
          <div className="bg-blue-600 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-transparent opacity-50" />
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 rotate-6 shadow-xl">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Verifikasi Supplier</h2>
            <p className="text-blue-100 text-sm font-medium">Hanya supplier terdaftar yang dapat mengakses dokumen ini.</p>
          </div>

          <CardContent className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Nomor WhatsApp Terdaftar
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="tel"
                    placeholder="Contoh: 081234567XXX"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (verificationError) setVerificationError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="h-14 pl-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 font-bold tracking-wider text-lg"
                  />
                </div>
              </div>

              {verificationError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xs text-red-600 font-bold leading-tight">Nomor tidak sesuai. Silakan hubungi admin jika ada perubahan.</p>
                </div>
              )}

              <Button
                onClick={handleVerify}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all active:scale-[0.98]"
              >
                Buka Dokumen Pesanan
                <CheckCircle className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <p className="text-[10px] text-center text-slate-400 font-medium">
              Dokumen ini dilindungi oleh Tradixa Security Protocol.<br />
              Semua aktivitas verifikasi dicatat secara otomatis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  // --- END NEW VERIFICATION GATEWAY ---

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 flex flex-col items-center font-sans">
      {isDriverMode && po?.status === 'Approved' ? (
        <div className="max-w-md w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both mt-10">
          <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white p-6">
            <div className="text-center space-y-6 py-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <Truck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                  Konfirmasi Pengambilan
                </h2>
                <p className="text-slate-500 font-medium mt-2 text-xs">
                  Silakan tanda tangani di bawah ini untuk mengkonfirmasi bahwa Anda (Kurir) telah menerima barang dari Supplier.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. PO</span>
                  <span className="text-xs font-black text-slate-800">{po.po_number}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</span>
                  <span className="text-xs font-black text-slate-800">{po.supplier_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pembeli</span>
                  <span className="text-xs font-black text-slate-800">{store?.store_name}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Tanda Tangan Kurir / Driver</p>
                <div className="p-4 bg-white rounded-[32px] border-2 border-dashed border-slate-200 transition-all">
                  {courierSignature ? (
                    <div className="relative flex flex-col items-center">
                      <img src={courierSignature} className="h-[180px] object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:invert dark:brightness-150" alt="Courier Signature" />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">SIGNED</div>
                      <Button onClick={() => setCourierSignature(null)} variant="outline" size="sm" className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50">
                        Ulangi Tanda Tangan
                      </Button>
                      <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl w-full text-xs font-medium text-center">
                        <CheckCircle2 className="w-4 h-4 inline-block mr-1 mb-0.5" />
                        Terima kasih, silakan infokan ke pihak supplier.
                      </div>
                    </div>
                  ) : (
                    <SignaturePad
                      onSave={async (data) => {
                        try {
                          setCourierSignature(data);
                          await api.entities.PurchaseOrder.update(id, { courier_signature: data });
                        } catch (e) {
                          console.error("Failed to save courier signature", e);
                        }
                      }}
                      title="Pengirim / Driver (Kurir)"
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="max-w-5xl w-full space-y-8 pb-24">
          {/* Header Section */}
          <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50 z-0"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-50 border-2 border-slate-100 flex items-center justify-center shadow-sm">
                {store?.logo_url ? <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-10 h-10 text-slate-300" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${po.status === 'Approved' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest border-none`}>
                    {po.status === 'Approved' ? 'Konfirmasi Pengiriman' : 'Pending Confirmation'}
                  </Badge>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {po.status === 'Approved' ? 'Fase 2 — Shipping Details' : 'Fase 1 — Price Approval'}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Purchase Order</h1>
                <p className="text-slate-500 font-bold text-lg mb-4">No: <span className="text-blue-600 tracking-tight">{po.po_number}</span></p>

                <div className="flex items-start gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 w-fit">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-700 leading-none mb-1">{store?.store_name}</p>
                    <p className="text-[11px] text-slate-500 leading-snug max-w-[280px]">{store?.address || 'Alamat tidak tersedia'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 relative z-10">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Date</p>
                <p className="font-bold text-slate-700">{moment(po.created_at).format('DD MMM YYYY')}</p>
              </div>
              <div className="h-1 bg-slate-100 w-48 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-3/4 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* ═══ FASE 1: Item & Harga (hanya jika belum Approved) ═══ */}
          {po.status !== 'Approved' && (<>
            {/* Section 1: Detail Purchase Order */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Section 1: Item Pesanan
                  </CardTitle>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Hash className="w-3 h-3" />
                    {po.items?.length || 0} Products
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="w-12 text-center pl-8">No</TableHead>
                        <TableHead >Description</TableHead>
                        <TableHead className="text-center">SKU</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right pr-8">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-center text-slate-400 font-bold text-xs pl-8">{idx + 1}</TableCell>
                          <TableCell className="py-4">
                            <p className="font-bold text-slate-800 text-sm">{item.product_name || item.description}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Standard Inventory Item</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-500 border-slate-200">
                              {item.sku || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-slate-700 text-sm">{item.quantity}</span>
                            <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{item.unit || 'pcs'}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-slate-600 text-sm">Rp {formatCurrency(item.unit_price)}</span>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 pr-8 text-sm">
                            Rp {formatCurrency(item.quantity * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="w-32 text-right">Rp {formatCurrency(po.subtotal)}</span>
                    </div>
                    {po.tax_amount > 0 && (
                      <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Tax (PPN 11%)</span>
                        <span className="w-32 text-right">Rp {formatCurrency(po.tax_amount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-200 w-48 my-2"></div>
                    <div className="flex items-center gap-8">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
                      <span className="text-2xl font-black text-blue-600 w-48 text-right tracking-tighter">
                        Rp {formatCurrency(po.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                  <div className="bg-blue-600 px-6 py-4 flex items-center gap-3 text-white">
                    <Building2 className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Buyer Info</span>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight">{store?.store_name}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{store?.address}</p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        {store?.phone}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        {store?.email}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white border border-emerald-100">
                  <div className="bg-emerald-500 px-6 py-4 flex items-center gap-3 text-white">
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Requested Schedule</span>
                  </div>
                  <CardContent className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Requested Arrival Date</p>
                    <div className="text-xl font-black text-emerald-600 tracking-tight">
                      {moment(po.delivery_date).format('DD MMM YYYY')}
                    </div>
                    <div className="text-xs font-bold text-emerald-400 mt-1 uppercase">
                      {moment(po.delivery_date).format('HH:mm [WIB]')}
                    </div>
                    <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2 text-[10px] font-bold text-emerald-700 text-left">
                      <Info className="w-4 h-4 shrink-0" />
                      Harap konfirmasi kesanggupan barang tiba sesuai jadwal ini pada Section 3
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 2: Negosiasi Harga (Opsional) */}
            <Card className={`border-none shadow-sm rounded-[32px] overflow-hidden transition-all duration-500 ${isNegotiating ? 'ring-2 ring-amber-400 ring-offset-4' : 'bg-white'}`}>
              <div className={`${isNegotiating ? 'bg-amber-500' : 'bg-slate-800'} px-8 py-5 flex items-center justify-between text-white`}>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <CardTitle className="text-sm font-black uppercase tracking-widest">
                    Section 2: Negosiasi Harga (Opsional)
                  </CardTitle>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNegotiating(!isNegotiating)}
                  className="bg-white/20 hover:bg-white/30 border-none text-white font-bold rounded-xl"
                >
                  {isNegotiating ? 'Batal Negosiasi' : 'Ajukan Perubahan'}
                </Button>
              </div>
              {isNegotiating && (
                <CardContent className="p-8 space-y-8 bg-amber-50/30 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                      <Label className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Alasan Perubahan
                      </Label>
                      <Textarea
                        placeholder="Contoh: Terjadi kenaikan harga bahan baku per minggu ini..."
                        value={negotiationReason}
                        onChange={e => setNegotiationReason(e.target.value)}
                        className="min-h-[100px] rounded-2xl border-amber-200 bg-white focus:ring-amber-500 font-bold"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Penawaran Harga Baru {settings.negotiationMode === 'Item' ? '(Per Item)' : '(Total)'}
                      </Label>

                      {settings.negotiationMode === 'Total' ? (
                        <div className="p-8 bg-white rounded-[32px] border-2 border-amber-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Grand Total Counter Offer</p>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">Rp</span>
                            <Input
                              type="number"
                              value={negotiationTotal}
                              onChange={e => setNegotiationTotal(Number(e.target.value))}
                              className="h-16 pl-16 text-4xl font-black text-amber-600 border-none bg-transparent focus:ring-0"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="overflow-hidden rounded-[32px] border border-amber-200 bg-white shadow-sm">
                            <Table>
                              <TableHeader className="bg-amber-50/50">
                                <TableRow className="hover:bg-transparent border-amber-100">
                                  <TableHead className="text-amber-700 pl-6">Produk</TableHead>
                                  <TableHead className="text-center text-amber-700">Order Qty</TableHead>
                                  <TableHead className="text-center text-amber-600 bg-amber-50/50">Proposed Qty (MOQ)</TableHead>
                                  <TableHead className="text-right text-amber-700">Harga Awal</TableHead>
                                  <TableHead className="text-right text-amber-700">Harga Baru</TableHead>
                                  <TableHead className="text-right">PPN (11%)</TableHead>
                                  <TableHead className="text-right text-amber-700 pr-6">Total Baris</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {negotiationItems.map((item, idx) => {
                                  const originalItem = po.items[idx];
                                  const currentUnitPrice = item.unit_price || 0;
                                  const currentQty = item.proposed_qty || item.quantity;
                                  const lineSubtotal = currentQty * currentUnitPrice;
                                  const lineTax = po.tax_amount > 0 ? lineSubtotal * 0.11 : 0;

                                  return (
                                    <TableRow key={idx} className="border-amber-50">
                                      <TableCell className="pl-6 py-4">
                                        <p className="font-bold text-slate-700 text-xs">{item.product_name}</p>
                                        <p className="text-[9px] text-slate-400 font-medium">Original Qty: {item.quantity} {item.unit}</p>
                                      </TableCell>
                                      <TableCell className="text-center text-slate-400 font-bold text-xs">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-center bg-amber-50/30">
                                        <Input
                                          type="number"
                                          value={item.proposed_qty || item.quantity}
                                          onChange={e => {
                                            const newItems = [...negotiationItems];
                                            newItems[idx].proposed_qty = Number(e.target.value);
                                            newItems[idx].subtotal = newItems[idx].proposed_qty * newItems[idx].unit_price;
                                            setNegotiationItems(newItems);
                                          }}
                                          className="w-20 mx-auto h-8 text-center font-black text-blue-600 border-blue-200 bg-white focus:ring-blue-500 rounded-lg text-xs"
                                        />
                                      </TableCell>
                                      <TableCell className="text-right text-slate-600 font-bold text-xs">Rp {formatCurrency(originalItem.unit_price)}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <span className="text-[9px] font-bold text-amber-400">Rp</span>
                                          <Input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={e => {
                                              const newItems = [...negotiationItems];
                                              newItems[idx].unit_price = Number(e.target.value);
                                              newItems[idx].subtotal = (newItems[idx].proposed_qty || newItems[idx].quantity) * newItems[idx].unit_price;
                                              setNegotiationItems(newItems);
                                            }}
                                            className="w-28 h-8 text-right font-black text-amber-600 border-amber-200 bg-white focus:ring-amber-500 rounded-lg text-xs"
                                          />
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right text-slate-400 font-medium text-[10px]">
                                        Rp {formatCurrency(lineTax)}
                                      </TableCell>
                                      <TableCell className="text-right pr-6 font-black text-slate-900 text-xs">
                                        Rp {formatCurrency(lineSubtotal + lineTax)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="p-8 bg-amber-600 rounded-[32px] text-white flex justify-between items-center shadow-none">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-widest opacity-80">Estimasi Grand Total Baru</span>
                              <span className="text-[10px] font-bold opacity-60">* Sudah Termasuk PPN 11% (Jika Ada)</span>
                            </div>
                            <span className="text-4xl font-black tracking-tighter">
                              Rp {formatCurrency(negotiationItems.reduce((acc, curr) => {
                                const sub = (curr.proposed_qty || curr.quantity) * curr.unit_price;
                                const tax = po.tax_amount > 0 ? sub * 0.11 : 0;
                                return acc + sub + tax;
                              }, 0))}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-amber-600 font-bold italic px-2">
                        * Perubahan harga ini hanya bersifat penawaran dan akan dikonfirmasi oleh pembeli.
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </>)}

          {/* ═══ FASE 2: Shipping Details (hanya jika Approved) ═══ */}
          {po.status === 'Approved' && (<>
            {/* Section 3: Detail Pengiriman */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="bg-blue-700 px-8 py-5 flex items-center gap-3 text-white">
                <Truck className="w-5 h-5" />
                <CardTitle className="text-sm font-black uppercase tracking-widest">
                  Section 3: Detail Pengiriman & Logistik
                </CardTitle>
              </div>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-10">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">Metode Pengiriman <InfoTooltip text="Pilih cara pengiriman barang: Armada Supplier = kendaraan milik Anda, Pickup = buyer ambil sendiri, Ekspedisi = via JNE/SiCepat/dll." /></Label>
                      <Select
                        value={shippingDetails.delivery_method}
                        onValueChange={val => setShippingDetails({ ...shippingDetails, delivery_method: val })}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold">
                          <SelectValue placeholder="Pilih metode..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Armada Supplier">Armada Supplier (Vendor Delivery)</SelectItem>
                          <SelectItem value="Pickup Internal">Pickup oleh Buyer / Internal Pickup</SelectItem>
                          <SelectItem value="Ekspedisi Eksternal">Ekspedisi Eksternal (3rd Party Logistics)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">Confirmed Arrival Date (ETA) <InfoTooltip text="Tanggal dan waktu perkiraan barang sampai di lokasi buyer. Pastikan realistis agar buyer bisa mempersiapkan penerimaan." /></Label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="datetime-local"
                          value={confirmedDeliveryDate}
                          onChange={e => setConfirmedDeliveryDate(e.target.value)}
                          className="h-12 pl-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-blue-600"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold italic">Kapan Anda menjamin barang sampai di lokasi kami?</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">Nomor Surat Jalan Supplier <InfoTooltip text="Gunakan format internal perusahaan Anda. Contoh: SJ/VND/2026/001, SJ-ABD-2041, atau DO-001/V/2026. Nomor ini akan digunakan sebagai referensi di Goods Receipt & dokumen cetak." /></Label>
                      <Input
                        placeholder="Contoh: SJ/VND/2026/001"
                        value={shippingDetails.supplier_delivery_note_no}
                        onChange={e => setShippingDetails({ ...shippingDetails, supplier_delivery_note_no: e.target.value })}
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold"
                      />
                    </div>
                  </div>

                  {/* Right Column (Conditional) */}
                  <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 min-h-[200px] flex flex-col justify-center">
                    {shippingDetails.delivery_method === 'Armada Supplier' ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Truck className="w-5 h-5" />
                          </div>
                          <h4 className="font-black text-slate-800 text-sm uppercase">Detail Armada Internal</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Nama Sopir <InfoTooltip text="Nama lengkap driver yang mengantarkan barang. Diperlukan untuk verifikasi di lokasi buyer." /></Label>
                            <div className="relative">
                              <Input
                                list="driverHistoryList"
                                placeholder="Ketik atau pilih nama..."
                                value={shippingDetails.driver_name}
                                onChange={e => {
                                  const selectedName = e.target.value;
                                  const match = driverHistory.find(d => d.name.toLowerCase() === selectedName.toLowerCase());
                                  if (match) {
                                    setShippingDetails({
                                      ...shippingDetails,
                                      driver_name: match.name,
                                      driver_phone: match.phone || shippingDetails.driver_phone,
                                      ship_via: match.ship_via || shippingDetails.ship_via,
                                      vehicle_number: match.vehicle_number || shippingDetails.vehicle_number
                                    });
                                  } else {
                                    setShippingDetails({ ...shippingDetails, driver_name: selectedName });
                                  }
                                }}
                                className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white pr-8"
                              />
                              <datalist id="driverHistoryList">
                                {driverHistory.map((d, i) => <option key={i} value={d.name} />)}
                              </datalist>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">No. WA Sopir <InfoTooltip text="Nomor WhatsApp aktif driver untuk koordinasi dan link tanda tangan." /></Label>
                            <Input
                              placeholder="0812xxxxxx"
                              value={shippingDetails.driver_phone || ''}
                              onChange={e => setShippingDetails({ ...shippingDetails, driver_phone: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Plat Nomor <InfoTooltip text="Nomor polisi kendaraan pengirim. Format: B 1234 XYZ. Diperlukan untuk akses masuk gudang buyer." /></Label>
                            <Input
                              placeholder="B 1234 XYZ"
                              value={shippingDetails.vehicle_number}
                              onChange={e => setShippingDetails({ ...shippingDetails, vehicle_number: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipe Kendaraan</Label>
                            <Input
                              placeholder="Truck Box, Pickup, dll"
                              value={shippingDetails.ship_via}
                              onChange={e => setShippingDetails({ ...shippingDetails, ship_via: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ) : shippingDetails.delivery_method === 'Ekspedisi Eksternal' ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <h4 className="font-black text-slate-800 text-sm uppercase">Detail Jasa Ekspedisi</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Nama Ekspedisi <InfoTooltip text="Nama jasa ekspedisi yang digunakan. Contoh: JNE, SiCepat, J&T, AnterAja, Paxel, atau ekspedisi lokal." /></Label>
                            <Select
                              value={shippingDetails.courier_name}
                              onValueChange={val => setShippingDetails({ ...shippingDetails, courier_name: val })}
                            >
                              <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white">
                                <SelectValue placeholder="Pilih Ekspedisi..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="JNE">JNE (Jalur Nugraha Ekakurir)</SelectItem>
                                <SelectItem value="J&T Express">J&T Express</SelectItem>
                                <SelectItem value="SiCepat">SiCepat Ekspres</SelectItem>
                                <SelectItem value="Ninja Xpress">Ninja Xpress</SelectItem>
                                <SelectItem value="AnterAja">AnterAja</SelectItem>
                                <SelectItem value="Lion Parcel">Lion Parcel</SelectItem>
                                <SelectItem value="Wahana">Wahana</SelectItem>
                                <SelectItem value="TIKI">TIKI</SelectItem>
                                <SelectItem value="Grab/Gojek">Grab / Gojek</SelectItem>
                                <SelectItem value="Lainnya">Lainnya (Manual Input)</SelectItem>
                              </SelectContent>
                            </Select>
                            {shippingDetails.courier_name === 'Lainnya' && (
                              <Input
                                placeholder="Ketik nama ekspedisi..."
                                className="h-10 mt-2 text-xs font-bold rounded-xl border-slate-200 bg-white"
                                onChange={e => setShippingDetails({ ...shippingDetails, courier_name_custom: e.target.value })}
                              />
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Kurir</Label>
                            <div className="relative">
                              <Input
                                list="ekspedisiDriverHistoryList"
                                placeholder="Ketik atau pilih nama..."
                                value={shippingDetails.courier_person_name}
                                onChange={e => {
                                  const selectedName = e.target.value;
                                  const match = driverHistory.find(d => d.name.toLowerCase() === selectedName.toLowerCase());
                                  if (match) {
                                    setShippingDetails({
                                      ...shippingDetails,
                                      courier_person_name: match.name,
                                      courier_person_phone: match.phone || shippingDetails.courier_person_phone,
                                      ship_via: match.ship_via || shippingDetails.ship_via,
                                      vehicle_number: match.vehicle_number || shippingDetails.vehicle_number
                                    });
                                  } else {
                                    setShippingDetails({ ...shippingDetails, courier_person_name: selectedName });
                                  }
                                }}
                                className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white pr-8"
                              />
                              <datalist id="ekspedisiDriverHistoryList">
                                {driverHistory.map((d, i) => <option key={i} value={d.name} />)}
                              </datalist>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">No. WA Kurir <InfoTooltip text="Nomor WhatsApp aktif kurir untuk koordinasi dan link tanda tangan." /></Label>
                            <Input
                              placeholder="0812xxxxxx"
                              value={shippingDetails.courier_person_phone || ''}
                              onChange={e => setShippingDetails({ ...shippingDetails, courier_person_phone: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Plat Nomor</Label>
                            <Input
                              placeholder="B 1234 XYZ"
                              value={shippingDetails.vehicle_number}
                              onChange={e => setShippingDetails({ ...shippingDetails, vehicle_number: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipe Kendaraan</Label>
                            <Input
                              placeholder="Truck Box, Pickup, dll"
                              value={shippingDetails.ship_via}
                              onChange={e => setShippingDetails({ ...shippingDetails, ship_via: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Nomor Resi / Tracking <InfoTooltip text="Nomor resi dari ekspedisi untuk pelacakan paket. Bisa dikosongkan jika menggunakan armada sendiri." /></Label>
                            <Input
                              placeholder="Masukan nomor resi valid"
                              value={shippingDetails.tracking_number}
                              onChange={e => setShippingDetails({ ...shippingDetails, tracking_number: e.target.value })}
                              className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                          <UserCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">Internal Pickup</h4>
                          <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mx-auto">Barang akan diambil langsung oleh tim kami. Harap siapkan dokumen serah terima.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Notes / Catatan Pengiriman</Label>
                  <Textarea
                    placeholder="Tambahkan instruksi khusus pengiriman jika ada..."
                    value={shippingDetails.shipping_notes}
                    onChange={e => setShippingDetails({ ...shippingDetails, shipping_notes: e.target.value })}
                    className="h-20 rounded-2xl border-slate-200 bg-slate-50/50"
                  />
                </div>
              </CardContent>
            </Card>
          </>)}

          {/* Section 4: Persetujuan & Tanda Tangan */}
          <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white p-1 md:p-2">
            <div className="grid md:grid-cols-2">
              <div className="p-10 md:p-14 bg-slate-900 text-white flex flex-col justify-between rounded-[36px]">
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tight leading-none uppercase">
                      {po.status === 'Approved' ? 'Konfirmasi Pengiriman' : 'Final Confirmation'}
                    </h2>
                    <p className="text-slate-400 font-medium">
                      {po.status === 'Approved'
                        ? 'Tanda tangani untuk mengkonfirmasi bahwa barang siap dikirim dengan detail pengiriman di atas.'
                        : 'Langkah terakhir untuk menyetujui harga dan item pesanan.'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-6">
                    <div className="flex items-start space-x-4 group cursor-pointer" onClick={() => setIsAccepted(!isAccepted)}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAccepted ? 'bg-blue-600 border-blue-600' : 'border-slate-700'}`}>
                        {isAccepted && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <p className="text-xs font-medium text-slate-300 leading-relaxed pt-0.5">
                        {po.status === 'Approved'
                          ? 'Saya mengkonfirmasi bahwa barang telah siap dikirim dengan detail pengiriman yang saya input di atas.'
                          : 'Saya menyetujui detail Purchase Order, harga yang disepakati, quantity, dan terms di atas.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      Digitally Secure • Audit Trail Enabled
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-10 md:p-14 space-y-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm space-y-6">
                  <div className="text-center">
                    {po.status === 'Approved' && (
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanda Tangan Kurir / Driver</p>

                          {(shippingDetails.driver_phone || shippingDetails.courier_person_phone) && !courierSignature && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                const phone = shippingDetails.delivery_method === 'Armada Supplier' ? shippingDetails.driver_phone : shippingDetails.courier_person_phone;
                                const driverName = shippingDetails.delivery_method === 'Armada Supplier' ? shippingDetails.driver_name : shippingDetails.courier_person_name;
                                if (!phone) return;

                                let formattedPhone = phone;
                                if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

                                const driverUrl = `${window.location.origin}${window.location.pathname}?mode=driver`;
                                const text = `Halo ${driverName || 'Driver'}, mohon tanda tangan pengiriman barang untuk PO ${po.po_number} dari ${po.supplier_name} di link berikut:\n\n${driverUrl}`;

                                window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
                              }}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Kirim Link WA
                            </Button>
                          )}
                        </div>
                        <div className={`p-4 bg-slate-50 rounded-[32px] border-2 border-dashed transition-all ${isAccepted ? 'border-emerald-200 opacity-100' : 'border-slate-200 opacity-30 pointer-events-none'}`}>
                          {courierSignature ? (
                            <div className="relative flex flex-col items-center">
                              <img src={courierSignature} className="h-[180px] object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:invert dark:brightness-150" alt="Courier Signature" />
                              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">SIGNED</div>
                              <Button onClick={() => setCourierSignature(null)} variant="outline" size="sm" className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50">
                                Ulangi Tanda Tangan Kurir
                              </Button>
                            </div>
                          ) : (
                            <SignaturePad
                              onSave={(data) => setCourierSignature(data)}
                              title="Pengirim / Driver (Kurir)"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Digital Signature Area</p>
                    <div className={`p-4 bg-slate-50 rounded-[32px] border-2 border-dashed transition-all ${isAccepted ? 'border-blue-200 opacity-100' : 'border-slate-200 opacity-30 pointer-events-none'} ${po.status === 'Approved' && !courierSignature ? 'opacity-30 pointer-events-none ring-2 ring-red-400 ring-offset-2' : ''}`}>
                      <SignaturePad
                        onSave={po.status === 'Approved' ? handleShippingSign : handleSign}
                        title={`Supplier Representative (${po.supplier_name})`}
                        initialSignature={localStorage.getItem(`last_supplier_signature_${po.supplier_id}`)}
                      />
                    </div>
                    {!isAccepted && (
                      <p className="mt-4 text-[10px] font-bold text-red-400 animate-pulse">
                        * Harap centang kotak persetujuan untuk menandatangani
                      </p>
                    )}
                    {(po.status === 'Approved' && isAccepted && !courierSignature) && (
                      <p className="mt-4 text-[10px] font-bold text-amber-500 animate-pulse">
                        * Kurir / Driver harus menandatangani terlebih dahulu
                      </p>
                    )}
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  <div className="text-center space-y-1">
                    <p className="font-black text-slate-800 uppercase tracking-tight">{po.supplier_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Authorized Supplier Partner
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <footer className="text-center pb-20 space-y-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Tradixa Intelligent Procurement Protocol © 2026
            </p>
          </footer>
        </div>
      )}

      {/* Hidden Print Template */}
      <div id="print-public-po" className="hidden">
        {po && (
          <div
            dangerouslySetInnerHTML={{
              __html: getDocumentTemplate({
                type: 'PURCHASE ORDER',
                storeName: store?.store_name || 'TOKO ANDA',
                logoUrl: store?.logo_url,
                brandColor: store?.brand_color || '#2563eb',
                titleColor: store?.title_color || '#0f172a',
                layout: store?.invoice_layout_style || 'Modern',
                data: {
                  ...po,
                  store_address: store?.address
                }
              })
            }}
          />
        )}
      </div>
    </div>
  );
}
