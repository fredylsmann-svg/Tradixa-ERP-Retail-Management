import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Eye, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import StockInForm from '@/components/stock/StockInForm';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import PageHeader from '@/components/layout/PageHeader';
import { Package } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { getEffectiveLimits } from '@/planConfig';

export default function StockIn({ store }) {
  const [allMovements, setAllMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const { selectedDate, formattedDate, isToday } = useGlobalDate();

  useEffect(() => {
    if (store?.id) loadMovements();
  }, [store]);

  const handleOpenForm = () => {
    const limits = getEffectiveLimits(store);
    if (limits.maxStockIn !== Infinity && allMovements.length >= limits.maxStockIn) {
      sonnerToast.error(`Kuota Stock In habis (${allMovements.length}/${limits.maxStockIn}). Upgrade ke Pro Plan untuk menambah kuota.`, { duration: 5000 });
      return;
    }
    setShowForm(true);
  };

  const loadMovements = async () => {
    const data = await api.entities.StockMovement.filter({ store_id: store.id, movement_type: 'in' }, '-created_date');
    setAllMovements(data);
    setIsLoading(false);
  };

  const movements = allMovements.filter(m => matchesDate(m, selectedDate));

  const getExpiryStatus = (expiredDate) => {
    if (!expiredDate) return null;
    const today = new Date();
    const expiry = new Date(expiredDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', class: 'bg-red-100 text-red-700' };
    if (diffDays <= 30) return { label: 'Near Expiry', class: 'bg-amber-100 text-amber-700' };
    return { label: 'Good', class: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock In"
        subtitle="Catat barang masuk ke inventory"
        icon={Download}
        actions={
          <>
            <ExportToolbar
              title="Laporan Stok Masuk"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-stock-in-detailed"
            
            store={store}
          />
            <Button onClick={handleOpenForm} className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Stok Masuk
            </Button>
          </>
        }
      />
      <PageDatePicker />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-stockin">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Tanggal (WIB)</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MFG Date</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Status Expiry</TableHead>
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
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      <Download className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      Belum ada stok masuk
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((item, idx) => {
                    const expiryStatus = getExpiryStatus(item.expiry_date || item.expired_date);
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.reference}</TableCell>
                        <TableCell>{item.timestamp_wib}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-emerald-600 font-medium">+ {item.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">{item.stock_type}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium">
                          {item.manufacture_date ? item.manufacture_date : '-'}
                        </TableCell>
                        <TableCell>{item.expiry_date || item.expired_date || '-'}</TableCell>
                        <TableCell>
                          {expiryStatus ? (
                            <Badge className={expiryStatus.class}>{expiryStatus.label}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setViewingItem(item)}>
                            <Eye className="w-4 h-4 text-slate-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StockInForm
        open={showForm}
        onClose={() => setShowForm(false)}
        storeId={store?.id}
        onSuccess={loadMovements}
      />

      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Stok Masuk</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-500">Referensi</p><p className="font-medium">{viewingItem.reference}</p></div>
                <div><p className="text-sm text-slate-500">Tanggal</p><p className="font-medium">{viewingItem.timestamp_wib}</p></div>
                <div><p className="text-sm text-slate-500">Produk</p><p className="font-medium">{viewingItem.product_name}</p></div>
                <div><p className="text-sm text-slate-500">Quantity</p><p className="font-medium text-emerald-600">+{viewingItem.quantity}</p></div>
                <div><p className="text-sm text-slate-500">Type</p><p className="font-medium">{viewingItem.stock_type}</p></div>
                <div><p className="text-sm text-slate-500">Expired</p><p className="font-medium">{viewingItem.expiry_date || viewingItem.expired_date || '-'}</p></div>
              </div>
              {viewingItem.notes && (
                <div><p className="text-sm text-slate-500">Catatan</p><p className="font-medium">{viewingItem.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-stock-in-detailed" className="hidden">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Referensi</th>
              <th>Produk</th>
              <th>Qty</th>
              <th>Tipe</th>
              <th>Expired</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.timestamp_wib}</td>
                <td>{m.reference}</td>
                <td>{m.product_name}</td>
                <td>+{m.quantity}</td>
                <td>{m.stock_type}</td>
                <td>{m.expiry_date || m.expired_date || '-'}</td>
                <td>{m.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
