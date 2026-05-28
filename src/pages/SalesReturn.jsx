import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import PageHeader from '@/components/layout/PageHeader';
import { RotateCcw, Plus, Search, Loader2, PackageCheck, Eye, Minus } from 'lucide-react';
import { NumberInput } from '@/components/ui/number-input';

export default function SalesReturn({ store }) {
  const { toast } = useToast();
  const { selectedDate } = useGlobalDate();
  const [allReturns, setAllReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingReturn, setViewingReturn] = useState(null);

  // Form states
  const [searchInvoice, setSearchInvoice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundTransaction, setFoundTransaction] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');

  const storeId = store?.id;

  useEffect(() => {
    if (storeId) loadData();
  }, [storeId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [returnsData, banksData] = await Promise.all([
        api.entities.SalesReturn.filter({ store_id: storeId }, '-created_at'),
        api.entities.BankAccount.filter({ store_id: storeId })
      ]);
      setAllReturns(returnsData || []);
      setBankAccounts(banksData || []);
    } catch (err) {
      console.error('Failed to load returns:', err);
    }
    setIsLoading(false);
  };

  const returns = allReturns.filter(r => matchesDate(r, selectedDate));
  const formatCurrency = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

  const getWIBTimestamp = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 60 * 60000));
    return `${String(wib.getDate()).padStart(2,'0')}/${String(wib.getMonth()+1).padStart(2,'0')}/${wib.getFullYear()} ${String(wib.getHours()).padStart(2,'0')}:${String(wib.getMinutes()).padStart(2,'0')} WIB`;
  };

  // Search invoice
  const handleSearchInvoice = async () => {
    if (!searchInvoice.trim()) return;
    setIsSearching(true);
    setFoundTransaction(null);
    setReturnItems([]);
    try {
      const txs = await api.entities.SalesTransaction.filter({ store_id: storeId, invoice_number: searchInvoice.trim() });
      if (!txs || txs.length === 0) {
        toast({ title: 'Tidak Ditemukan', description: 'Invoice tidak ditemukan.', variant: 'destructive' });
        setIsSearching(false);
        return;
      }
      const tx = txs[0];
      if (tx.status?.toLowerCase() === 'voided' || tx.payment_status?.toLowerCase() === 'voided') {
        toast({ title: 'Tidak Bisa Diretur', description: 'Transaksi ini sudah dibatalkan (Voided). Tidak dapat diproses retur.', variant: 'destructive' });
        setIsSearching(false);
        return;
      }
      if (tx.return_status === 'Full') {
        toast({ title: 'Sudah Full Return', description: 'Semua item pada invoice ini sudah diretur.', variant: 'destructive' });
        setIsSearching(false);
        return;
      }
      // Check existing returns for this invoice to calculate remaining qty
      const existingReturns = await api.entities.SalesReturn.filter({ store_id: storeId, invoice_number: tx.invoice_number });
      const returnedQtyMap = {};
      (existingReturns || []).forEach(ret => {
        (ret.returned_items || []).forEach(ri => {
          returnedQtyMap[ri.product_id] = (returnedQtyMap[ri.product_id] || 0) + ri.return_qty;
        });
      });

      setFoundTransaction(tx);
      setReturnItems((tx.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        original_qty: item.quantity,
        already_returned: returnedQtyMap[item.product_id] || 0,
        max_returnable: item.quantity - (returnedQtyMap[item.product_id] || 0),
        return_qty: 0,
        selected: false
      })));
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsSearching(false);
  };

  const toggleItem = (idx) => {
    setReturnItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected, return_qty: !item.selected ? 1 : 0 } : item));
  };

  const updateReturnQty = (idx, qty) => {
    const num = Math.max(0, Math.min(Number(qty) || 0, returnItems[idx].max_returnable));
    setReturnItems(prev => prev.map((item, i) => i === idx ? { ...item, return_qty: num } : item));
  };

  const totalRefund = returnItems.filter(i => i.selected && i.return_qty > 0).reduce((sum, i) => sum + (i.unit_price * i.return_qty), 0);

  // Process return
  const handleProcessReturn = async () => {
    const selectedItems = returnItems.filter(i => i.selected && i.return_qty > 0);
    if (selectedItems.length === 0) {
      toast({ title: 'Validasi', description: 'Pilih minimal 1 item dan isi qty retur.', variant: 'destructive' });
      return;
    }
    if (!refundMethod) {
      toast({ title: 'Validasi', description: 'Pilih metode pengembalian dana.', variant: 'destructive' });
      return;
    }
    if (refundMethod === 'Transfer Bank' && !selectedBankId) {
      toast({ title: 'Validasi', description: 'Pilih rekening bank untuk refund.', variant: 'destructive' });
      return;
    }
    if (!reason) {
      toast({ title: 'Validasi', description: 'Pilih alasan retur.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const returnNumber = `RET-${Date.now()}`;
      const returnedItemsData = selectedItems.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        return_qty: i.return_qty,
        subtotal: i.unit_price * i.return_qty
      }));

      // 1. Save return record
      await api.entities.SalesReturn.create({
        store_id: storeId,
        sales_transaction_id: foundTransaction.id,
        invoice_number: foundTransaction.invoice_number,
        return_number: returnNumber,
        returned_items: returnedItemsData,
        total_refund: totalRefund,
        refund_method: refundMethod,
        reason,
        status: 'Completed',
        created_by: 'Administrator'
      });

      // 2. Restore stock for returned items
      for (const item of selectedItems) {
        try {
          const products = await api.entities.Product.filter({ store_id: storeId, id: item.product_id });
          if (products?.length > 0) {
            const product = products[0];
            const newStock = (product.stock || 0) + item.return_qty;
            const status = newStock > product.reorder_level ? 'In Stock' : newStock > 0 ? 'Low Stock' : 'Out of Stock';
            await api.entities.Product.update(item.product_id, { stock: newStock, status });
          }
          await api.entities.StockMovement.create({
            store_id: storeId,
            reference: returnNumber,
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'in',
            stock_type: 'Sales Return',
            quantity: item.return_qty,
            timestamp_wib: getWIBTimestamp()
          });
        } catch (err) {
          console.error(`[Return] Stock restore failed for ${item.product_name}:`, err);
        }
      }

      // 3. Create journal entry (D: Retur Penjualan, C: Kas/Bank)
      try {
        const journal = await api.entities.JournalEntry.create({
          store_id: storeId,
          transaction_id: returnNumber,
          date: new Date().toLocaleDateString('en-CA'),
          description: `[RETURN] Retur Penjualan - ${foundTransaction.customer_name} (${foundTransaction.invoice_number}) | Alasan: ${reason}`,
          type: 'sales',
          status: 'Posted',
          total_debit: totalRefund,
          total_credit: totalRefund,
          created_by: 'System'
        });
        const creditAccount = refundMethod === 'Transfer Bank' 
          ? `Kas Bank - ${bankAccounts.find(b => b.id === selectedBankId)?.bank_name || 'Bank'}`
          : 'Kas Tangan';
        await Promise.all([
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: 'Retur Penjualan',
            description: `Retur dari ${foundTransaction.invoice_number}`,
            debit: totalRefund,
            credit: 0
          }),
          api.entities.JournalLine.create({
            journal_id: journal.id,
            account_name: creditAccount,
            description: `Refund ${refundMethod} - ${returnNumber}`,
            debit: 0,
            credit: totalRefund
          })
        ]);
      } catch (err) {
        console.error('[Return] Journal creation failed:', err);
      }

      // 4. If refund via bank, create bank transaction (Debit = uang keluar)
      if (refundMethod === 'Transfer Bank' && selectedBankId) {
        try {
          const banks = await api.entities.BankAccount.filter({ id: selectedBankId });
          if (banks?.length > 0) {
            const bank = banks[0];
            const newBalance = (bank.balance || 0) - totalRefund;
            await api.entities.BankTransaction.create({
              store_id: storeId,
              bank_account_id: selectedBankId,
              bank_name: bank.bank_name,
              transaction_type: 'Debit',
              amount: totalRefund,
              description: `[RETURN] Refund ${foundTransaction.invoice_number} - ${foundTransaction.customer_name}`,
              reference: returnNumber,
              balance_after: newBalance,
              status: 'Approved',
              timestamp_wib: getWIBTimestamp()
            });
            await api.entities.BankAccount.update(selectedBankId, { balance: newBalance });
          }
        } catch (err) {
          console.error('[Return] Bank transaction failed:', err);
        }
      }

      // 5. Update return_status on original transaction
      const totalOrigQty = (foundTransaction.items || []).reduce((s, i) => s + i.quantity, 0);
      const existingReturns = await api.entities.SalesReturn.filter({ store_id: storeId, invoice_number: foundTransaction.invoice_number });
      let totalReturnedQty = 0;
      (existingReturns || []).forEach(ret => {
        (ret.returned_items || []).forEach(ri => { totalReturnedQty += ri.return_qty; });
      });
      const newReturnStatus = totalReturnedQty >= totalOrigQty ? 'Full' : 'Partial';
      await api.entities.SalesTransaction.update(foundTransaction.id, { return_status: newReturnStatus });

      toast({ title: 'Retur Berhasil', description: `Retur ${returnNumber} telah diproses. Refund Rp ${formatCurrency(totalRefund)} via ${refundMethod}.` });
      resetForm();
      setShowForm(false);
      loadData();
    } catch (err) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const resetForm = () => {
    setSearchInvoice('');
    setFoundTransaction(null);
    setReturnItems([]);
    setRefundMethod('');
    setReason('');
    setSelectedBankId('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Return"
        subtitle="Kelola pengembalian barang dari pelanggan"
        icon={RotateCcw}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Retur Baru
          </Button>
        }
      />
      <PageDatePicker />

      {/* Return History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>No. Retur</TableHead>
                <TableHead>Invoice Asal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Item Diretur</TableHead>
                <TableHead>Metode Refund</TableHead>
                <TableHead className="text-right">Total Refund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    <RotateCcw className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Belum ada retur penjualan
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret, idx) => (
                  <TableRow key={ret.id}>
                    <TableCell className="text-center text-slate-400 font-medium text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{ret.return_number}</TableCell>
                    <TableCell>{ret.invoice_number}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(ret.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                    </TableCell>
                    <TableCell>
                      {(ret.returned_items || []).map((ri, i) => (
                        <div key={i} className="text-sm">{ri.product_name} x{ri.return_qty}</div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Badge className={ret.refund_method === 'Tunai' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                        {ret.refund_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">Rp {formatCurrency(ret.total_refund)}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 rounded-full font-bold">{ret.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => setViewingReturn(ret)}>
                        <Eye className="w-4 h-4 text-blue-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { resetForm(); } setShowForm(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Buat Retur Penjualan Baru</DialogTitle>
            <DialogDescription>Cari invoice dan pilih item yang akan diretur oleh pelanggan.</DialogDescription>
          </DialogHeader>

          {/* Step 1: Search Invoice */}
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Cari Invoice</Label>
              <div className="flex gap-2 mt-1.5">
                <Input placeholder="Contoh: INV-1779990442049" value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearchInvoice(); }} />
                <Button onClick={handleSearchInvoice} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Found Transaction Info */}
            {foundTransaction && (
              <>
                <div className="bg-slate-50 rounded-xl p-4 border space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Invoice:</span><span className="font-semibold">{foundTransaction.invoice_number}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Pelanggan:</span><span className="font-medium">{foundTransaction.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Total Asli:</span><span className="font-medium">Rp {formatCurrency(foundTransaction.total)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Pembayaran:</span><span className="font-medium">{foundTransaction.payment_method}</span></div>
                  {foundTransaction.return_status && foundTransaction.return_status !== 'None' && (
                    <div className="flex justify-between"><span className="text-slate-500">Status Retur:</span>
                      <Badge className="bg-amber-100 text-amber-700">{foundTransaction.return_status}</Badge>
                    </div>
                  )}
                </div>

                {/* Step 2: Select Items */}
                <div>
                  <Label className="font-semibold">Pilih Item yang Diretur</Label>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-center">Qty Beli</TableHead>
                        <TableHead className="text-center">Sudah Retur</TableHead>
                        <TableHead className="text-center">Qty Retur</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item, idx) => (
                        <TableRow key={idx} className={item.max_returnable <= 0 ? 'opacity-40' : item.selected ? 'bg-blue-50/50' : ''}>
                          <TableCell className="text-center">
                            <input type="checkbox" checked={item.selected} disabled={item.max_returnable <= 0}
                              onChange={() => toggleItem(idx)} className="w-4 h-4 accent-blue-600" />
                          </TableCell>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center">{item.original_qty}</TableCell>
                          <TableCell className="text-center text-slate-400">{item.already_returned}</TableCell>
                          <TableCell className="text-center">
                            {item.selected ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateReturnQty(idx, item.return_qty - 1)}>
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-bold">{item.return_qty}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateReturnQty(idx, item.return_qty + 1)}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.selected && item.return_qty > 0 ? `Rp ${formatCurrency(item.unit_price * item.return_qty)}` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Step 3: Refund Method & Reason */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Alasan Retur *</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barang Cacat">Barang Cacat</SelectItem>
                        <SelectItem value="Tidak Sesuai Pesanan">Tidak Sesuai Pesanan</SelectItem>
                        <SelectItem value="Salah Kirim">Salah Kirim</SelectItem>
                        <SelectItem value="Berubah Pikiran">Berubah Pikiran</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-semibold">Metode Pengembalian Dana *</Label>
                    <Select value={refundMethod} onValueChange={(v) => { setRefundMethod(v); setSelectedBankId(''); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tunai">Refund Tunai (Cash)</SelectItem>
                        <SelectItem value="Transfer Bank">Refund Transfer Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {refundMethod === 'Transfer Bank' && (
                  <div>
                    <Label className="font-semibold">Pilih Rekening Bank *</Label>
                    <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih rekening" /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Total */}
                {totalRefund > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-red-700 font-semibold">Total Refund:</span>
                    <span className="text-2xl font-black text-red-600">Rp {formatCurrency(totalRefund)}</span>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Batal</Button>
                  <Button onClick={handleProcessReturn} disabled={isSaving || totalRefund <= 0}
                    className="bg-blue-600 hover:bg-blue-700">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <PackageCheck className="w-4 h-4 mr-2" /> Proses Retur
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewingReturn} onOpenChange={() => setViewingReturn(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Retur</DialogTitle>
            <DialogDescription>Informasi lengkap retur penjualan.</DialogDescription>
          </DialogHeader>
          {viewingReturn && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">No. Retur:</span> <span className="font-semibold">{viewingReturn.return_number}</span></div>
                <div><span className="text-slate-500">Invoice:</span> <span className="font-semibold">{viewingReturn.invoice_number}</span></div>
                <div><span className="text-slate-500">Refund:</span> <Badge className={viewingReturn.refund_method === 'Tunai' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>{viewingReturn.refund_method}</Badge></div>
                <div><span className="text-slate-500">Alasan:</span> <span className="font-medium">{viewingReturn.reason}</span></div>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold mb-2">Item Diretur:</p>
                {(viewingReturn.returned_items || []).map((ri, i) => (
                  <div key={i} className="flex justify-between py-1 border-b last:border-b-0">
                    <span>{ri.product_name} × {ri.return_qty}</span>
                    <span className="font-medium">Rp {formatCurrency(ri.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-base">
                  <span>Total Refund:</span>
                  <span className="text-red-600">Rp {formatCurrency(viewingReturn.total_refund)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
