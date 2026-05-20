import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Eye, Printer, FileInput } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PrintInvoice from '@/components/invoice/PrintInvoice';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import moment from 'moment';

export default function PayableInvoices({ store }) {
  const [payables, setPayables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedProofUrl, setSelectedProofUrl] = useState(null);
  const { selectedDate } = useGlobalDate();

  useEffect(() => {
    if (viewingInvoice?.id) {
      api.entities.InvoicePayment.filter({ invoice_id: viewingInvoice.id }).then(res => setPaymentHistory(res));
    } else {
      setPaymentHistory([]);
    }
  }, [viewingInvoice]);

  useEffect(() => {
    if (store?.id) loadPayables();
  }, [store]);

  const loadPayables = async () => {
    const data = await api.entities.Payable.filter({ store_id: store.id }, '-created_date');
    setPayables(data);
    setIsLoading(false);
  };

  const filteredPayables = payables.filter(p => {
    const matchesSearch = p.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGlobalDate = matchesDate(p, selectedDate);
    return matchesSearch && matchesGlobalDate;
  });

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const getStatusBadge = (status) => {
    const styles = { 
      Pending: 'bg-amber-100 text-amber-700', 
      Partial: 'bg-blue-600 text-white font-bold', 
      Paid: 'bg-emerald-100 text-emerald-700', 
      Overdue: 'bg-red-100 text-red-700' 
    };
    return <Badge className={styles[status] || 'bg-slate-100'} variant="outline">{status}</Badge>;
  };

  const handlePrint = () => {
    setPrintingInvoice(viewingInvoice);
  };

  const handleShareWhatsApp = (invoice) => {
    const publicLink = `${window.location.origin}/public/invoice/payable/${invoice.id}`;
    const message = `*INVOICE HUTANG - ${store?.store_name}*\n\n` +
      `No. Invoice: ${invoice.invoice_number}\n` +
      `Supplier: ${invoice.supplier_name}\n` +
      `Tanggal: ${invoice.timestamp_wib}\n` +
      `Jatuh Tempo: ${invoice.due_date}\n` +
      `--------------------------\n` +
      `Total Tagihan: Rp ${formatCurrency(invoice.amount)}\n` +
      `Sudah Dibayar: Rp ${formatCurrency(invoice.paid_amount || 0)}\n` +
      `*SISA HUTANG: Rp ${formatCurrency(invoice.remaining_amount)}*\n` +
      `--------------------------\n` +
      `Status: ${invoice.status}\n\n` +
      `Lihat Detail & Cetak Invoice:\n${publicLink}\n\n` +
      `Mohon konfirmasi jika ada ketidaksesuaian data. Terima kasih.`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: auto; margin: 0mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          aside, nav, header, .no-print, [role="dialog"] > button { display: none !important; }
          [role="dialog"] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          #invoice-print-area {
            display: block !important;
            padding: 2cm !important;
            margin: 0 !important;
            background: white !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      
      <PageHeader
        title="Account Payable Invoices"
        subtitle="Daftar invoice hutang usaha kepada supplier"
        icon={FileInput}
        actions={
          <ExportToolbar 
            title="Laporan Hutang Usaha (Payables)" 
            date={moment().format('DD MMMM YYYY')} 
            storeName={store?.store_name} 
            storeAddress={store?.address} 
            storeLogoUrl={store?.logo_url} 
            contentId="print-payables-detailed" 
          
          store={store}
        />
        }
      />
      <PageDatePicker />

      <Card className="rounded-xl border-none shadow-xl shadow-blue-100/50 overflow-hidden" id="print-payables-detailed">
        <CardContent className="pt-6">
          <div className="relative max-w-md mb-6 px-4">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari nomor invoice atau nama supplier..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-11 h-12 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-slate-400 transition-all" 
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-12 text-center pl-8">No.</TableHead>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : filteredPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-slate-400">
                      <FileInput className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="font-bold text-[10px] uppercase tracking-[0.2em]">Tidak ada invoice ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayables.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8 text-center text-xs font-medium text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900">{item.invoice_number}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-500">{item.timestamp_wib}</TableCell>
                      <TableCell className="font-bold text-slate-800">{item.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">Rp {formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right text-red-600 font-black">Rp {formatCurrency(item.remaining_amount)}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">{item.due_date}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center pr-8">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setViewingInvoice(item)}
                          className="hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-4 h-4" />
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

      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none rounded-xl">
          {viewingInvoice && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Toolbar */}
              <div className="no-print p-4 bg-slate-50 dark:bg-slate-800 border-b flex items-center justify-between gap-4 pr-14">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <FileInput className="w-4 h-4" />
                   </div>
                   <p className="text-sm font-bold text-slate-800">Preview Invoice Hutang</p>
                </div>
                <div className="flex items-center gap-2">
                  <PremiumGate feature="Share Invoice Hutang" iconType="action" store={store}>
                    <Button variant="outline" size="sm" onClick={() => handleShareWhatsApp(viewingInvoice)} className="rounded-xl font-bold gap-2">
                      <FileInput className="w-4 h-4 text-emerald-600" />
                      Share Whatsapp
                    </Button>
                  </PremiumGate>
                  <PremiumGate feature="Cetak Invoice Hutang" iconType="action" store={store}>
                    <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold gap-2">
                      <Printer className="w-4 h-4" />
                      Cetak / PDF
                    </Button>
                  </PremiumGate>
                </div>
              </div>

              {/* Invoice Content */}
              <div id="invoice-print-area" className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 bg-white dark:bg-slate-900">
                {/* Header */}
                <div className="flex justify-between items-start gap-8">
                  <div className="space-y-4">
                    {store?.logo_url ? (
                      <img src={store.logo_url} alt="Logo" className="h-16 w-auto object-contain" />
                    ) : (
                       <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-2xl" style={{ backgroundColor: store?.brand_color || '#2563eb' }}>
                        {store?.store_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{store?.store_name}</h2>
                      <p className="text-xs font-bold text-slate-500 max-w-xs leading-relaxed uppercase">{store?.address}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                     <h1 className="text-4xl font-black uppercase tracking-tighter italic opacity-10" style={{ color: store?.title_color || '#0f172a' }}>INVOICE</h1>
                     <p className="text-sm font-black" style={{ color: store?.brand_color || '#0f172a' }}>{viewingInvoice.invoice_number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diterbitkan: {viewingInvoice.timestamp_wib}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 border-y py-8 border-slate-100">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Information</label>
                    <div className="space-y-1">
                      <p className="text-xl font-black text-slate-900">{viewingInvoice.supplier_name}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Verified Business Partner</p>
                    </div>
                  </div>
                  <div className="text-right space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Info</label>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">Due Date: <span className="text-red-600">{viewingInvoice.due_date}</span></p>
                      <div className="flex justify-end">{getStatusBadge(viewingInvoice.status)}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Details in Table Format */}
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Financial Details</label>
                   <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                           <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="p-4 text-left">Description</th>
                              <th className="p-4 text-right">Amount (IDR)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                           <tr>
                              <td className="p-4 text-slate-600 font-bold">Total Bill Amount</td>
                              <td className="p-4 text-right font-black text-slate-900">Rp {formatCurrency(viewingInvoice.amount)}</td>
                           </tr>
                           <tr>
                              <td className="p-4 text-emerald-700 font-bold">Total Amount Settled</td>
                              <td className="p-4 text-right font-black text-emerald-600">- Rp {formatCurrency(viewingInvoice.paid_amount || 0)}</td>
                           </tr>
                           
                           {(() => {
                               const cashBankPayments = paymentHistory.filter(p => p.payment_method !== 'Deposit');
                               const totalCashBank = cashBankPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                               const invoiceAmount = Number(viewingInvoice.amount || 0);
                               const overpayment = Math.max(0, totalCashBank - invoiceAmount);
                               if (overpayment > 0) {
                                 return (
                                   <tr className="bg-amber-50">
                                     <td className="p-4">
                                       <p className="text-sm font-bold text-amber-900">Overpayment (Added to Deposit)</p>
                                       <p className="text-[10px] text-amber-700">Cash/Bank Transfer: Rp {formatCurrency(totalCashBank)}</p>
                                     </td>
                                     <td className="p-4 text-right font-black text-amber-600">+ Rp {formatCurrency(overpayment)}</td>
                                   </tr>
                                 );
                               }
                               return null;
                           })()}

                           <tr className="text-white font-bold" style={{ backgroundColor: store?.brand_color || '#2563eb' }}>
                              <td className="p-5 font-black uppercase text-xs tracking-tight">Total Outstanding Balance</td>
                              <td className="p-5 text-right font-black text-xl italic">Rp {formatCurrency(viewingInvoice.remaining_amount)}</td>
                           </tr>
                        </tbody>
                      </table>
                   </div>
                </div>

                {/* Proof of Payment Section */}
                {(viewingInvoice.payment_proof_url || viewingInvoice.payment_bank_name) && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Payment Info & Proof</label>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metode Pembayaran</p>
                          <p className="text-sm font-black text-slate-900">{viewingInvoice.payment_bank_name || 'Cash / Kas'}</p>
                       </div>
                       {viewingInvoice.payment_proof_url && (
                          <button 
                            onClick={() => setSelectedProofUrl(viewingInvoice.payment_proof_url)} 
                            className="text-xs font-bold text-blue-600 flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors"
                          >
                             <FileInput className="w-4 h-4" />
                             Lihat Bukti Transfer
                          </button>
                       )}
                    </div>
                  </div>
                )}

                {/* Riwayat Pembayaran */}
                {paymentHistory.length > 0 && (() => {
                  const depositPayments = paymentHistory.filter(p => p.payment_method === 'Deposit');
                  const cashBankPayments = paymentHistory.filter(p => p.payment_method !== 'Deposit');
                  
                  return (
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Payment History & Settlement Sources</label>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="py-2">Tanggal</TableHead>
                              <TableHead className="py-2">Sumber Dana</TableHead>
                              <TableHead className="py-2">Referensi</TableHead>
                              <TableHead className="text-right py-2">Nominal</TableHead>
                              <TableHead className="text-right py-2">Struk</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentHistory.map((ph, idx) => (
                              <TableRow key={idx} className={ph.payment_method === 'Deposit' ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}>
                                <TableCell className="text-xs font-semibold py-2">{ph.payment_date}</TableCell>
                                <TableCell className="text-xs py-2">
                                  {ph.payment_method === 'Deposit' ? (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 font-bold">
                                      Saldo Deposit
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-slate-50 font-medium">
                                      {ph.bank_name || ph.payment_method}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 py-2">{ph.reference}</TableCell>
                                <TableCell className={`text-xs font-bold text-right py-2 ${ph.payment_method === 'Deposit' ? 'text-blue-700' : 'text-emerald-600'}`}>
                                  Rp {formatCurrency(ph.amount)}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  {ph.payment_proof_url ? (
                                    <a href={ph.payment_proof_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">Lihat</a>
                                  ) : ph.payment_method === 'Deposit' ? (
                                    <span className="text-[10px] text-blue-400 italic">Auto</span>
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Summary */}
                      {depositPayments.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-blue-900">Dibayar dari Saldo Deposit Supplier</p>
                              <p className="text-[10px] text-blue-600">Potongan otomatis dari kelebihan pembayaran sebelumnya</p>
                            </div>
                            <p className="text-sm font-black text-blue-700">
                              Rp {formatCurrency(depositPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Footer Notes */}
                <div className="pt-12 border-t border-slate-100 grid grid-cols-2 gap-8 items-end">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</p>
                      <p className="text-[11px] text-slate-500 italic font-medium leading-relaxed">
                        "{viewingInvoice.notes || 'Official system-generated invoice for procurement record.'}"
                        <br/>
                        Please ensure timely payment to maintain credit rating.
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Authorized Store Verification</p>
                      {store?.signature_url ? (
                        <div className="inline-block text-center min-w-[150px]">
                          <img src={store.signature_url} alt="Signature" className="h-16 mx-auto mb-2 object-contain mix-blend-multiply dark:invert dark:mix-blend-screen" />
                          <p className="text-sm font-bold text-slate-900 underline">{store?.owner_name || '......................'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{store?.owner_position || 'Authorized Signature'}</p>
                        </div>
                      ) : (
                        <div className="inline-block p-4 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[150px]">
                           <p className="text-xs font-black text-slate-900 tracking-tighter">TRADIXA AUTHENTICATED</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Verified Document</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Dialog */}
      <Dialog open={!!selectedProofUrl} onOpenChange={(open) => !open && setSelectedProofUrl(null)}>
        <DialogContent className="max-w-[800px] bg-transparent border-none shadow-none p-0 flex justify-center items-center">
          {selectedProofUrl && (
            <img 
              src={selectedProofUrl} 
              alt="Bukti Transfer" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
          )}
        </DialogContent>
      </Dialog>

      {printingInvoice && (
        <PrintInvoice invoice={printingInvoice} store={store} type="INVOICE AP" onClose={() => setPrintingInvoice(null)} />
      )}
    </div>
  );
}
