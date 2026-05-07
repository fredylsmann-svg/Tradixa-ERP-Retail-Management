import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Printer,
  Truck,
  Package,
  Building2,
  UserCircle,
  ClipboardCheck,
  Loader2,
  Calendar,
  FileText,
  MapPin,
  Warehouse
} from 'lucide-react';
import moment from 'moment';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { exportToPDF } from '@/components/layout/ExportToolbar';

export default function InventoryGRNDetail({ store }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const igrnId = queryParams.get('id');

  const [igrn, setIgrn] = useState(null);
  const [poData, setPoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (igrnId) {
      loadIgrnDetail();
    }
  }, [igrnId]);

  const loadIgrnDetail = async () => {
    setIsLoading(true);
    try {
      const data = await api.entities.InventoryGRN.filter({ id: igrnId });
      if (data.length > 0) {
        const grn = data[0];
        setIgrn(grn);

        // Fetch original PO data for printing
        if (grn.po_number) {
          const pos = await api.entities.PurchaseOrder.filter({ po_number: grn.po_number });
          if (pos.length > 0) {
            setPoData(pos[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load IGRN detail", err);
    }
    setIsLoading(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500 italic">Memuat Detail Inventory GRN...</p>
        </div>
      </div>
    );
  }

  if (!igrn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <Package className="w-16 h-16 text-slate-200" />
        <h2 className="text-xl font-bold text-slate-800">Data Tidak Ditemukan</h2>
        <Button onClick={() => navigate('/InventoryGRN')} variant="outline" className="rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-0 md:p-6 space-y-8 pb-20 print:pb-0 print:pt-4">
      {/* Print Only Header (Optional, for more professional look) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Inventory Goods Receipt Note</h1>
            <p className="text-slate-500 font-bold tracking-widest">{store.name}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm font-medium">{store.address}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900">{igrn.igrn_number}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Document Original Copy</p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/InventoryGRN')}
            className="rounded-full bg-white border border-slate-200 shadow-sm hover:scale-110 transition-all font-bold"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{igrn.igrn_number}</h1>
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3">
                {igrn.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2 font-medium">
              <Calendar className="w-3.5 h-3.5" /> {igrn.timestamp_wib}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {poData && (
            <Button
              variant="outline"
              className="rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm font-bold flex items-center gap-2"
              onClick={() => {
                const content = document.getElementById('print-igrn-detail').innerHTML;
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Inventory GRN ${igrn.igrn_number}</title>
                      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                      <style>
                        body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'Inter', sans-serif; }
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
                if (w) {
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                } else {
                  alert("Popup diblokir! Izinkan popup untuk mencetak.");
                }
              }}
            >
              <FileText className="w-4 h-4" /> Print Inventory GRN
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 bg-white shadow-sm font-bold flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" /> Cetak GRN
          </Button>
        </div>
      </div>

      {/* Main Content Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden print:border print:border-slate-100 print:shadow-none">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Informasi Pengadaan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier</p>
                <p className="font-black text-slate-800 text-lg">
                  {igrn.supplier_name || igrn.shipped_by || 'Unknown Supplier'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reference PO</p>
                <p className="font-bold text-blue-600 hover:underline cursor-pointer">{igrn.po_number}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">No. Surat Jalan</p>
                <p className="font-semibold text-slate-700">{igrn.surat_jalan || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Journal ID</p>
                <p className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded w-fit">{igrn.journal_id || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden print:border print:border-slate-100 print:shadow-none">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Lokasi & Petugas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Storage Location</p>
                <p className="font-black text-emerald-600 flex items-center gap-2">
                  <Warehouse className="w-4 h-4" /> {igrn.storage_location || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diverifikasi Oleh</p>
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-slate-400" /> {igrn.signatures?.received_by || 'Administrator'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan</p>
                <p className="text-sm text-slate-600 italic leading-relaxed">
                  "{igrn.notes || 'Tidak ada catatan tambahan untuk penerimaan ini.'}"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden print:border print:border-slate-100 print:shadow-none">
        <CardHeader className="bg-white border-b py-5">
          <CardTitle className="text-sm font-black text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-500" /> Daftar Item Diterima
            </div>
            <span className="text-xs font-bold text-slate-400">{igrn.items?.length || 0} Barang</span>
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-8 py-4">Nama Produk</TableHead>
              <TableHead className="text-center">Batch No.</TableHead>
              <TableHead className="text-center">MFG Date</TableHead>
              <TableHead className="text-center">Expiry</TableHead>
              <TableHead className="text-center">Jumlah</TableHead>
              <TableHead className="text-center">Reject</TableHead>
              <TableHead className="text-center">Unit</TableHead>
              <TableHead className="text-center pr-8">Kondisi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {igrn.items?.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                <TableCell className="pl-8 py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900">{item.product_name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                      <span>SKU: {item.sku || '-'}</span>
                      <span className="text-slate-200">|</span>
                      <span>PID: {item.product_id?.substring(0, 8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.tracking_type === 'Batch' && item.batches?.length > 0 ? (
                    <div className="space-y-1">
                      {item.batches.map((b, i) => (
                        <div key={i} className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit mx-auto">
                          {b.batch_number}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {item.tracking_type === 'Batch' && item.batches?.length > 0 ? (
                    <div className="space-y-1">
                      {item.batches.map((b, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit mx-auto">
                          {b.manufacture_date ? moment(b.manufacture_date).format('DD/MM/YYYY') : '-'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {item.tracking_type === 'Batch' && item.batches?.length > 0 ? (
                    <div className="space-y-1">
                      {item.batches.map((b, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit mx-auto">
                          {b.expiry_date ? moment(b.expiry_date).format('DD/MM/YYYY') : '-'}
                        </div>
                      ))}
                    </div>
                  ) : item.expired_date ? (
                    <span className="text-[10px] font-bold text-slate-600">{moment(item.expired_date).format('DD/MM/YYYY')}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-black text-slate-900 text-lg">{item.warehouse_qty || item.quantity || 0}</TableCell>
                <TableCell className="text-center font-black text-red-500 text-lg">{item.reject_qty || 0}</TableCell>
                <TableCell className="text-center font-bold text-slate-500">{item.unit || item.uom || 'pcs'}</TableCell>
                <TableCell className="text-center pr-8">
                  <Badge variant="outline" className={`font-black tracking-tight ${item.condition === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {item.condition}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-8 bg-slate-50/30 border-t flex justify-end">
          <div className="text-right space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Nilai Asset</p>
            <p className="text-4xl font-black text-emerald-600 tracking-tighter">
              Rp {formatCurrency(igrn.total_amount || 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Signature Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 print:gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 border border-slate-100 print:shadow-none print:p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dikirim Oleh</p>
          <div className="h-28 flex items-center justify-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
            {igrn.signatures?.shipped ? <img src={igrn.signatures.shipped} alt="Shipper" className="h-full object-contain dark:invert dark:brightness-150" /> : <div className="h-full border-2 border-dashed border-slate-100 rounded-2xl w-40" />}
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 uppercase">{igrn.shipped_by || 'Driver'}</p>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest">( DRIVER / PENGIRIM )</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 border-2 border-emerald-50 relative overflow-hidden print:shadow-none print:p-4 print:border">
          <Badge className="absolute -top-1 -right-1 bg-emerald-600 rounded-bl-xl rounded-tr-none px-4 py-1 text-[10px] font-black print:hidden">PETUGAS GUDANG</Badge>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diterima Oleh</p>
          <div className="h-28 flex items-center justify-center">
            {igrn.signatures?.received ? <img src={igrn.signatures.received} alt="Admin" className="h-full object-contain dark:invert dark:brightness-150" /> : <div className="h-full border-2 border-dashed border-slate-100 rounded-2xl w-40" />}
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 uppercase">{igrn.received_by || 'Administrator'}</p>
            <p className="text-[10px] text-emerald-600 font-black tracking-widest">DIGITALLY VERIFIED</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 border border-slate-100 print:shadow-none print:p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disetujui Oleh</p>
          <div className="h-28 flex items-center justify-center grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
            {igrn.signatures?.approved ? <img src={igrn.signatures.approved} alt="Manager" className="h-full object-contain dark:invert dark:brightness-150" /> : <div className="h-full border-2 border-dashed border-slate-100 rounded-2xl w-40" />}
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 uppercase">{igrn.approved_by || 'Warehouse Manager'}</p>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest">( APPROVAL STATUS )</p>
          </div>
        </div>
      </div>

      {/* Hidden Print Template for professional GRN */}
      <div id="print-igrn-detail" className="hidden">
        {igrn && (
          <div
            dangerouslySetInnerHTML={{
              __html: getDocumentTemplate({
                type: 'INVENTORY GRN',
                storeName: store?.store_name || 'TOKO ANDA',
                logoUrl: store?.logo_url,
                brandColor: store?.brand_color || '#2563eb',
                titleColor: store?.title_color || '#0f172a',
                signatureUrl: store?.signature_url,
                ownerName: store?.owner_name,
                ownerPosition: store?.owner_position,
                data: {
                  ...igrn,
                  no: igrn.igrn_number,
                  po_number: poData?.po_number,
                  supplier_name: poData?.supplier_name,
                  store_address: store?.address,
                  shipped_signature: igrn.signatures?.shipped,
                  received_signature: igrn.signatures?.received,
                  approved_signature: igrn.signatures?.approved,
                  admin_name: igrn.received_by,
                  total: igrn.total_amount || igrn.items?.reduce((acc, item) => acc + (Number(item.total_value || item.subtotal || (Number(item.warehouse_qty || 0) * Number(item.unit_price || item.price || 0)))), 0)
                }
              })
            }}
          />
        )}
      </div>
    </div>
  );
}
