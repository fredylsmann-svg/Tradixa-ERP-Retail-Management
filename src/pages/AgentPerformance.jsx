import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, DollarSign, Award, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PremiumBarChart } from '@/components/ui/PremiumChart';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';

export default function AgentPerformance({ store }) {
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [agentData, txData] = await Promise.all([
      api.entities.Agent.filter({ store_id: store.id }),
      api.entities.AgentTransaction.filter({ store_id: store.id })
    ]);
    setAgents(agentData);
    setTransactions(txData);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  // Filter transactions by date
  const filteredTransactions = transactions.filter(tx => {
    if (!tx.created_date) return true;
    const txDate = new Date(tx.created_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return (!start || txDate >= start) && (!end || txDate <= end);
  });

  // Calculate agent performance
  const agentPerformance = agents.map(agent => {
    const agentTxs = filteredTransactions.filter(tx => tx.agent_id === agent.id);
    const totalTransactions = agentTxs.length;
    const totalFee = agentTxs.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const totalCommission = agentTxs.reduce((sum, tx) => sum + (tx.commission || 0), 0);
    const totalAmount = agentTxs.reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      ...agent,
      totalTransactions,
      totalFee,
      totalCommission,
      totalAmount,
      earnings: totalFee + totalCommission
    };
  }).sort((a, b) => b.earnings - a.earnings);

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'Active').length;
  const totalEarnings = agentPerformance.reduce((sum, a) => sum + a.earnings, 0);
  const totalTransactionsCount = filteredTransactions.length;

  // Chart data - Top 10 agents by earnings
  const chartData = agentPerformance.slice(0, 10).map(a => ({
    name: a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name,
    earnings: a.earnings
  }));

  // Transaction type distribution
  const txTypeData = {};
  filteredTransactions.forEach(tx => {
    txTypeData[tx.transaction_type] = (txTypeData[tx.transaction_type] || 0) + 1;
  });
  const pieData = Object.entries(txTypeData).map(([type, count]) => ({ name: type, value: count }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToCSV = () => {
    const headers = ['Agen', 'Status', 'Total Transaksi', 'Total Fee', 'Total Komisi', 'Total Pendapatan'];
    const rows = agentPerformance.map(a => [
      a.name, a.status, a.totalTransactions, a.totalFee, a.totalCommission, a.earnings
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performa Agen"
        subtitle="Analisis kinerja dan pendapatan agen"
        icon={TrendingUp}
        actions={
          <PremiumGate feature="Export CSV" iconType="action" store={store}>
            <Button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 font-semibold rounded-xl text-white">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </PremiumGate>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Agen</p>
                <p className="text-2xl font-bold text-slate-800">{totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Agen Aktif</p>
                <p className="text-2xl font-bold text-slate-800">{activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Transaksi</p>
                <p className="text-2xl font-bold text-slate-800">{totalTransactionsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Pendapatan</p>
                <p className="text-xl font-bold text-slate-800">Rp {formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Tanggal Selesai</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Agen Berdasarkan Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
            <PremiumBarChart 
              data={chartData}
              dataKey="revenue"
              layout="vertical"
              height={300}
              color="#3b82f6"
              valuePrefix="Rp "
            />
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Tipe Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Performa Agen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead>Ranking</TableHead>
                <TableHead>Nama Agen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Total Transaksi</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
                <TableHead className="text-right">Total Komisi</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    Belum ada data agen
                  </TableCell>
                </TableRow>
              ) : (
                agentPerformance.map((agent, idx) => (
                  <TableRow key={agent.id}>
                    <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge className={
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-600'
                      }>
                        #{idx + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge className={agent.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{agent.totalTransactions}</TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(agent.totalFee)}</TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(agent.totalCommission)}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">Rp {formatCurrency(agent.earnings)}</TableCell>
                    <TableCell className="text-right">Rp {formatCurrency(agent.balance)}</TableCell>
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
