import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Percent } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import { FileText } from 'lucide-react';

export default function LaporanFee({ store }) {
  const [transactions, setTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7days');

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [txData, servicesData] = await Promise.all([
      api.entities.AgentTransaction.filter({ store_id: store.id }),
      api.entities.AgentService.filter({ store_id: store.id })
    ]);
    setTransactions(txData);
    setServices(servicesData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const totalFee = transactions.reduce((sum, t) => sum + (t.fee || 0), 0);
  const totalCommission = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
  const netProfit = totalFee - totalCommission;

  const getDaysData = (days) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const dayTx = transactions.filter(t => {
        const txDate = new Date(t.created_date);
        return txDate.toDateString() === date.toDateString();
      });
      data.push({
        name: dateStr,
        fee: dayTx.reduce((sum, t) => sum + (t.fee || 0), 0),
        commission: dayTx.reduce((sum, t) => sum + (t.commission || 0), 0)
      });
    }
    return data;
  };

  const chartData = period === '7days' ? getDaysData(7) : period === '14days' ? getDaysData(14) : getDaysData(30);

  const feeByService = services.map(service => {
    const serviceTx = transactions.filter(t => t.service_type === service.name);
    return {
      name: service.name,
      transactions: serviceTx.length,
      totalFee: serviceTx.reduce((sum, t) => sum + (t.fee || 0), 0),
      totalCommission: serviceTx.reduce((sum, t) => sum + (t.commission || 0), 0)
    };
  }).filter(s => s.transactions > 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Fee"
        subtitle="Analisis fee dan komisi agen"
        icon={FileText}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 h-11 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Hari</SelectItem>
              <SelectItem value="14days">14 Hari</SelectItem>
              <SelectItem value="30days">30 Hari</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Fee</p>
                <p className="text-xl font-bold text-emerald-600">Rp {formatCurrency(totalFee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Komisi</p>
                <p className="text-xl font-bold text-blue-600">Rp {formatCurrency(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Net Profit</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Rp {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee vs Komisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <PremiumBarChart 
              data={chartData}
              dataKey="fee"
              height={300}
              color="#10b981"
              valuePrefix="Rp "
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee per Layanan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead className="text-center">Transaksi</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
                <TableHead className="text-right">Total Komisi</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeByService.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Belum ada data fee per layanan
                  </TableCell>
                </TableRow>
              ) : (
                feeByService.map((item, index) => (
                  <TableRow key={item.name}>
                    <TableCell className="text-center text-slate-500 font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.transactions}</TableCell>
                    <TableCell className="text-right text-emerald-600">Rp {formatCurrency(item.totalFee)}</TableCell>
                    <TableCell className="text-right text-blue-600">Rp {formatCurrency(item.totalCommission)}</TableCell>
                    <TableCell className={`text-right font-medium ${item.totalFee - item.totalCommission >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Rp {formatCurrency(item.totalFee - item.totalCommission)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
