import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ImageIcon, ExternalLink, AlertCircle, Maximize2, Camera, Plus, Download, Printer, Lock, Phone } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const printStyles = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; margin: 0 !important; }
    .container { max-width: 100% !important; padding: 0 !important; }
    .shadow-xl, .shadow-lg, .shadow-sm { box-shadow: none !important; }
    .rounded-3xl, .rounded-2xl { border-radius: 8px !important; }
    table { width: 100% !important; border-collapse: collapse !important; }
    th, td { border: 1px solid #e2e8f0 !important; padding: 8px !important; }
    .bg-blue-600, .bg-blue-500, .bg-emerald-600 { background: #f8fafc !important; color: black !important; border: 1px solid #e2e8f0 !important; }
    .text-white { color: black !important; }
    input, textarea { border: none !important; background: transparent !important; color: black !important; padding: 0 !important; }
  }
  .print-only { display: none; }
`;

export default function PublicReturnReview() {
  const { id } = useParams();
  const [returnData, setReturnData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [compensationType, setCompensationType] = useState('Refund');
  const [refundProof, setRefundProof] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [replacementItems, setReplacementItems] = useState([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isWarningAccepted, setIsWarningAccepted] = useState(false);
  
  const [isVerified, setIsVerified] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [verificationError, setVerificationError] = useState(false);

  useEffect(() => {
    loadReturn();
  }, [id]);

  const loadReturn = async () => {
    try {
      const data = await api.entities.SupplierReturn.get(id);
      setReturnData(data);
      setRefundAmount(data.total_value || 0);
      setReplacementItems(data.items?.map(it => ({ ...it, replacement_qty: it.quantity })) || []);
      
      if (data.supplier_id) {
        const supplier = await api.entities.Supplier.get(data.supplier_id);
        if (supplier) setSupplierPhone(supplier.phone || "");
      }

      if (data.store_id) {
        const banks = await api.entities.BankAccount.filter({ store_id: data.store_id });
        setBankAccounts(banks);
      }
    } catch (error) {
      console.error('Error loading return:', error);
      toast({ title: "Gagal memuat data", description: "Data retur tidak ditemukan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setRefundProof(reader.result);
      setIsUploadingProof(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAction = async (status) => {
    if (status === 'Rejected' && !rejectReason) {
      toast({ title: "Alasan Wajib Diisi", description: "Harap berikan alasan penolakan.", variant: "destructive" });
      return;
    }

    if (status === 'Approved') {
      if (compensationType === 'Refund') {
        if (!refundProof) {
          toast({ title: "Bukti Transfer Wajib", description: "Harap unggah bukti transfer untuk metode Refund.", variant: "destructive" });
          return;
        }
        if (refundAmount <= 0) {
          toast({ title: "Nominal Wajib Diisi", description: "Harap masukkan jumlah dana yang Anda transfer.", variant: "destructive" });
          return;
        }
      }

      if (compensationType === 'Replacement') {
        const hasLowerQty = replacementItems.some(it => it.replacement_qty < it.quantity);
        if (hasLowerQty && !isWarningAccepted) {
          setIsWarningAccepted(true);
          toast({ 
            title: "Peringatan Jumlah", 
            description: "Beberapa barang memiliki jumlah pengganti di bawah pengajuan toko. Apakah Anda tetap ingin melanjutkan?",
            variant: "warning" 
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      let note = "";
      
      if (status === 'Rejected') {
        note = rejectReason;
      } else {
        if (compensationType === 'Refund') {
          note = `Retur disetujui (Refund: Rp ${refundAmount.toLocaleString('id-ID')}). Bukti transfer telah dilampirkan.`;
        } else {
          const qtyChanges = replacementItems
            .filter(it => it.replacement_qty !== it.quantity)
            .map(it => `${it.product_name}: ${it.replacement_qty}/${it.quantity}`)
            .join(', ');
          note = `Retur disetujui (Ganti Barang).${qtyChanges ? ' Perubahan Qty: ' + qtyChanges : ''}`;
        }
      }

      const newLogEntry = {
        action: status,
        note: note,
        timestamp: timestamp,
        actor: 'Supplier (Public View)'
      };

      const updatedLogs = [...(returnData.activity_log || []), newLogEntry];

      await api.entities.SupplierReturn.update(id, {
        status: status,
        compensation_type: status === 'Approved' ? compensationType : null,
        refund_proof_url: status === 'Approved' && compensationType === 'Refund' ? refundProof : null,
        final_refund_amount: status === 'Approved' && compensationType === 'Refund' ? Number(refundAmount) : null,
        replacement_items: status === 'Approved' && compensationType === 'Replacement' ? replacementItems : null,
        activity_log: updatedLogs
      });

      toast({ title: "Berhasil!", description: `Retur telah di-${status === 'Approved' ? 'setujui' : 'tolak'}.` });
      loadReturn();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: "Gagal!", description: "Terjadi kesalahan saat memproses permintaan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setShowRejectForm(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerify = () => {
    const cleanInput = phoneInput.replace(/[^0-9]/g, '');
    const cleanStored = supplierPhone.replace(/[^0-9]/g, '');
    if (cleanInput.length >= 8 && cleanStored.endsWith(cleanInput.slice(-8))) {
      setIsVerified(true);
      setVerificationError(false);
    } else {
      setVerificationError(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full text-center p-8">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Tautan Tidak Valid</h2>
          <p className="text-slate-500 mt-2">Data retur tidak ditemukan atau tautan sudah kadaluarsa.</p>
        </Card>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-6 font-sans">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500 rounded-full blur-[120px]" />
        </div>
        
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[40px] overflow-hidden relative z-10">
          <div className="bg-amber-600 p-8 text-center text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-amber-700 to-transparent opacity-50" />
             <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 rotate-6 shadow-xl">
               <Lock className="w-10 h-10" />
             </div>
             <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Verifikasi Retur</h2>
             <p className="text-amber-100 text-sm font-medium">Harap verifikasi nomor WhatsApp Anda untuk memproses retur ini.</p>
          </div>
          
          <CardContent className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Nomor WhatsApp Supplier
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-amber-500 transition-colors" />
                  <Input 
                    type="tel" 
                    placeholder="Contoh: 081234567XXX" 
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (verificationError) setVerificationError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="h-14 pl-12 bg-slate-50 border-slate-200 rounded-2xl focus:ring-amber-500 focus:border-amber-500 font-bold tracking-wider text-lg"
                  />
                </div>
              </div>
              
              {verificationError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xs text-red-600 font-bold leading-tight">
                    Akses ditolak. Nomor WhatsApp tidak sesuai dengan data supplier kami.
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleVerify}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95"
            >
              <span className="flex items-center justify-center gap-3">
                BUKA REVIEW RETUR
                <CheckCircle2 className="w-6 h-6 text-amber-400" />
              </span>
            </Button>
            
            <p className="text-[10px] text-center text-slate-400 font-medium">
              Sistem Keamanan Tradixa • Verifikasi Supplier Berlapis
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 container">
      <style>{printStyles}</style>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Review Pengembalian Barang</h1>
            <p className="text-sm font-medium text-slate-500">No. Retur: <span className="text-slate-900 font-bold">{returnData.return_number}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="no-print rounded-2xl font-bold bg-white border-slate-200"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Download / Cetak PDF
            </Button>
            <Badge className={`px-4 py-1.5 rounded-full text-sm font-bold ${
              returnData.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
              returnData.status === 'Rejected' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {returnData.status || 'Pending Review'}
            </Badge>
          </div>
        </div>

        <Card className="rounded-3xl border-none shadow-xl shadow-blue-100/50 overflow-hidden">
          <CardHeader className="bg-white border-b p-6">
            <CardTitle className="text-lg font-bold text-slate-800">Informasi Retur</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</label>
                  <p className="font-bold text-slate-800 text-lg">{returnData.supplier_name}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Pengajuan</label>
                  <p className="font-medium text-slate-600">{returnData.timestamp_wib}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Dari Pembeli</label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-1">
                  <p className="text-sm text-slate-600 italic">"{returnData.notes || 'Tidak ada catatan tambahan'}"</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Barang & Bukti Foto</label>
              <div className="border rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-4">Nama Produk</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Harga Satuan</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead className="text-center pr-4">Foto Bukti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replacementItems.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30">
                        <TableCell className="font-bold text-slate-800 pl-4">
                           <div className="flex flex-col">
                             <span>{item.product_name}</span>
                             <span className="text-[9px] text-slate-400 font-bold uppercase">SKU: {item.sku || '-'}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-700">
                           {item.quantity}
                        </TableCell>
                        <TableCell className="font-bold text-slate-600 text-[11px]">
                           Rp {item.unit_price?.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="font-black text-slate-800 text-[11px]">
                           Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">
                            {item.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-4">
                           {item.photo_url ? (
                             <div 
                               className="relative w-10 h-10 mx-auto rounded-lg border overflow-hidden cursor-pointer group hover:border-blue-400 transition-all shadow-sm"
                               onClick={() => setSelectedPhoto({ url: item.photo_url, name: item.product_name })}
                             >
                               <img src={item.photo_url} alt="Evidence" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center no-print">
                                 <Maximize2 className="w-4 h-4 text-white" />
                               </div>
                             </div>
                           ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50">
                      <TableCell colSpan={3} className="text-right font-bold text-slate-500 uppercase tracking-widest text-[10px] pl-4">Total Estimasi Nilai Retur</TableCell>
                      <TableCell className="font-black text-blue-600 text-sm">
                         Rp {returnData.total_value?.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
              <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
                <DialogHeader className="p-4 bg-white/10 backdrop-blur-md absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between border-b border-white/10">
                   <DialogTitle className="text-white text-sm font-bold">{selectedPhoto?.name}</DialogTitle>
                </DialogHeader>
                <div className="pt-14 pb-4 flex items-center justify-center min-h-[50vh]">
                  <img 
                    src={selectedPhoto?.url} 
                    alt="Full Evidence" 
                    className="max-w-full max-h-[80vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
                  />
                </div>
              </DialogContent>
            </Dialog>

            {(returnData.status === 'Pending' || !returnData.status) && (
              <div className="pt-6 border-t space-y-8 no-print">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Metode Kompensasi</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${compensationType === 'Refund' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      onClick={() => setCompensationType('Refund')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${compensationType === 'Refund' ? 'border-blue-500' : 'border-slate-300'}`}>
                          {compensationType === 'Refund' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Transfer Uang (Refund)</p>
                          <p className="text-[10px] text-slate-500">Kembalikan dana ke rekening pembeli.</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${compensationType === 'Replacement' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      onClick={() => setCompensationType('Replacement')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${compensationType === 'Replacement' ? 'border-blue-500' : 'border-slate-300'}`}>
                          {compensationType === 'Replacement' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Ganti Barang Baru</p>
                          <p className="text-[10px] text-slate-500">Kirim produk yang sama sebagai pengganti.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {compensationType === 'Replacement' && (
                  <div className="space-y-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Daftar Barang Pengganti</h4>
                        <p className="text-[10px] text-slate-500 font-bold">Input jumlah barang yang akan Anda kirim sebagai pengganti ke pembeli</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-blue-50/50">
                          <TableRow>
                            <TableHead className="pl-4">Produk</TableHead>
                            <TableHead className="text-center">Qty Toko</TableHead>
                            <TableHead className="text-center">Qty Pengganti</TableHead>
                            <TableHead className="text-right pr-4">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {replacementItems.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-blue-50/10">
                              <TableCell className="font-bold text-slate-800 text-xs pl-4">
                                {item.product_name}
                              </TableCell>
                              <TableCell className="text-center font-black text-slate-400 text-xs">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Input 
                                    type="number" 
                                    className={`w-20 h-9 text-center font-black rounded-xl border-2 transition-all ${item.replacement_qty < item.quantity ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' : 'border-blue-200 focus:ring-blue-200'}`}
                                    value={item.replacement_qty}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setReplacementItems(prev => prev.map((it, i) => i === idx ? { ...it, replacement_qty: val } : it));
                                      setIsWarningAccepted(false);
                                    }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                {item.replacement_qty < item.quantity ? (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black">
                                    DI BAWAH QTY
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-black">
                                    SESUAI
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {compensationType === 'Refund' && (
                  <div className="p-6 bg-blue-600 rounded-2xl text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg">Detail Rekening Pembeli</h4>
                      <Badge className="bg-blue-500/20 text-blue-300 border-none">Tujuan Refund</Badge>
                    </div>
                    
                    {(() => {
                      const bank = bankAccounts.find(b => b.id === returnData.bank_account_id) || bankAccounts[0];
                      if (!bank) return <p className="text-slate-400 italic text-sm">Informasi rekening tidak tersedia.</p>;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Bank</label>
                              <p className="text-xl font-black">{bank.bank_name}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">No. Rekening</label>
                              <p className="text-2xl font-mono font-black tracking-tighter text-blue-400">{bank.account_number}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Atas Nama</label>
                              <p className="font-bold text-lg">{bank.account_name}</p>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                               <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 block">Nominal Yang Ditransfer (Rp) *</label>
                               <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-200">Rp</span>
                                  <Input 
                                    type="text"
                                    className="bg-white/10 border-white/20 text-white font-black text-xl pl-12 h-14 rounded-2xl focus:ring-blue-500"
                                    value={Number(refundAmount).toLocaleString('id-ID')}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/\./g, '');
                                      if (!isNaN(raw)) setRefundAmount(raw);
                                    }}
                                  />
                               </div>
                               <p className="text-[10px] text-slate-400 mt-2 italic">Estimasi tagihan pembeli: Rp {returnData.total_value?.toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Upload Bukti Transfer *</label>
                            <input type="file" accept="image/*" className="hidden" id="proof-upload" onChange={handleProofUpload} />
                            <div 
                              className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${refundProof ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}
                              onClick={() => document.getElementById('proof-upload').click()}
                            >
                              {isUploadingProof ? (
                                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                              ) : refundProof ? (
                                <div className="relative w-full h-full p-2">
                                  <img src={refundProof} className="w-full h-full object-contain rounded-2xl" alt="Proof" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                    <p className="text-xs font-bold">Ganti Foto</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Camera className="w-8 h-8 text-white/40 mb-2" />
                                  <p className="text-xs font-bold text-white/60">Klik untuk upload bukti</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {!showRejectForm ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-14 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Tolak Retur
                    </Button>
                    <Button 
                      className={`h-14 rounded-2xl text-white font-black shadow-lg transition-all ${isWarningAccepted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      onClick={() => handleAction('Approved')}
                      disabled={isSubmitting || isUploadingProof}
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : isWarningAccepted ? <AlertCircle className="w-5 h-5 mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      {isWarningAccepted ? 'Tetap Lanjutkan & Setujui' : 'Setujui & Selesaikan'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-6 bg-red-50 rounded-3xl border border-red-100 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 text-red-700 mb-1">
                      <AlertCircle className="w-5 h-5" />
                      <h4 className="font-bold">Konfirmasi Penolakan</h4>
                    </div>
                    <Textarea 
                      placeholder="Tuliskan alasan mengapa Anda menolak pengajuan retur ini..."
                      className="bg-white border-red-200 focus:ring-red-200 min-h-[100px] rounded-2xl"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setShowRejectForm(false)} className="text-slate-500 font-bold">Batal</Button>
                      <Button 
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 rounded-xl"
                        onClick={() => handleAction('Rejected')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Konfirmasi Tolak
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {returnData.status && returnData.status !== 'Pending' && (
              <div className="pt-8 border-t space-y-6">
                <div className={`p-6 rounded-2xl border-2 ${
                  returnData.status === 'Approved' ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      returnData.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {returnData.status === 'Approved' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 uppercase tracking-tighter">
                        Retur ini telah {returnData.status === 'Approved' ? 'Disetujui' : 'Ditolak'}
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        {returnData.status === 'Approved' 
                          ? `Kompensasi: ${returnData.compensation_type === 'Refund' ? 'Transfer Dana (Refund)' : 'Penggantian Barang Baru'}`
                          : 'Supplier telah menolak pengajuan retur ini.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {returnData.status === 'Approved' && returnData.compensation_type === 'Refund' && returnData.refund_proof_url && (
                  <div className="p-6 bg-blue-600 rounded-3xl text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <h4 className="font-black uppercase text-[10px] tracking-widest text-blue-400">Bukti Transfer</h4>
                      <p className="text-lg font-black">Rp {returnData.final_refund_amount?.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="relative aspect-video max-h-[300px] rounded-2xl border border-white/10 overflow-hidden group cursor-pointer mx-auto" onClick={() => setSelectedPhoto({ url: returnData.refund_proof_url, name: "Bukti Transfer" })}>
                      <img src={returnData.refund_proof_url} className="w-full h-full object-contain" alt="Refund Proof" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center no-print">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {returnData.status === 'Approved' && returnData.compensation_type === 'Replacement' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Barang Pengganti</label>
                    <div className="border rounded-2xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="pl-4">Nama Produk</TableHead>
                            <TableHead className="text-center">Qty Dikirim</TableHead>
                            <TableHead className="text-right pr-4">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(returnData.replacement_items || []).map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-bold text-slate-800 text-xs pl-4">{item.product_name}</TableCell>
                              <TableCell className="text-center font-black text-slate-900">{item.replacement_qty}</TableCell>
                              <TableCell className="text-right pr-4">
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">SIAP KIRIM</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {returnData.activity_log?.length > 0 && (
          <Card className="rounded-3xl border-none overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-6 border-b">
              <CardTitle className="text-base font-bold text-slate-800">Riwayat Aktivitas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {returnData.activity_log.map((log, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      log.action === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 
                      log.action === 'Rejected' ? 'bg-red-100 text-red-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {log.action === 'Approved' ? <CheckCircle2 className="w-5 h-5" /> : 
                       log.action === 'Rejected' ? <XCircle className="w-5 h-5" /> : 
                       <Plus className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-800">
                          {log.action === 'Approved' ? 'Retur Disetujui' : 
                           log.action === 'Rejected' ? 'Retur Ditolak' : 
                           'Pengajuan Dibuat'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{log.note}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Oleh: {log.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
