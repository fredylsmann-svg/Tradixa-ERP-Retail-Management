import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LowStockNotification({ store }) {
  const { toast } = useToast();
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);

  useEffect(() => {
    if (store?.id) loadLowStock();
  }, [store]);

  const loadLowStock = async () => {
    const products = await api.entities.Product.filter({ store_id: store.id });
    const lowStock = products.filter(p => p.stock <= p.reorder_level && p.stock > 0);
    setLowStockProducts(lowStock);
  };

  const visibleProducts = lowStockProducts.filter(p => !dismissed.includes(p.id));

  const handleDismiss = (productId) => {
    setDismissed([...dismissed, productId]);
  };

  // === FORMAT NOMOR WA ===
  const formatWANumber = (num) => {
    if (!num) return '';
    let clean = num.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.substring(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    return clean;
  };

  // === BUILD PRODUCT LIST TEXT ===
  const buildProductList = (format = 'text') => {
    if (format === 'html') {
      return visibleProducts.map(p =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${p.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px">${p.sku}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#f59e0b;font-weight:700;text-align:center">${p.stock}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${p.reorder_level}</td>
        </tr>`
      ).join('');
    }
    return visibleProducts.map(p =>
      `• *${p.name}* (${p.sku})\n  Stok: ${p.stock} | Reorder: ${p.reorder_level}`
    ).join('\n\n');
  };

  // === KIRIM EMAIL VIA RESEND ===
  const sendEmailNotification = async () => {
    setIsSendingEmail(true);
    try {
      const user = await api.auth.me();
      const storeName = store?.store_name || 'Tradixa Store';

      const emailHtml = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;border-radius:12px 12px 0 0">
            <h1 style="margin:0;color:#fff;font-size:22px">⚠️ Notifikasi Stok Rendah</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${storeName}</p>
          </div>
          <div style="padding:24px 32px">
            <p style="color:#334155;font-size:14px;line-height:1.6">
              Halo <strong>${user.full_name || 'Admin'}</strong>,<br/>
              Berikut adalah produk yang stoknya sudah mencapai batas minimum dan perlu segera dipesan ulang:
            </p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;color:#334155">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid #e2e8f0">Produk</th>
                  <th style="padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid #e2e8f0">SKU</th>
                  <th style="padding:10px 12px;text-align:center;font-weight:700;border-bottom:2px solid #e2e8f0">Stok</th>
                  <th style="padding:10px 12px;text-align:center;font-weight:700;border-bottom:2px solid #e2e8f0">Min.</th>
                </tr>
              </thead>
              <tbody>
                ${buildProductList('html')}
              </tbody>
            </table>
            <p style="color:#64748b;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
              Dikirim otomatis oleh sistem ${storeName} pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}.
            </p>
          </div>
        </div>
      `;

      const { data, error: functionError } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: `⚠️ Notifikasi Stok Rendah - ${storeName}`,
          from: `${storeName} <admin@mail.tradixasystems.com>`,
          html: emailHtml
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Edge Function error');
      }

      toast({
        title: "✅ Email Terkirim!",
        description: `Notifikasi stok rendah dikirim ke ${user.email}`,
      });
    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: "Gagal Mengirim Email",
        description: error.message || "Terjadi kesalahan saat mengirim email.",
        variant: "destructive",
      });
    }
    setIsSendingEmail(false);
  };

  // === KIRIM WHATSAPP ===
  const sendWhatsAppNotification = () => {
    setIsSendingWA(true);
    try {
      // Ambil nomor dari store.phone atau store.store_phone
      const phone = store?.phone || store?.store_phone || '';
      if (!phone) {
        toast({
          title: "Nomor WA Belum Tersedia",
          description: "Silakan isi nomor WhatsApp di Profil & Akun terlebih dahulu.",
          variant: "destructive",
        });
        setIsSendingWA(false);
        return;
      }

      const formattedPhone = formatWANumber(phone);
      const storeName = store?.store_name || 'Toko';
      const date = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

      const message = `⚠️ *NOTIFIKASI STOK RENDAH*\n${storeName} — ${date}\n\n${buildProductList('text')}\n\n📦 Mohon segera lakukan pemesanan ulang.\n_Dikirim otomatis oleh sistem Tradixa._`;

      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      toast({
        title: "✅ WhatsApp Dibuka",
        description: "Pesan notifikasi stok rendah siap dikirim via WhatsApp.",
      });
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Tidak dapat membuka WhatsApp.",
        variant: "destructive",
      });
    }
    setIsSendingWA(false);
  };

  if (visibleProducts.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            Notifikasi Stok Rendah ({visibleProducts.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={sendWhatsAppNotification}
              disabled={isSendingWA}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-100"
            >
              {isSendingWA ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <MessageCircle className="w-3 h-3 mr-2" />}
              {isSendingWA ? 'Membuka...' : 'Kirim WA'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={sendEmailNotification}
              disabled={isSendingEmail}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              {isSendingEmail ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Mail className="w-3 h-3 mr-2" />}
              {isSendingEmail ? 'Mengirim...' : 'Kirim Email'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleProducts.map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">{product.name}</p>
                  <Badge variant="outline" className="text-xs">
                    SKU: {product.sku}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-amber-600 font-medium">
                    Stok Saat Ini: {product.stock}
                  </p>
                  <p className="text-xs text-slate-500">
                    Reorder Level: {product.reorder_level}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDismiss(product.id)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
