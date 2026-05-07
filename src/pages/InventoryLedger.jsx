import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  RotateCcw, 
  Download,
  FileText,
  Package,
  Activity
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalDate, matchesDate } from '@/contexts/DateContext';
import PageDatePicker from '@/components/layout/PageDatePicker';
import ExportToolbar from '@/components/layout/ExportToolbar';
import moment from 'moment';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import PageHeader from '@/components/layout/PageHeader';

export default function InventoryLedger({ store }) {
  const [allMovements, setAllMovements] = useState([]);
  const [enrichedMovements, setEnrichedMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { selectedDate, formattedDate } = useGlobalDate();

  useEffect(() => {
    if (store?.id) {
      loadData();
    }
  }, [store]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movementsData, productsData] = await Promise.all([
        api.entities.StockMovement.filter({ store_id: store.id }),
        api.entities.Product.filter({ store_id: store.id })
      ]);

      const productMap = {};
      productsData.forEach(p => {
        productMap[p.id] = p;
      });

      const groupedByProduct = {};
      movementsData.forEach(m => {
        if (!groupedByProduct[m.product_id]) {
          groupedByProduct[m.product_id] = [];
        }
        groupedByProduct[m.product_id].push(m);
      });

      const processed = [];
      
      Object.keys(groupedByProduct).forEach(pid => {
        const productMovements = groupedByProduct[pid];
        productMovements.sort((a, b) => {
          const timeA = moment(a.timestamp_wib, 'DD/MM/YYYY HH:mm WIB').valueOf();
          const timeB = moment(b.timestamp_wib, 'DD/MM/YYYY HH:mm WIB').valueOf();
          return timeA - timeB;
        });

        let balance = 0;
        productMovements.forEach((m, mIdx) => {
          const qty = Number(m.quantity) || 0;
          if (m.movement_type === 'in') {
            balance += qty;
          } else {
            balance -= qty;
          }
          
          const product = productMap[pid] || {};
          const unitPrice = product.buy_price || product.sell_price || 0;

          // Generate Unique Ledger ID: IL-YYYYMMDD-ID (last 4 chars)
          const datePart = m.timestamp_wib.split(' ')[0].split('/').reverse().join('');
          const ledger_id = `IL-${datePart}-${m.id.slice(-4).toUpperCase()}`;

          processed.push({
            ...m,
            ledger_id,
            sku: product.sku || '-',
            unit: product.unit || 'pcs',
            running_balance: balance,
            nilai: qty * unitPrice,
            source_label: formatSource(m.stock_type, m.reference),
          });
        });
      });

      processed.sort((a, b) => {
        const timeA = moment(a.timestamp_wib, 'DD/MM/YYYY HH:mm WIB').valueOf();
        const timeB = moment(b.timestamp_wib, 'DD/MM/YYYY HH:mm WIB').valueOf();
        return timeB - timeA;
      });

      setAllMovements(processed);
      setEnrichedMovements(processed);
    } catch (err) {
      console.error("Failed to load ledger data", err);
    }
    setIsLoading(false);
  };

  const formatSource = (type, ref) => {
    const t = (type || '').toLowerCase();
    if (t === 'igrn') return 'INVENTORY_GRN';
    if (t.includes('kulakan')) return 'STOCK_IN (KULAKAN)';
    if (t === 'stock in') return 'STOCK_IN';
    if (t === 'stock out') return 'STOCK_OUT';
    if (t === 'sales') return 'SALES_TRANSACTION';
    if (t === 'grn') return 'PROCUREMENT_GRN';
    if (t === 'return') return 'RETURN_TRANSACTION';
    return type?.toUpperCase() || 'ADJUSTMENT';
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val);

  const filteredMovements = enrichedMovements.filter(m => {
    const matchesSearch = 
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || m.movement_type === typeFilter;
    const matchesD = matchesDate(m, selectedDate);

    return matchesSearch && matchesType && matchesD;
  });

  const stats = {
    totalIn: filteredMovements.reduce((sum, m) => m.movement_type === 'in' ? sum + Number(m.quantity) : sum, 0),
    totalOut: filteredMovements.reduce((sum, m) => m.movement_type === 'out' ? sum + Number(m.quantity) : sum, 0),
    totalTransactions: filteredMovements.length,
    netMovement: filteredMovements.reduce((sum, m) => m.movement_type === 'in' ? sum + Number(m.quantity) : sum - Number(m.quantity), 0)
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Ledger"
        subtitle="Single source of truth untuk pergerakan stok"
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <PageDatePicker />
            <Button variant="outline" size="icon" onClick={loadData} className="h-11 w-11 rounded-xl">
              <RotateCcw className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Masuk</p>
            <p className="text-2xl font-bold text-blue-600">
              +<AnimatedNumber value={stats.totalIn} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Keluar</p>
            <p className="text-2xl font-bold text-red-600">
              -<AnimatedNumber value={stats.totalOut} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Net Movement</p>
            <p className={`text-2xl font-bold ${stats.netMovement >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {stats.netMovement >= 0 ? '+' : ''}<AnimatedNumber value={stats.netMovement} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Transaksi</p>
            <p className="text-2xl font-bold text-slate-800">
              <AnimatedNumber value={stats.totalTransactions} />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari item atau nomor ledger..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="in">Masuk</SelectItem>
                  <SelectItem value="out">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ExportToolbar
              title="Inventory Ledger"
              date={formattedDate}
              storeName={store?.store_name}
              storeAddress={store?.address}
              storeLogoUrl={store?.logo_url}
              contentId="print-ledger"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="print-ledger">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>No. Ledger</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Transaksi</TableHead>
                  <TableHead className="text-center">Masuk</TableHead>
                  <TableHead className="text-center">Keluar</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead>Sumber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={10} className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        Belum ada pergerakan stok
                     </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m, idx) => (
                    <TableRow key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-slate-600 dark:text-slate-300 font-mono text-xs">{m.ledger_id}</TableCell>
                      <TableCell>{m.timestamp_wib.split(' WIB')[0]}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{m.product_name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">SKU-{m.sku}</span>
                          {m.batch_number && (
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600 border-slate-200 uppercase tracking-tighter">Batch: {m.batch_number}</Badge>
                              {m.manufacture_date && (
                                <Badge variant="outline" className="text-[9px] text-blue-600 bg-blue-50 border-blue-200 uppercase tracking-tighter">MFG: {moment(m.manufacture_date).format('DD/MM/YY')}</Badge>
                              )}
                              {m.expiry_date && (
                                <Badge variant="outline" className="text-[9px] text-amber-600 bg-amber-50 border-amber-200 uppercase tracking-tighter">Exp: {moment(m.expiry_date).format('DD/MM/YY')}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {m.movement_type === 'in' ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Masuk</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Keluar</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-600 font-medium">{m.movement_type === 'in' ? `+${m.quantity}` : '-'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-medium">{m.movement_type === 'out' ? `-${m.quantity}` : '-'}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 dark:text-slate-100">
                        {m.running_balance}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {formatCurrency(m.nilai)}
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                            <span className="font-medium text-blue-600 text-xs">{m.source_label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{m.reference}</span>
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
    </div>
  );
}
