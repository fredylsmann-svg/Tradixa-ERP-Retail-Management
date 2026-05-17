import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Truck, MapPin, Navigation, Clock, CheckCircle2, XCircle, Route, Plus, Info, HelpCircle, Eye, Phone, MessageSquare, MessageCircle, Calendar, Camera, History } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import ExportToolbar from '@/components/layout/ExportToolbar';
import { cn } from '@/lib/utils';
import moment from 'moment';
import { getEffectiveLimits } from '@/planConfig';

const libraries = ['places'];
const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '12px' };
const defaultCenter = { lat: -6.2088, lng: 106.8456 }; // Jakarta

export default function OutboundDelivery({ store }) {
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [newDelivery, setNewDelivery] = useState({
    customer_id: 'manual',
    shipping_address: '',
    driver_name: '',
    driver_phone: '',
    tracking_number: ''
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const autocompleteRef = React.useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
        setNewDelivery({
          ...newDelivery,
          shipping_address: place.formatted_address,
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null
        });
      }
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const formatWaNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
  };

  useEffect(() => {
    if (store?.id) {
      loadDeliveries();
      loadCustomers();
    }
  }, [store]);

  const loadCustomers = async () => {
    try {
      const data = await api.entities.Customer.filter({ store_id: store.id, status: 'Active' });
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('outbound_deliveries')
        .select(`
          *,
          customers(name, phone, address),
          sales_transactions(invoice_number)
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDeliveries(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data pengiriman');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRoute = async (delivery) => {
    if (!isLoaded) return;
    
    const origin = store.latitude && store.longitude 
      ? { lat: Number(store.latitude), lng: Number(store.longitude) } 
      : store.address;

    if (!origin) {
      toast.error('Gagal: Anda harus mengisi alamat yang benar di Company Settings untuk Toko Anda.');
      return;
    }
      
    const destinationLatLng = (delivery.latitude && delivery.longitude) 
      ? { lat: Number(delivery.latitude), lng: Number(delivery.longitude) } : null;
      
    const destination = destinationLatLng || delivery.shipping_address || delivery.customers?.address;

    if (!destination) {
      toast.error('Gagal: Anda harus mengisi alamat yang benar di Customer Master atau secara manual.');
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      
      setDirectionsResponse(results);
      setDistance(results.routes[0].legs[0].distance.text);
      setDuration(results.routes[0].legs[0].duration.text);
      
      // Auto-calculate fee based on distance value (in meters)
      const distMeters = results.routes[0].legs[0].distance.value;
      const km = distMeters / 1000;
      const calculatedFee = Math.ceil(km) * 2000; // Rp 2.000 / km
      
      setSelectedDelivery({
        ...delivery,
        distance_km: km.toFixed(2),
        shipping_fee: calculatedFee
      });
      setIsMapOpen(true);
    } catch (error) {
      console.error("Directions request failed", error);
      if (error.code === 'ZERO_RESULTS' || error.message?.includes('ZERO_RESULTS')) {
         toast.error('Tidak ada rute darat (driving) yang tersedia ke lokasi tersebut.');
      } else if (error.code === 'NOT_FOUND') {
         toast.error('Lokasi tujuan atau asal tidak dapat ditemukan di Google Maps.');
      } else {
         toast.error('Gagal menghitung rute: ' + (error.message || error.code || 'Pastikan alamat valid.'));
      }
    }
  };

  const handleUpdateDelivery = async () => {
    try {
      const shippingFee = Number(selectedDelivery.shipping_fee) || 0;
      const costAllocation = selectedDelivery.cost_allocation || 'company';
      const payload = {
        status: selectedDelivery.status,
        driver_name: selectedDelivery.driver_name,
        driver_phone: selectedDelivery.driver_phone,
        vehicle_type: selectedDelivery.vehicle_type,
        license_plate: selectedDelivery.license_plate,
        tracking_number: selectedDelivery.tracking_number,
        distance_km: selectedDelivery.distance_km,
        shipping_fee: shippingFee,
        shipping_address: selectedDelivery.shipping_address,
        cost_allocation: costAllocation
      };
      
      // Auto-update timestamps and audit logs
      const now = moment().format('DD/MM/YYYY HH:mm [WIB]');
      const auditLog = selectedDelivery.audit_logs || [];
      
      if (selectedDelivery.status === 'In Transit' && !selectedDelivery.transit_at) {
        payload.transit_at = new Date().toISOString();
        payload.audit_logs = [...auditLog, { status: 'In Transit', time: now, note: 'Pengiriman dikirim oleh admin' }];
      } else if (selectedDelivery.status === 'Delivered' && !selectedDelivery.delivered_at) {
        payload.delivered_at = new Date().toISOString();
        payload.audit_logs = [...auditLog, { status: 'Delivered', time: now, note: 'Tanda terima diselesaikan oleh admin' }];
      }

      await api.entities.OutboundDelivery.update(selectedDelivery.id, payload);

      // === INTEGRASI AKUNTANSI OTOMATIS ===
      if (shippingFee > 0) {
        const invoiceNum = selectedDelivery.sales_transactions?.invoice_number || selectedDelivery.id?.substring(0, 8);
        const customerName = selectedDelivery.customers?.name || 'Manual';
        const reference = `SHIP-${Date.now().toString(36).toUpperCase()}`;
        const today = new Date().toISOString().split('T')[0];
        const currentDate = new Date();
        const wibOffset = 7 * 60;
        const utc = currentDate.getTime() + (currentDate.getTimezoneOffset() * 60000);
        const wibTime = new Date(utc + (wibOffset * 60000));
        const timestampWib = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;

        if (costAllocation === 'company') {
          // --- OPSI: DITANGGUNG TOKO ---
          // 1. Auto-create Expense
          await api.entities.Expense.create({
            store_id: store.id,
            date: today,
            category: 'Transportasi & Pengiriman',
            amount: shippingFee,
            notes: `Ongkir Outbound - ${customerName} (${invoiceNum})`,
            reference: reference,
            created_date: today,
            timestamp_wib: timestampWib
          });

          // 2. Auto-create Journal Entry (Draft)
          const journal = await api.entities.JournalEntry.create({
            store_id: store.id,
            transaction_id: reference,
            date: today,
            description: `Beban Pengiriman - ${customerName} (${invoiceNum})`,
            type: 'Payment',
            status: 'Draft',
            total_debit: shippingFee,
            total_credit: shippingFee,
            created_by: 'Sistem Outbound'
          });

          await Promise.all([
            api.entities.JournalLine.create({
              journal_id: journal.id,
              account_name: 'Beban Transportasi & Pengiriman',
              description: `Ongkir ${customerName} - ${invoiceNum}`,
              debit: shippingFee,
              credit: 0
            }),
            api.entities.JournalLine.create({
              journal_id: journal.id,
              account_name: 'Kas Kantor',
              description: `Pembayaran ongkir ${invoiceNum}`,
              debit: 0,
              credit: shippingFee
            })
          ]);

        } else {
          // --- OPSI: DITAGIHKAN KE CUSTOMER ---
          // 1. Auto-create Receivable (Piutang Ongkir)
          const customerId = selectedDelivery.customer_id;
          await api.entities.Receivable.create({
            store_id: store.id,
            invoice_number: reference,
            customer_id: customerId,
            customer_name: customerName,
            amount: shippingFee,
            remaining_amount: shippingFee,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: `Ongkir pengiriman ${invoiceNum}`,
            status: 'Pending',
            timestamp_wib: timestampWib,
            created_date: today
          });

          // 2. Auto-create Journal Entry (Draft)
          const journal = await api.entities.JournalEntry.create({
            store_id: store.id,
            transaction_id: reference,
            date: today,
            description: `Piutang Ongkir - ${customerName} (${invoiceNum})`,
            type: 'Receivable',
            status: 'Draft',
            total_debit: shippingFee,
            total_credit: shippingFee,
            created_by: 'Sistem Outbound'
          });

          await Promise.all([
            api.entities.JournalLine.create({
              journal_id: journal.id,
              account_name: 'Piutang Usaha',
              description: `Piutang ongkir ${customerName} - ${invoiceNum}`,
              debit: shippingFee,
              credit: 0
            }),
            api.entities.JournalLine.create({
              journal_id: journal.id,
              account_name: 'Pendapatan Pengiriman',
              description: `Pendapatan ongkir ${invoiceNum}`,
              debit: 0,
              credit: shippingFee
            })
          ]);
        }
      }
      // === END INTEGRASI AKUNTANSI ===

      toast.success('Pengiriman berhasil diupdate & dicatat ke akuntansi');
      setIsMapOpen(false);
      loadDeliveries();
    } catch (error) {
      toast.error('Gagal update pengiriman: ' + error.message);
    }
  };

  const handleCreateManualDelivery = async () => {
    try {
      let custId = newDelivery.customer_id;
      let address = newDelivery.shipping_address;
      let lat = null;
      let lng = null;

      if (custId && custId !== 'manual') {
        const customer = customers.find(c => c.id === custId);
        if (customer) {
          address = address || customer.address || customer.formatted_address;
          lat = customer.latitude;
          lng = customer.longitude;
        }
      } else {
        custId = null;
      }

      if (!address) {
        toast.error('Alamat tujuan wajib diisi!');
        return;
      }

      const payload = {
        store_id: store.id,
        customer_id: custId,
        shipping_address: address,
        latitude: lat,
        longitude: lng,
        driver_name: newDelivery.driver_name,
        driver_phone: newDelivery.driver_phone,
        tracking_number: newDelivery.tracking_number,
        status: 'Pending',
        audit_logs: [{ status: 'Pending', time: moment().format('DD/MM/YYYY HH:mm [WIB]'), note: 'Pengiriman dijadwalkan' }]
      };

      await supabase.from('outbound_deliveries').insert([payload]);
      
      toast.success('Pengiriman manual berhasil dibuat');
      setIsCreateOpen(false);
      setNewDelivery({ customer_id: 'manual', shipping_address: '', driver_name: '', tracking_number: '' });
      loadDeliveries();
    } catch (error) {
      toast.error('Gagal membuat pengiriman: ' + error.message);
    }
  };

  const statusColors = {
    'Pending': 'bg-orange-100 text-orange-700',
    'In Transit': 'bg-blue-100 text-blue-700',
    'Delivered': 'bg-emerald-100 text-emerald-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Outbound Delivery"
        subtitle="Kelola pengiriman barang ke pelanggan dan lacak rute pengiriman"
        icon={Truck}
        onRefresh={loadDeliveries}
        isRefreshing={isLoading}
        children={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" /> Cara Penggunaan
                </DialogTitle>
                <DialogDescription className="pt-4 space-y-4 text-left">
                  <p className="text-sm text-slate-600">Untuk menambahkan data ke modul ini secara otomatis, ikuti langkah berikut:</p>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                    <li>Buka halaman <span className="font-bold text-slate-900">Sales Transaction</span>.</li>
                    <li>Pilih pelanggan dan produk yang akan dibeli.</li>
                    <li>Pada Opsi Pengiriman, pilih metode <span className="font-bold text-blue-600">Pengiriman Barang</span>.</li>
                    <li>Proses transaksi hingga selesai.</li>
                    <li>Data pengiriman otomatis akan muncul di halaman ini untuk diproses kurir.</li>
                  </ol>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar 
              title="Daftar Pengiriman (Outbound Delivery)" 
              date={moment().format('DD MMMM YYYY')} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-outbound-deliveries" 
            />
            <Button 
              className="bg-blue-600 hover:bg-blue-700 h-11 rounded-xl" 
              onClick={() => {
                const limits = getEffectiveLimits(store);
                if (limits.maxOutboundDeliveries !== Infinity && deliveries.length >= limits.maxOutboundDeliveries) {
                  toast.error(`Batas Penggunaan Tercapai: Anda sudah mencapai maksimal ${limits.maxOutboundDeliveries} data pengiriman. Silakan upgrade ke Pro Plan!`);
                  return;
                }
                setIsCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Buat Pengiriman Manual</span><span className="sm:hidden">Buat Pengiriman</span>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari no invoice, pelanggan, atau resi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div id="print-outbound-deliveries" className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Invoice & Resi</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Kurir</TableHead>
                <TableHead>Jarak & Ongkir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    Belum ada jadwal pengiriman
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery, index) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="text-slate-400 font-bold text-center">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-bold text-blue-600">{delivery.sales_transactions?.invoice_number || '-'}</div>
                      <div className="text-xs text-slate-500 mt-1">Resi: {delivery.tracking_number || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{delivery.customers?.name || 'Manual'}</div>
                      <div className="text-xs text-slate-500 flex items-center mt-1 truncate max-w-[200px]" title={delivery.shipping_address}>
                        <MapPin className="w-3 h-3 mr-1 shrink-0" />
                        {delivery.shipping_address || delivery.customers?.address || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{delivery.driver_name || '-'}</TableCell>
                    <TableCell>
                      {delivery.distance_km > 0 ? (
                        <div>
                          <div className="text-sm font-medium">{delivery.distance_km} KM</div>
                          <div className="text-xs text-slate-500">Rp {Number(delivery.shipping_fee).toLocaleString('id-ID')}</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[delivery.status]}>{delivery.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!delivery.driver_phone || delivery.status === 'Delivered'}
                          className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 border-emerald-200 disabled:opacity-50 disabled:bg-slate-50"
                          onClick={() => {
                            if (!delivery.driver_phone) return;
                            const link = `${window.location.origin}/public/delivery/${delivery.id}/courier`;
                            const text = `Halo *${delivery.driver_name || 'Kurir'}*,\n\nBerikut adalah rute dan portal pengiriman barang Tradixa untuk Invoice *${delivery.sales_transactions?.invoice_number || delivery.id}*.\n\nSilakan klik link berikut untuk panduan navigasi dan konfirmasi foto saat sampai di tujuan:\n\n${link}\n\nTerima kasih.`;
                            window.open(`https://wa.me/${formatWaNumber(delivery.driver_phone)}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          title={!delivery.driver_phone ? "Isi Nomor WA Kurir di Rute & Ongkir terlebih dahulu" : delivery.status === 'Delivered' ? "Pengiriman sudah selesai" : "Kirim Link Portal ke WA"}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedDelivery(delivery); setIsDetailOpen(true); }} className="h-8 w-8 p-0 rounded-lg" title="Detail & Log">
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => calculateRoute(delivery)}>
                          <Route className="w-4 h-4 mr-2 text-blue-600" /> Rute & Ongkir
                        </Button>
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

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pengiriman & Rute Peta</DialogTitle>
            <DialogDescription>
              {selectedDelivery?.customers?.name} - {selectedDelivery?.sales_transactions?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-2 rounded-xl overflow-hidden border">
              {isLoaded ? (
                <GoogleMap
                  center={defaultCenter}
                  zoom={12}
                  mapContainerStyle={mapContainerStyle}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                >
                  {directionsResponse && (
                    <DirectionsRenderer directions={directionsResponse} />
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-[400px] bg-slate-100 flex items-center justify-center">
                  Memuat Google Maps...
                </div>
              )}
              
              {directionsResponse && (
                <div className="bg-white p-4 flex justify-around border-t">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Jarak Tempuh</p>
                    <p className="text-xl font-bold text-blue-600">{distance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Estimasi Waktu</p>
                    <p className="text-xl font-bold text-emerald-600">{duration}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {selectedDelivery && (
                <>
                  <div>
                    <Label>Status Pengiriman</Label>
                    <Select 
                      value={selectedDelivery.status} 
                      onValueChange={(v) => setSelectedDelivery({...selectedDelivery, status: v})}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nama Kurir/Driver</Label>
                    <Input 
                      value={selectedDelivery.driver_name || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, driver_name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Label>Nomor WhatsApp Kurir</Label>
                      <div className="group relative flex items-center">
                        <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
                        <div className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-56 sm:w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-xl">
                          Nomor ini akan menerima link portal khusus kurir untuk mengirimkan bukti foto barang diterima oleh customer secara real-time.
                          <div className="absolute top-full right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    </div>
                    <Input 
                      value={selectedDelivery.driver_phone || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, driver_phone: e.target.value})}
                      placeholder="Contoh: 08123456789"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Tipe Kendaraan</Label>
                    <Input 
                      value={selectedDelivery.vehicle_type || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, vehicle_type: e.target.value})}
                      placeholder="Contoh: Mobil Box / Motor"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Nomor Plat Kendaraan</Label>
                    <Input 
                      value={selectedDelivery.license_plate || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, license_plate: e.target.value.toUpperCase()})}
                      placeholder="Contoh: B 1234 CD"
                      className="mt-1 uppercase"
                    />
                  </div>
                  <div>
                    <Label>Nomor Resi / Lacak</Label>
                    <Input 
                      value={selectedDelivery.tracking_number || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, tracking_number: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Alamat Tujuan</Label>
                    <Input 
                      value={selectedDelivery.shipping_address || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, shipping_address: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <Label className="text-blue-600 font-bold">Kalkulasi Ongkos Kirim</Label>
                    <p className="text-xs text-slate-500 mb-2">Rekomendasi sistem: Rp 2.000 / KM. Anda bisa mengubahnya secara manual jika diperlukan.</p>
                    <Input 
                      type="number"
                      value={selectedDelivery.shipping_fee || ''} 
                      onChange={(e) => setSelectedDelivery({...selectedDelivery, shipping_fee: e.target.value})}
                      className="mt-1 text-lg font-bold"
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <Label className="text-emerald-600 font-bold">Pembebanan Ongkir</Label>
                    <p className="text-xs text-slate-500 mb-2">Tentukan siapa yang menanggung biaya pengiriman ini.</p>
                    <Select
                      value={selectedDelivery.cost_allocation || 'company'}
                      onValueChange={(v) => setSelectedDelivery({...selectedDelivery, cost_allocation: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Ditanggung Toko (Masuk Beban Operasional)</SelectItem>
                        <SelectItem value="customer">Ditagihkan ke Customer (Masuk Piutang / AR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsMapOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateDelivery} className="bg-blue-600 hover:bg-blue-700">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          onInteractOutside={(e) => {
            if (e.target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Buat Pengiriman Manual</DialogTitle>
            <DialogDescription>Jadwalkan pengiriman logistik secara manual ke pelanggan atau tujuan lain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Pilih Pelanggan (Opsional)</Label>
              <Select value={newDelivery.customer_id} onValueChange={(v) => setNewDelivery({...newDelivery, customer_id: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih pelanggan..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">-- Tujuan Manual / Bukan Pelanggan --</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alamat Tujuan Pengiriman *</Label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <Input 
                    value={newDelivery.shipping_address} 
                    onChange={(e) => setNewDelivery({...newDelivery, shipping_address: e.target.value})}
                    placeholder={newDelivery.customer_id !== 'manual' ? "Otomatis diisi jika kosong, atau ketik manual..." : "Ketik alamat tujuan lengkap..."}
                    className="mt-1"
                  />
                </Autocomplete>
              ) : (
                <Input 
                  value={newDelivery.shipping_address} 
                  onChange={(e) => setNewDelivery({...newDelivery, shipping_address: e.target.value})}
                  placeholder={newDelivery.customer_id !== 'manual' ? "Otomatis diisi jika kosong, atau ketik manual..." : "Ketik alamat tujuan lengkap..."}
                  className="mt-1"
                />
              )}
            </div>
            <div>
              <Label>Nama Kurir/Driver</Label>
              <Input 
                value={newDelivery.driver_name} 
                onChange={(e) => setNewDelivery({...newDelivery, driver_name: e.target.value})}
                placeholder="Nama kurir yang bertugas"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nomor WhatsApp Kurir</Label>
              <Input 
                value={newDelivery.driver_phone} 
                onChange={(e) => setNewDelivery({...newDelivery, driver_phone: e.target.value})}
                placeholder="Contoh: 08123456789"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nomor Resi / Lacak</Label>
              <Input 
                value={newDelivery.tracking_number} 
                onChange={(e) => setNewDelivery({...newDelivery, tracking_number: e.target.value})}
                placeholder="Kode resi jika ada"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreateManualDelivery} className="bg-blue-600 hover:bg-blue-700">Buat Pengiriman</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail & Audit Log Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Detail Pengiriman & Log
            </DialogTitle>
            <DialogDescription>
              {selectedDelivery?.sales_transactions?.invoice_number || 'Outbound Delivery'}
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                  <p className="font-bold text-slate-900 mt-1">{selectedDelivery.customers?.name || 'Manual'}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedDelivery.customers?.phone || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Status Saat Ini</p>
                  <Badge className={cn("mt-1", statusColors[selectedDelivery.status])}>{selectedDelivery.status}</Badge>
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Informasi Kurir
                  </h4>
                  {selectedDelivery.driver_phone && (
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 rounded-lg text-xs"
                      onClick={() => {
                        window.open(`https://wa.me/${formatWaNumber(selectedDelivery.driver_phone)}`, '_blank');
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Chat Driver
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Nama Kurir</p>
                    <p className="font-bold text-slate-800">{selectedDelivery.driver_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">WhatsApp</p>
                    <p className="font-bold text-slate-800">{selectedDelivery.driver_phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Tipe Kendaraan</p>
                    <p className="font-bold text-slate-800">{selectedDelivery.vehicle_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Plat Nomor</p>
                    <p className="font-bold text-slate-800">{selectedDelivery.license_plate || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" /> Riwayat Status & Audit Log
                </h4>
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {(selectedDelivery.audit_logs || []).map((log, idx) => (
                    <div key={idx} className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 z-10" />
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className={statusColors[log.status]}>{log.status}</Badge>
                          <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 italic">{log.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDelivery.proof_photo_url && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-600" /> Bukti Foto Penerimaan
                  </h4>
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner">
                    <img src={selectedDelivery.proof_photo_url} alt="Proof" className="w-full h-auto object-cover max-h-80" />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
            <Button onClick={() => { setIsDetailOpen(false); calculateRoute(selectedDelivery); }} className="bg-blue-600 text-white">Edit Detail / Rute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
