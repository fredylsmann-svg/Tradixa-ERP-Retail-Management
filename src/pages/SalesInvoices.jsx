import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, Printer, Receipt, Mail, Loader2, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PrintInvoice from '@/components/invoice/PrintInvoice';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { FileText } from 'lucide-react';

export default function SalesInvoices({ store }) {
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [emailingInvoice, setEmailingInvoice] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();

  useEffect(() => {
    if (store?.id) loadTransactions();

    // Listener untuk tombol refresh di Header
    const handleRefreshEvent = () => {
      loadTransactions();
    };
    window.addEventListener('refresh_data', handleRefreshEvent);

    return () => {
      window.removeEventListener('refresh_data', handleRefreshEvent);
    };
  }, [store]);

  const loadTransactions = async () => {
    const data = await api.entities.SalesTransaction.filter({ store_id: store.id }, '-created_date');
    setAllTransactions(data);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const transactions = allTransactions.filter(tx => matchesDate(tx, selectedDate));

  const filteredTransactions = transactions.filter(tx =>
    tx.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendInvoiceEmail = async () => {
    if (!emailingInvoice || !emailingInvoice.customer_id) return;
    
    setIsSendingEmail(true);
    try {
      const customer = await api.entities.Customer.filter({ id: emailingInvoice.customer_id });
      if (customer.length > 0 && customer[0].email) {
        const invoiceDetails = `
Invoice: ${emailingInvoice.invoice_number}
Customer: ${emailingInvoice.customer_name}
Total: Rp ${formatCurrency(emailingInvoice.total)}
Status: ${emailingInvoice.payment_status}

Terima kasih telah berbelanja di ${store.store_name}.
        `.trim();

        await api.integrations.Core.SendEmail({
          to: customer[0].email,
          subject: `Invoice ${emailingInvoice.invoice_number} - ${store.store_name}`,
          body: invoiceDetails
        });
        
        // Log Activity
        api.logActivity({
          store_id: store.id,
          entity_name: 'SalesInvoice',
          entity_id: emailingInvoice.id,
          action_type: 'email_sent',
          description: `Sent invoice ${emailingInvoice.invoice_number} to ${customer[0].email}`
        });

        toast.success('Email berhasil dikirim!');
      } else {
        toast.error('Customer tidak memiliki email!');
      }
    } catch (error) {
      toast.error('Gagal mengirim email!');
    }
    setIsSendingEmail(false);
    setEmailingInvoice(null);
  };

  const handleSendWA = async (tx) => {
    if (!tx.customer_id) {
       toast.error('Data pelanggan tidak tersedia pada invoice ini.');
       return;
    }
    
    try {
      const customers = await api.entities.Customer.filter({ id: tx.customer_id });
      if (customers.length > 0 && customers[0].phone) {
         const customer = customers[0];
         const link = `${window.location.origin}/public/invoice/sales/${tx.id}`;
         const message = `Halo ${customer.name},\n\nBerikut adalah tagihan / invoice untuk transaksi Anda di *${store?.store_name}*.\n\nNo. Invoice: *${tx.invoice_number}*\nTotal: *Rp ${formatCurrency(tx.total)}*\nStatus: *${tx.payment_status}*\n\nSilakan klik tautan di bawah ini untuk melihat dan mengunduh detail invoice:\n${link}\n\nTerima kasih,\n${store?.store_name}`;
         
         const cleanPhone = customer.phone.replace(/\D/g, '');
         const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
         
         window.open(waUrl, '_blank');

         // Log Activity
         api.logActivity({
           store_id: store.id,
           entity_name: 'SalesInvoice',
           entity_id: tx.id,
           action_type: 'status_change', // Using status_change or similar as a proxy for engagement
           description: `Opened WhatsApp to send invoice ${tx.invoice_number} to ${customer.phone}`
         });
      } else {
         toast.error('Customer ini tidak memiliki nomor telepon WhatsApp yang terdaftar!');
      }
    } catch (e) {
      toast.error('Gagal mengambil data customer: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Daftar invoice penjualan"
        icon={Receipt}
        actions={
          <ExportToolbar title="Laporan Invoice Penjualan (Detail)" date={formattedDate} storeName={store?.store_name} storeAddress={store?.address} storeLogoUrl={store?.logo_url} contentId="print-sales-detailed" />
        }
      />
      <PageDatePicker />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead >No. Invoice</TableHead>
                  <TableHead >Tanggal</TableHead>
                  <TableHead >Pelanggan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead >Sales PIC</TableHead>
                  <TableHead >Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Tidak ada invoice ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx, idx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                      <TableCell>{tx.timestamp_wib}</TableCell>
                      <TableCell>{tx.customer_name}</TableCell>
                      <TableCell className="text-right font-medium">Rp {formatCurrency(tx.total)}</TableCell>
                      <TableCell>{tx.sales_pic || '-'}</TableCell>
                      <TableCell>
                        <Badge className={tx.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {tx.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingInvoice(tx)}>
                            <Eye className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setPrintingInvoice(tx)}>
                            <Printer className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEmailingInvoice(tx)}>
                            <Mail className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleSendWA(tx)}>
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Hidden Detailed Table for Export */}
          <div id="print-sales-detailed" className="hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item & Rincian</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <TableCell>{tx.invoice_number}</TableCell>
                      <TableCell>{tx.timestamp_wib}</TableCell>
                      <TableCell>{tx.customer_name}</TableCell>
                      <TableCell>RINGKASAN ITEM</TableCell>
                      <TableCell className="text-right">Rp {formatCurrency(tx.total)}</TableCell>
                      <TableCell>{tx.payment_status}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <Table className="bg-white">
                          <TableHeader>
                            <TableRow className="bg-slate-100">
                              <TableHead className="py-1 px-4">Produk</TableHead>
                              <TableHead className="py-1 px-4 text-center">Qty</TableHead>
                              <TableHead className="py-1 px-4 text-right">Harga</TableHead>
                              <TableHead className="py-1 px-4 text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tx.items?.map((item, i) => (
                              <TableRow key={i} className="border-b border-slate-50">
                                <TableCell className="py-1 px-4 text-[10px]">{item.product_name}</TableCell>
                                <TableCell className="py-1 px-4 text-[10px] text-center">{item.quantity}</TableCell>
                                <TableCell className="py-1 px-4 text-[10px] text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
                                <TableCell className="py-1 px-4 text-[10px] text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
                              </TableRow>
                            ))}
                            {tx.discount > 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="py-1 px-4 text-[10px] text-right font-bold">Potongan / Diskon</TableCell>
                                <TableCell className="py-1 px-4 text-[10px] text-right text-rose-600 font-bold">-Rp {formatCurrency(tx.discount)}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice #{viewingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{store?.store_name}</h2>
                <p className="text-sm text-slate-500">{store?.address}</p>
              </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Pelanggan:</span> {viewingInvoice.customer_name}</div>
                  <div><span className="text-slate-500">Sales PIC:</span> {viewingInvoice.sales_pic || '-'}</div>
                  <div><span className="text-slate-500">Lokasi:</span> {viewingInvoice.sale_location || '-'}</div>
                  <div><span className="text-slate-500">Tanggal:</span> {viewingInvoice.timestamp_wib}</div>
                  <div><span className="text-slate-500">Pembayaran:</span> {viewingInvoice.payment_method}</div>
                  <div><span className="text-slate-500">Status:</span> {viewingInvoice.payment_status}</div>
                </div>
              {viewingInvoice.payment_proof_url && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Bukti Transfer:</p>
                  <img src={viewingInvoice.payment_proof_url} alt="Proof" className="w-full max-w-md rounded-lg border" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingInvoice.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">Rp {formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1 pt-4 border-t text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {formatCurrency(viewingInvoice.subtotal)}</span></div>
                {viewingInvoice.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-Rp {formatCurrency(viewingInvoice.discount)}</span></div>}
                {viewingInvoice.tax_amount > 0 && <div className="flex justify-between"><span>PPN</span><span>Rp {formatCurrency(viewingInvoice.tax_amount)}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>Rp {formatCurrency(viewingInvoice.total)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printingInvoice && (
        <PrintInvoice invoice={printingInvoice} store={store} onClose={() => setPrintingInvoice(null)} />
      )}

      <Dialog open={!!emailingInvoice} onOpenChange={() => setEmailingInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Invoice via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Kirim invoice <strong>#{emailingInvoice?.invoice_number}</strong> ke customer <strong>{emailingInvoice?.customer_name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailingInvoice(null)}>Batal</Button>
              <Button onClick={sendInvoiceEmail} disabled={isSendingEmail} className="bg-blue-600 hover:bg-blue-700">
                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Kirim Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
