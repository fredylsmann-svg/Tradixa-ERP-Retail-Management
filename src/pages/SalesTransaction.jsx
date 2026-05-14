import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Eye, ShoppingCart, Receipt, CalendarClock, Wallet, Phone, User, CreditCard, X, ZoomIn, CheckCircle2, Clock, ArrowRight, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SalesTransactionForm from '@/components/product/SalesTransactionForm';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { getEffectiveLimits } from '@/planConfig';

export default function SalesTransaction({ store }) {
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [linkedAR, setLinkedAR] = useState(null);
  const [proofLightbox, setProofLightbox] = useState(null);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();

  useEffect(() => {
    if (viewingTransaction?.payment_method === 'Piutang / Termin' && store?.id) {
      api.entities.Receivable.filter({ store_id: store.id, invoice_number: viewingTransaction.invoice_number })
        .then(data => setLinkedAR(data?.[0] || null));
    } else {
      setLinkedAR(null);
    }
  }, [viewingTransaction]);

  useEffect(() => {
    if (store?.id) loadTransactions();
  }, [store]);

  const loadTransactions = async () => {
    const data = await api.entities.SalesTransaction.filter({ store_id: store.id }, '-created_date');
    setAllTransactions(data);
    setIsLoading(false);
  };

  // Filter by global selected date
  const transactions = allTransactions.filter(tx => matchesDate(tx, selectedDate));

  // Count current month transactions for Free plan limit
  const currentMonthSales = allTransactions.filter(tx => {
    const txDate = new Date(tx.created_date || tx.timestamp_wib);
    const now = new Date();
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }).length;

  const limits = getEffectiveLimits(store);
  const isLimitReached = limits.maxSalesPerMonth !== Infinity && currentMonthSales >= limits.maxSalesPerMonth;

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title="Sales Transaction"
        subtitle="Transaksi penjualan harian"
        icon={ShoppingCart}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportToolbar 
              title="Laporan Penjualan" 
              date={formattedDate} 
              storeName={store?.store_name} 
              storeAddress={store?.address} 
              storeLogoUrl={store?.logo_url} 
              contentId="print-sales" 
              store={store}
            />
            <Button 
              onClick={() => isLimitReached ? null : setShowForm(true)} 
              className={`${isLimitReached ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'} h-11 px-6 font-semibold rounded-xl transition-all`}
              disabled={isLimitReached}
            >
              <Plus className="w-4 h-4 mr-2" />
              Transaksi Baru
            </Button>
          </div>
        }
      />
      
      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Limit Transaksi Tercapai</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Anda telah mencapai batas {limits.maxSalesPerMonth} transaksi bulan ini untuk paket Anda. 
              Upgrade ke <span className="font-bold">Pro</span> untuk transaksi tanpa batas dan fitur premium lainnya.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/PricingPage'}
            className="border-amber-200 text-amber-700 hover:bg-amber-100 font-bold"
          >
            Upgrade Sekarang
          </Button>
        </div>
      )}

      <PageDatePicker />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-sales">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal (WIB)</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Sales PIC</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, idx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => setViewingTransaction(tx)}
                          className="font-bold text-blue-600 dark:text-blue-400 no-underline hover:underline decoration-blue-400 underline-offset-2 transition-colors cursor-pointer"
                        >
                          {tx.invoice_number}
                        </button>
                      </TableCell>
                      <TableCell>{tx.timestamp_wib}</TableCell>
                      <TableCell>{tx.customer_name}</TableCell>
                      <TableCell className="text-center">{tx.items?.length || 0}</TableCell>
                      <TableCell className="text-right font-medium">Rp {formatCurrency(tx.total)}</TableCell>
                      <TableCell>{tx.sales_pic || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          tx.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          tx.payment_status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }>{tx.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingTransaction(tx)} title="Lihat Detail">
                            <Eye className="w-4 h-4 text-slate-500" />
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

      <SalesTransactionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        store={store}
        onSuccess={loadTransactions}
      />

      <Dialog open={!!viewingTransaction && !proofLightbox} onOpenChange={() => setViewingTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detail Transaksi
              {viewingTransaction && (
                <Badge className={
                  viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700 ml-auto' :
                  viewingTransaction.payment_status === 'Partial' ? 'bg-blue-100 text-blue-700 ml-auto' :
                  'bg-amber-100 text-amber-700 ml-auto'
                }>{viewingTransaction.payment_status === 'Paid' ? 'Lunas' : viewingTransaction.payment_status === 'Partial' ? 'Bayar Sebagian' : 'Belum Bayar'}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-500">Invoice</p><p className="font-medium">{viewingTransaction.invoice_number}</p></div>
                <div><p className="text-sm text-slate-500">Tanggal</p><p className="font-medium">{viewingTransaction.timestamp_wib}</p></div>
                <div><p className="text-sm text-slate-500">Pelanggan</p><p className="font-medium">{viewingTransaction.customer_name}</p></div>
                <div><p className="text-sm text-slate-500">Sales PIC</p><p className="font-medium">{viewingTransaction.sales_pic || '-'}</p></div>
                <div>
                  <p className="text-sm text-slate-500">Lokasi</p>
                  <p className="font-medium">{viewingTransaction.sale_location || '-'}</p>
                  {viewingTransaction.sale_coordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${viewingTransaction.sale_coordinates.replace(/\s/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      📍 {viewingTransaction.sale_coordinates}
                    </a>
                  )}
                </div>
                <div><p className="text-sm text-slate-500">Pembayaran</p><p className="font-medium">{viewingTransaction.payment_method}</p></div>
              </div>

              {/* === AR / Piutang Section === */}
              {viewingTransaction.payment_method === 'Piutang / Termin' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Informasi Piutang (AR)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uang Muka (DP)</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        Rp {formatCurrency(viewingTransaction.paid_amount || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-blue-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sisa Piutang</p>
                      <p className="text-lg font-black text-red-600 dark:text-red-400">
                        Rp {formatCurrency((viewingTransaction.total || 0) - (viewingTransaction.paid_amount || 0))}
                      </p>
                    </div>
                    {linkedAR?.due_date && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CalendarClock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Jatuh Tempo</p>
                          <p className="font-bold">{linkedAR.due_date}</p>
                        </div>
                      </div>
                    )}
                    {linkedAR?.invoice_number && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">No. AR</p>
                          <p className="font-bold text-sm">{linkedAR.invoice_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {linkedAR?.notes && linkedAR.notes.includes('No HP:') && (
                    <div className="flex items-center gap-2 text-sm pt-1 border-t border-blue-100 dark:border-blue-800">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {linkedAR.notes.split('No HP:')[1]?.trim() || '-'}
                      </span>
                    </div>
                  )}
                  {/* Bukti Transfer DP */}
                  {viewingTransaction.payment_proof_url && (
                    <div className="pt-2 border-t border-blue-100 dark:border-blue-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bukti Transfer DP</p>
                      <button onClick={() => setProofLightbox(viewingTransaction.payment_proof_url)} className="w-full relative group">
                        <img
                          src={viewingTransaction.payment_proof_url}
                          alt="Bukti Transfer DP"
                          className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bukti Transfer (Non-Piutang, Bank/Transfer) */}
              {viewingTransaction.payment_method !== 'Piutang / Termin' && viewingTransaction.payment_proof_url && (
                <>
                  {viewingTransaction.payment_status === 'Pending' && viewingTransaction.payment_proof_url && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg">
                            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Menunggu Approval</p>
                            <p className="text-[10px] text-amber-600 font-medium">Menunggu klarifikasi & approval di Bank Transaction</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const payUrl = viewingTransaction.payment_link 
                              || (viewingTransaction.payment_proof_url?.includes('mayar') ? viewingTransaction.payment_proof_url : null);
                            if (payUrl) {
                              window.open(payUrl, '_blank');
                            } else {
                              setProofLightbox(viewingTransaction.payment_proof_url);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 rounded-lg text-xs flex items-center gap-2"
                        >
                          {viewingTransaction.payment_link || viewingTransaction.payment_proof_url?.includes('mayar') 
                            ? <>Lanjutkan Pembayaran <ArrowRight className="w-3.5 h-3.5" /></>
                            : <>Lihat Bukti <ZoomIn className="w-3.5 h-3.5" /></>
                          }
                        </Button>
                      </div>
                    </div>
                  )}

                  {viewingTransaction.payment_proof_url.includes('mayar') ? (
                    <div className={`p-4 rounded-xl border space-y-2 ${viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${viewingTransaction.payment_status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>Status Pembayaran Sistem</p>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${viewingTransaction.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-400'}`}>
                          {viewingTransaction.payment_status === 'Paid' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${viewingTransaction.payment_status === 'Paid' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
                            {viewingTransaction.payment_status === 'Paid' ? 'Diverifikasi oleh Mayar' : 'Menunggu Approval / Klarifikasi'}
                          </p>
                          <a href={viewingTransaction.payment_proof_url} target="_blank" rel="noreferrer" className={`text-xs hover:underline ${viewingTransaction.payment_status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {viewingTransaction.payment_status === 'Paid' ? 'Lihat Tautan Transaksi' : 'Buka Link Pembayaran'}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bukti Pembayaran</p>
                      <button onClick={() => setProofLightbox(viewingTransaction.payment_proof_url)} className="w-full relative group">
                        <img
                          src={viewingTransaction.payment_proof_url}
                          alt="Bukti Pembayaran"
                          className="w-full max-h-48 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingTransaction.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {formatCurrency(viewingTransaction.subtotal)}</span></div>
                {viewingTransaction.discount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Diskon</span><span>-Rp {formatCurrency(viewingTransaction.discount)}</span></div>
                )}
                {viewingTransaction.tax_amount > 0 && (
                  <div className="flex justify-between"><span>PPN ({viewingTransaction.tax_percentage}%)</span><span>Rp {formatCurrency(viewingTransaction.tax_amount)}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span><span>Rp {formatCurrency(viewingTransaction.total)}</span>
                </div>

                {/* Payment Breakdown for Piutang */}
                {viewingTransaction.payment_method === 'Piutang / Termin' && (
                  <div className="flex justify-between text-sm font-bold text-blue-600 dark:text-blue-400">
                    <span>Dibayar (DP)</span><span>Rp {formatCurrency(viewingTransaction.paid_amount || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-600">
                  <span>Keuntungan</span><span>Rp {formatCurrency(viewingTransaction.profit)}</span>
                </div>

                {/* HPP / COGS */}
                {viewingTransaction.items && (
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>HPP (Harga Pokok)</span>
                    <span>Rp {formatCurrency(viewingTransaction.items.reduce((sum, i) => sum + ((i.buy_price || 0) * i.quantity), 0))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

    {/* === Lightbox Modal untuk Bukti Transfer === */}
    <Dialog open={!!proofLightbox} onOpenChange={(open) => {
      if (!open) {
        setProofLightbox(null);
      }
    }}>
      <DialogContent hideClose hideFullscreen className="max-w-4xl p-0 bg-transparent border-none shadow-none">
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setProofLightbox(null)}
            className="absolute -top-3 -right-3 z-50 w-9 h-9 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          {proofLightbox && (
            <img
              src={proofLightbox}
              alt="Bukti Transfer"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white dark:bg-slate-900"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
