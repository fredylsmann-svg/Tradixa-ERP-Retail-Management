import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Package, CheckCircle2, Loader2, Navigation, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function PublicCourierPortal() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    loadDelivery();
  }, [id]);

  const loadDelivery = async () => {
    try {
      const { data, error } = await supabase
        .from('outbound_deliveries')
        .select(`
          *,
          customers(name, phone, address),
          sales_transactions(invoice_number),
          stores(store_name, address, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setDelivery(data);
    } catch (err) {
      console.error(err);
      toast.error('Data pengiriman tidak ditemukan');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!photo) {
      toast.error('Mohon ambil foto bukti barang sudah diterima');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photo to Supabase Storage
      const fileExt = photo.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `delivery-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tradixa-assets')
        .upload(filePath, photo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tradixa-assets')
        .getPublicUrl(filePath);

      // 2. Update Delivery Status & Audit Log
      const now = moment().format('DD/MM/YYYY HH:mm [WIB]');
      const auditLog = delivery.audit_logs || [];
      const newLog = { 
        status: 'Delivered', 
        time: now, 
        note: 'Diterima oleh customer (via Portal Kurir)' 
      };

      const { error: updateError } = await supabase
        .from('outbound_deliveries')
        .update({
          status: 'Delivered',
          proof_photo_url: publicUrl,
          delivered_at: new Date().toISOString(),
          audit_logs: [...auditLog, newLog]
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Pengiriman Berhasil Diselesaikan!');
      loadDelivery();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyelesaikan pengiriman: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center items-start">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center items-start">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <Package className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Oops! Data Tidak Ada</h1>
          <p className="text-slate-500 mt-2">Link ini mungkin sudah kadaluarsa atau nomor pengiriman salah.</p>
        </div>
      </div>
    );
  }

  if (delivery.status === 'Delivered') {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center items-start">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">PENGIRIMAN SELESAI</h1>
          <p className="text-slate-500 mt-2">Barang sudah diterima oleh customer.</p>
          <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm border w-full max-w-sm text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Diterima pada</p>
            <p className="font-bold text-slate-800">{moment(delivery.delivered_at).format('DD MMMM YYYY, HH:mm')} WIB</p>
            {delivery.proof_photo_url && (
              <img 
                src={delivery.proof_photo_url} 
                alt="Bukti Foto" 
                className="mt-4 w-full h-48 object-cover rounded-xl shadow-inner border"
              />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-8">Terima kasih telah bekerja dengan Tradixa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-start">
      <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative pb-20 overflow-hidden">
      <div className="bg-blue-600 p-6 pb-8 text-white rounded-b-[40px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-200" />
            <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">Portal Kurir</span>
          </div>
          <Badge className="bg-blue-500 text-white border-blue-400 font-bold">{delivery.status}</Badge>
        </div>
        <h1 className="text-2xl font-black tracking-tight">{delivery.sales_transactions?.invoice_number || 'OUTBOUND'}</h1>
        <p className="text-sm text-blue-100 opacity-80 mt-1">Lakukan pengiriman ke alamat tujuan di bawah ini.</p>
      </div>

      <div className="p-4 space-y-4">
        <Card className="rounded-[30px] border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <User className="w-4 h-4 text-blue-600" /> Informasi Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Penerima</p>
              <p className="text-lg font-black text-slate-900">{delivery.customers?.name || 'Manual'}</p>
            </div>
            
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Alamat Lengkap</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {delivery.shipping_address || delivery.customers?.address || '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl h-14 border-slate-200 text-slate-700 font-bold gap-2"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.shipping_address || delivery.customers?.address)}`, '_blank')}
              >
                <Navigation className="w-4 h-4 text-blue-600" /> Buka Peta
              </Button>
              <Button 
                variant="outline" 
                className="rounded-2xl h-14 border-slate-200 text-slate-700 font-bold gap-2"
                onClick={() => window.open(`tel:${delivery.customers?.phone}`, '_blank')}
                disabled={!delivery.customers?.phone}
              >
                <Phone className="w-4 h-4 text-emerald-600" /> Hubungi
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border-none shadow-xl">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-blue-600" /> Konfirmasi Kedatangan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label 
                htmlFor="photo-upload"
                className="cursor-pointer block"
              >
                {photoPreview ? (
                  <div className="relative w-full h-64 rounded-3xl overflow-hidden border-4 border-white shadow-lg">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold flex items-center gap-2"><Camera className="w-5 h-5" /> Ganti Foto</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-4 hover:bg-slate-200 transition-all">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                      <Camera className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-slate-600">Ambil Foto Bukti</p>
                      <p className="text-xs text-slate-400 mt-1">Klik di sini untuk menggunakan kamera</p>
                    </div>
                  </div>
                )}
              </label>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-md disabled:bg-slate-300 transition-all"
              onClick={handleCompleteDelivery}
              disabled={isSubmitting || !photo}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                'SELESAIKAN PENGIRIMAN'
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Data akan otomatis tersinkron ke Admin Tradixa
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-4 text-center border-t z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <p className="text-xs text-slate-500 font-bold">
          © {moment().format('YYYY')} Powered by <span className="text-blue-600 font-black tracking-tighter">Tradixa ERP</span>
        </p>
      </div>
    </div>
    </div>
  );
}
