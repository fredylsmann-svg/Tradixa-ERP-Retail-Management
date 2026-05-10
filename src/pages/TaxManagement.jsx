import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Calculator, Receipt, ArrowUpRight, ArrowDownRight, 
  Wallet, Settings, Search, Plus, MoreHorizontal, Percent, ArrowRightLeft, Info
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

export default function TaxManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  const handleNotReady = (feature) => {
    toast({
      title: "Fitur Belum Tersedia",
      description: `${feature} masih dalam tahap pengembangan dan belum tersinkronisasi ke database utama.`,
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Mock Data
  const taxMetrics = {
    ppnKeluaran: 45500000,
    ppnMasukan: 12400000,
    kurangBayar: 33100000,
    trend: '+12.5%'
  };

  const taxRates = [
    { id: 1, name: 'PPN 11%', type: 'Value Added Tax', rate: 11, status: 'active', appliedTo: 'Sales, Purchase' },
    { id: 2, name: 'PPh 21', type: 'Income Tax', rate: 5, status: 'active', appliedTo: 'Payroll, Services' },
    { id: 3, name: 'PPh 23', type: 'Income Tax', rate: 2, status: 'active', appliedTo: 'Services, Rent' },
    { id: 4, name: 'PB1 (Pajak Restoran)', type: 'Local Tax', rate: 10, status: 'inactive', appliedTo: 'Sales' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <PageHeader 
        title="Tax Management" 
        subtitle="Manage centralized tax rates and monitor value added tax summaries."
        icon={Calculator}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
          <TabsList className="bg-transparent border-none">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-6"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Rekap PPN
            </TabsTrigger>
            <TabsTrigger 
              value="setup"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-6"
            >
              <Settings className="w-4 h-4 mr-2" />
              Tax Rates
            </TabsTrigger>
          </TabsList>

          {activeTab === 'setup' && (
            <Button onClick={() => handleNotReady('New Tax Rate')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
              <Plus className="w-4 h-4 mr-2" /> New Tax Rate
            </Button>
          )}
        </div>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6 outline-none">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white dark:bg-slate-900 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">PPN Keluaran (Sales VAT)</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data mock. Akan ditarik dari pajak transaksi modul Sales Invoices.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {formatCurrency(taxMetrics.ppnKeluaran)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> 8.2%
                  </Badge>
                  <span className="text-slate-400 ml-2">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">PPN Masukan (Purchase VAT)</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data mock. Akan ditarik dari pajak transaksi modul Payable Invoices/PO.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {formatCurrency(taxMetrics.ppnMasukan)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ArrowDownRight className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> 4.1%
                  </Badge>
                  <span className="text-slate-400 ml-2">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-[0_8px_30px_rgb(37,99,235,0.3)]">
              {/* Decorative background shapes */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              
              <CardContent className="p-6 relative z-10 text-white">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-blue-100">PPN Kurang Bayar (Payable)</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-blue-200 hover:text-white" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data mock. Hasil selisih PPN Keluaran dikurangi PPN Masukan bulan ini.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-3xl font-black tracking-tight drop-shadow-md">
                      {formatCurrency(taxMetrics.kurangBayar)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <div className="bg-white/20 rounded-lg px-2 py-1 backdrop-blur-md text-white font-medium border border-white/10 text-xs flex items-center">
                    Due in 14 days
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphical Representation or Breakdown */}
          <Card className="bg-white dark:bg-slate-900 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <CardHeader>
              <CardTitle>Recent Tax Transactions</CardTitle>
              <CardDescription>Latest invoices and bills generating tax entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Receipt className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Connect to Sales & Purchasing modules to see transaction breakdown.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETUP TAB */}
        <TabsContent value="setup" className="space-y-6 outline-none">
          <Card className="bg-white dark:bg-slate-900 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle>Global Tax Rates</CardTitle>
                <CardDescription>Configure standard tax rates used across the entire ERP system.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search tax name..." className="pl-9 bg-slate-50 dark:bg-slate-800 border-none" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow className="border-slate-100 dark:border-slate-800">
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Tax Name</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Rate</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Type</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Applied To</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates.map((tax) => (
                      <TableRow key={tax.id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tax.status === 'active' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
                              <Percent className="w-4 h-4" />
                            </div>
                            {tax.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{tax.rate}%</span>
                        </TableCell>
                        <TableCell className="text-slate-500">{tax.type}</TableCell>
                        <TableCell className="text-slate-500">{tax.appliedTo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize rounded-full ${
                            tax.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                              : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                          }`}>
                            {tax.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button onClick={() => handleNotReady('Pengaturan Pajak')} variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleNotReady('Opsi Lainnya')} variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
