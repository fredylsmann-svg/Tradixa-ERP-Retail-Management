import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, FileText, Building2, Package, Lock,
  Truck, UserCircle, Signature, Printer, ClipboardCheck
} from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';
import moment from 'moment';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { exportToPDF } from '@/components/layout/ExportToolbar';

const formatNum = (n) => new Intl.NumberFormat('id-ID').format(n || 0);

export default function PublicGRNSign() {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [store, setStore] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const grnData = await api.entities.GoodsReceipt.get(id);
      if (grnData) {
        setGrn(grnData);
        const storeData = await api.entities.Store.get(grnData.store_id);
        setStore(storeData);
      } else {
        setError('NOT_FOUND');
      }
    } catch {
      setError('FETCH_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async (signatureData) => {
    setIsSubmitting(true);
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 - now.getTimezoneOffset()) * 60000);
    const ts = `${String(wibTime.getDate()).padStart(2, '0')}/${String(wibTime.getMonth() + 1).padStart(2, '0')}/${wibTime.getFullYear()} ${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')} WIB`;

    try {
      const historyEntry = {
        time_wib: ts,
        activity: 'Pengiriman Dikonfirmasi (Driver)',
        detail: `Goods receipt notes ditandatangani secara digital oleh ${grn.driver_name || 'Driver'}`.toUpperCase(),
        type: 'sign'
      };
      await api.entities.GoodsReceipt.update(id, {
        driver_signature: signatureData,
        driver_signed_at: now.toISOString(),
        approval_history: [...(grn.approval_history || []), historyEntry]
      });
      setGrn(prev => ({ ...prev, driver_signature: signatureData }));
      setIsSuccess(true);
    } catch {
      alert('Gagal menyimpan tanda tangan. Coba lagi.');
    }
    setIsSubmitting(false);
  };

  // ---------- LOADING ----------
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  // ---------- ERROR ----------
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Dokumen Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-2 text-sm">Link tidak valid atau dokumen sudah dihapus.</p>
      </Card>
    </div>
  );

  // ---------- SUCCESS ----------
  if (isSuccess) return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800">Tanda Tangan Berhasil!</h2>
          <p className="text-slate-500 font-medium tracking-tight uppercase">GOODS RECEIPT NOTES telah Anda tandatangani secara digital.</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 relative overflow-hidden">
          <img src={grn.driver_signature} alt="Tanda Tangan" className="h-28 object-contain mx-auto dark:invert dark:brightness-150" />
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">SIGNED</div>
        </div>
        <p className="font-bold text-slate-800 text-lg uppercase">{grn.driver_name}</p>
        <p className="text-xs text-slate-400">Ditandatangani pada {moment().format('D/M/YYYY, HH.mm [WIB]')}</p>
        <Button
          onClick={() => {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>GRN ${grn.gr_number}</title>
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
                  ${getDocumentTemplate({
              type: 'GOODS RECEIPT NOTE',
              storeName: store?.store_name || 'TOKO ANDA',
              logoUrl: store?.logo_url,
              brandColor: store?.brand_color || '#2563eb',
              titleColor: store?.title_color || '#0f172a',
              layout: store?.invoice_layout_style || 'Modern',
              data: {
                ...grn,
                no: grn.gr_number,
                date: grn.timestamp_wib?.split(' ')[0],
                items: grn.items || []
              }
            })}
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

            // Create a hidden iframe for non-blocking print
            let iframe = document.getElementById('print-iframe');
            if (!iframe) {
              iframe = document.createElement('iframe');
              iframe.id = 'print-iframe';
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
            }

            iframe.src = url;
            iframe.onload = () => {
              setTimeout(() => {
                URL.revokeObjectURL(url);
              }, 1000);
            };
          }}
          className="w-full bg-blue-700 hover:bg-blue-600 h-12 text-white font-bold"
        >
          <Printer className="w-5 h-5 mr-2" />
          Download / Print GRN
        </Button>
      </Card>
    </div>
  );

  // ---------- MAIN VIEW ----------
  const alreadySigned = !!grn.driver_signature;

  // SLA Performance Logic for UI
  const confirmedDate = grn.confirmed_delivery_date ? new Date(grn.confirmed_delivery_date) : null;
  const arrivalDate = grn.actual_arrival_at ? new Date(grn.actual_arrival_at) : (grn.received_at ? new Date(grn.received_at) : null);

  let deliveryPerformance = 'ON-TIME';
  let perfBadgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';

  if (confirmedDate && arrivalDate) {
    if (arrivalDate > confirmedDate) {
      deliveryPerformance = 'LATE DELIVERY';
      perfBadgeStyle = 'bg-red-100 text-red-700 border-red-200';
    }
  } else if (!arrivalDate) {
    deliveryPerformance = 'PENDING';
    perfBadgeStyle = 'bg-amber-100 text-amber-700 border-amber-200';
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6">

        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 border flex items-center justify-center">
              {store?.logo_url
                ? <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                : <Building2 className="w-7 h-7 text-slate-300" />}
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">GOODS RECEIPT NOTES</p>
              <h1 className="text-xl font-black text-slate-800">{store?.store_name}</h1>
              <p className="text-sm text-slate-500">No: <span className="text-blue-600 font-bold">{grn.gr_number}</span></p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-blue-600 text-white font-black border-none px-4 py-1.5 rounded-xl text-[10px] uppercase shadow-lg shadow-blue-100">
              GOODS RECEIPT NOTES
            </Badge>
            <p className="text-xs text-slate-400">{grn.timestamp_wib}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pengirim */}
          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" /> Informasi Pengirim
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Supir</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{grn.driver_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SLA Status</p>
                  <Badge variant="outline" className={`${perfBadgeStyle} mt-1 font-black text-[10px]`}>
                    {deliveryPerformance}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Confirmed ETA</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{grn.confirmed_delivery_date ? moment.utc(grn.confirmed_delivery_date).format('DD/MM/YYYY HH:mm') : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Actual Arrival</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">{arrivalDate ? moment.utc(arrivalDate).format('DD/MM/YYYY HH:mm') : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">No. SJ Supplier</p>
                <p className="text-sm font-bold text-slate-700 mt-0.5">{grn.surat_jalan || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Penerima */}
          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader className="border-b px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-emerald-500" /> Informasi Penerima
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Perusahaan</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{store?.store_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{store?.address || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Penyimpanan</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{grn.storage_location || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b px-6 py-4 bg-white">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-500" /> Daftar Barang yang Diterima
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-12 text-center pl-6">No.</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Received</TableHead>
                  <TableHead className="text-center">Reject</TableHead>
                  <TableHead className="text-center">B.Order</TableHead>
                  <TableHead className="text-center pr-6">Kondisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grn.items || []).map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell className="text-center text-slate-400 pl-6">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 py-4">
                      {item.product_name}
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku || '-'}</p>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-500">{item.qty_ordered || item.quantity || 0}</TableCell>
                    <TableCell className="text-center font-black text-blue-600">{item.received_qty || 0}</TableCell>
                    <TableCell className="text-center font-bold text-red-500">{item.reject_qty || 0}</TableCell>
                    <TableCell className="text-center font-bold text-amber-500">{item.back_order_qty || 0}</TableCell>
                    <TableCell className="text-center pr-6">
                      <Badge variant="outline" className={item.condition === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                        {item.condition || 'Baik'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

        </Card>

        {/* Notes */}
        {grn.notes && (
          <Card className="border-none shadow-sm rounded-3xl bg-amber-50/50 border border-amber-100">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Catatan Penerimaan:</p>
              <p className="text-sm text-slate-600 italic">"{grn.notes}"</p>
            </CardContent>
          </Card>
        )}

        {/* Signature Section */}
        {alreadySigned ? (
          <Card className="border-none shadow-sm rounded-3xl bg-emerald-50 p-8 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-black text-slate-800">Dokumen Sudah Ditandatangani</h3>
            <p className="text-sm text-slate-500">Tanda tangan digital sudah tersimpan di sistem.</p>
            <div className="bg-white rounded-2xl p-4 border border-dashed border-emerald-200 inline-block mx-auto">
              <img src={grn.driver_signature} alt="TTD" className="h-24 object-contain mx-auto dark:invert dark:brightness-150" />
            </div>
            <Button
              onClick={() => {
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>GRN ${grn.gr_number}</title>
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
                      ${getDocumentTemplate({
                  type: 'DELIVERY ORDER',
                  storeName: store?.store_name || 'TOKO ANDA',
                  logoUrl: store?.logo_url,
                  brandColor: store?.brand_color || '#2563eb',
                  titleColor: store?.title_color || '#0f172a',
                  layout: store?.invoice_layout_style || 'Modern',
                  data: {
                    ...grn,
                    no: grn.gr_number,
                    date: grn.timestamp_wib?.split(' ')[0],
                    items: grn.items || []
                  }
                })}
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

                // Create a hidden iframe for non-blocking print
                let iframe = document.getElementById('print-iframe');
                if (!iframe) {
                  iframe = document.createElement('iframe');
                  iframe.id = 'print-iframe';
                  iframe.style.display = 'none';
                  document.body.appendChild(iframe);
                }

                iframe.src = url;
                iframe.onload = () => {
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                  }, 1000);
                };
              }}
              className="w-full bg-blue-700 hover:bg-blue-600 h-12 text-white font-bold"
            >
              <Printer className="w-5 h-5 mr-2" />
              Download / Print GRN
            </Button>
          </Card>
        ) : (
          <Card className="border-none shadow-xl rounded-3xl bg-white p-8 overflow-hidden relative">
            <div className="max-w-md mx-auto space-y-6 text-center">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Konfirmasi Penerimaan Barang</h2>
                <p className="text-sm text-slate-500 mt-2">Dengan menandatangani di bawah ini, Anda menyatakan bahwa barang di atas telah diserahterimakan sesuai dengan rincian GRN ini.</p>
              </div>
              <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100">
                <SignaturePad
                  onSave={handleSign}
                  title={`Tanda Tangan Pengirim (${grn.driver_name || 'Driver'})`}
                />
              </div>
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-50/50 rounded-2xl">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Secure Digital Signature</span>
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center py-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} {store?.store_name} • TRADIXA ERP
          </p>
        </footer>
      </div>

      {/* Hidden Print Template */}
      <div id="print-grn-driver" className="hidden">
        {grn && (
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
                  ...grn,
                  no: grn.gr_number,
                  date: grn.timestamp_wib?.split(' ')[0],
                  items: grn.items || []
                }
              })
            }}
          />
        )}
      </div>
    </div>
  );
}
