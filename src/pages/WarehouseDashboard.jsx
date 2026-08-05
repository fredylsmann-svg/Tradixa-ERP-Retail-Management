import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  LayoutDashboard, Package, MapPin, Truck, AlertTriangle, ArrowRightLeft,
  TrendingUp, TrendingDown, Boxes, Warehouse, Activity
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function WarehouseDashboard({ store }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    total_sku: 0,
    total_units: 0,
    total_value: 0,
    low_stock_count: 0,
    pending_transfers: 0,
    today_grn: 0,
    today_outbound: 0,
    today_transfer: 0,
    warehouse_stock: [],
    category_data: [],
    top_products: [],
    locations: [],
    transfers: []
  });

  useEffect(() => {
    if (store?.id) loadAll();
  }, [store?.id]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const { data: rpcRes, error } = await supabase.rpc('get_warehouse_dashboard', {
        p_store_id: store.id,
        p_timezone: userTimezone
      });

      if (error) {
        console.warn('RPC get_warehouse_dashboard not available, falling back:', error.message);
        const [prodData, locData, transferData, outData, grnData] = await Promise.all([
          api.entities.Product.filter({ store_id: store.id }),
          api.entities.ProductLocation.filter({ store_id: store.id }),
          api.entities.WarehouseTransfer?.filter({ store_id: store.id }).catch(() => []),
          api.entities.OutboundDelivery.filter({ store_id: store.id }),
          api.entities.GoodsReceipt.filter({ store_id: store.id })
        ]);
        const prods = prodData || [];
        const today = new Date().toISOString().split('T')[0];
        
        const locs = locData || [];
        const whs = locs.filter(l => l.type === 'store');
        const wStock = whs.map(w => {
          const wProds = prods.filter(p => p.warehouse_name === w.name);
          return {
            name: w.name.length > 15 ? w.name.substring(0, 15) + '...' : w.name,
            fullName: w.name,
            units: wProds.reduce((s, p) => s + (p.stock || 0), 0),
            skus: wProds.length,
            value: wProds.reduce((s, p) => s + ((p.stock || 0) * (p.buy_price || p.price || 0)), 0)
          };
        });

        const cMap = {};
        prods.forEach(p => {
          const c = p.category || 'Lainnya';
          cMap[c] = (cMap[c] || 0) + (p.stock || 0);
        });
        const cData = Object.entries(cMap).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 8);

        setDashboardData({
          total_sku: prods.length,
          total_units: prods.reduce((s, p) => s + (p.stock || 0), 0),
          total_value: prods.reduce((s, p) => s + ((p.stock || 0) * (p.buy_price || p.price || 0)), 0),
          low_stock_count: prods.filter(p => p.stock <= (p.reorder_level || 0)).length,
          pending_transfers: (transferData || []).filter(t => t.status === 'In Transit').length,
          today_grn: (grnData || []).filter(g => g.created_at?.startsWith(today)).length,
          today_outbound: (outData || []).filter(o => o.created_at?.startsWith(today)).length,
          today_transfer: (transferData || []).filter(t => t.created_at?.startsWith(today)).length,
          warehouse_stock: wStock,
          category_data: cData,
          top_products: prods.sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 10),
          locations: locs,
          transfers: transferData || []
        });
      } else if (rpcRes) {
        setDashboardData(rpcRes);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('id-ID').format(v || 0);

  const {
    total_sku: totalSKU, total_units: totalUnits, total_value: totalValue,
    low_stock_count: lowStockCount, pending_transfers: pendingTransfers,
    today_grn: todayGRN, today_outbound: todayOutbound, today_transfer: todayTransfer,
    warehouse_stock: warehouseStock, category_data: categoryData, top_products: topProducts,
    locations, transfers, products
  } = dashboardData;

  const warehouses = locations.filter(l => l.type === 'store');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Warehouse Dashboard"
        subtitle="Monitoring real-time operasional gudang"
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Lokasi', value: warehouses.length, sub: `${locations.filter(l => l.type === 'rack').length} rak`, color: 'from-blue-500 to-blue-700', icon: MapPin },
          { label: 'Total SKU', value: totalSKU, sub: `${formatCurrency(totalUnits)} unit`, color: 'from-emerald-500 to-emerald-700', icon: Package },
          { label: 'Nilai Inventori', value: `Rp ${formatCurrency(totalValue)}`, sub: 'total buy price', color: 'from-violet-500 to-violet-700', icon: Boxes },
          { label: 'Perlu Perhatian', value: lowStockCount + pendingTransfers, sub: `${lowStockCount} low stock, ${pendingTransfers} transit`, color: lowStockCount > 0 ? 'from-red-500 to-red-700' : 'from-slate-400 to-slate-600', icon: AlertTriangle }
        ].map((card, idx) => (
          <Card key={idx} className={`border-none bg-gradient-to-br ${card.color} transition-all hover:-translate-y-1 hover:shadow-xl`}>
            <CardContent className="p-5 relative">
              <div className="absolute right-3 top-3 w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                <card.icon className="w-5 h-5 text-white drop-shadow-md" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/80 pr-12 leading-tight min-h-[32px] sm:min-h-0">{card.label}</p>
              <p className="text-lg sm:text-2xl font-black text-white mt-1 tracking-tight break-words leading-tight sm:truncate">{card.value}</p>
              <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1 truncate">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Today */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Barang Masuk (GRN)', value: todayGRN, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Barang Keluar (Outbound)', value: todayOutbound, icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-100' },
          { label: 'Transfer Hari Ini', value: todayTransfer, icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-100' }
        ].map((item, idx) => (
          <Card key={idx} className={`border ${item.color}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 truncate">{item.label}</p>
                <p className="text-xl font-black text-slate-800">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock per Warehouse Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-blue-500" />
              Stok per Gudang
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warehouseStock.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">Belum ada gudang</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={warehouseStock} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => warehouseStock.find(w => w.name === l)?.fullName || l} />
                  <Bar dataKey="units" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Unit" minPointSize={5} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" />
              Distribusi Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">Belum ada data</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200} className="sm:!w-1/2">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-1.5">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-600 truncate">{cat.name}</span>
                      <span className="ml-auto font-bold text-slate-800 shrink-0">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Activity Table (Replaces Top 10 Products) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            10 Produk dengan Stok Terbanyak
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(topProducts || []).map((p, idx) => {
                const fullProd = products?.find(x => x.id === p.id) || p;
                const wName = p.warehouse_name || fullProd.warehouse_name;
                const lName = p.location_name || fullProd.location_name;
                const displayLocation = wName ? (lName ? `${wName} (${lName})` : wName) : (lName || '-');
                
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800">{p.name}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">{p.sku || '-'}</TableCell>
                    <TableCell className="text-sm">{displayLocation}</TableCell>
                    <TableCell className="text-center font-black text-slate-800">{formatCurrency(p.stock)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">Rp {formatCurrency((p.stock || 0) * (p.buy_price || p.price || 0))}</TableCell>
                  <TableCell>
                    <Badge className={p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= (p.reorder_level || 0) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                      {p.stock === 0 ? 'Habis' : p.stock <= (p.reorder_level || 0) ? 'Low' : 'OK'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {/* Pending Transfers */}
      {transfers.filter(t => t.status === 'In Transit').length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <Truck className="w-5 h-5" />
              Transfer Dalam Perjalanan ({transfers.filter(t => t.status === 'In Transit').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50">
                  <TableHead>No. Transfer</TableHead>
                  <TableHead>Dari → Ke</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.filter(t => t.status === 'In Transit').map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-bold">{t.transfer_number}</TableCell>
                    <TableCell>{t.from_location} → {t.to_location}</TableCell>
                    <TableCell className="text-center font-bold">{t.items?.length || 0}</TableCell>
                    <TableCell className="text-sm text-slate-500">{t.timestamp_wib}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
