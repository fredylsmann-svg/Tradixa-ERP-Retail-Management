import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  FileSignature, ArrowUpRight, ArrowDownRight, 
  Wallet, Settings, Search, Plus, MoreHorizontal, Percent, ArrowRightLeft, Info, Trash2, Edit, Loader2
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { useGlobalDate } from '@/contexts/DateContext';
import ExportToolbar from '@/components/layout/ExportToolbar';

export default function TaxManagement({ store }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();
  const { formattedDate } = useGlobalDate();
  const storeId = store?.id;

  const handleNotReady = (feature) => {
    toast({
      title: "Fitur Belum Tersedia",
      description: `${feature} masih dalam tahap pengembangan dan belum tersinkronisasi ke database utama.`,
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Mock Data for dashboard metrics (will be real later)
  const taxMetrics = {
    ppnKeluaran: 45500000,
    ppnMasukan: 12400000,
    kurangBayar: 33100000,
    trend: '+12.5%'
  };

  // Database-backed tax rates
  const [taxRates, setTaxRates] = useState([]);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTax, setNewTax] = useState({ name: '', rate: '', type: 'Value Added Tax', applied_to: 'Sales' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load tax rates from database
  const loadTaxRates = async () => {
    if (!storeId) return;
    setIsLoadingRates(true);
    try {
      const data = await api.entities.TaxRate.filter({ store_id: storeId }, '-created_at');
      setTaxRates(data || []);
    } catch (err) {
      console.error('[TaxManagement] Failed to load tax rates:', err);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    if (storeId) loadTaxRates();
  }, [storeId]);

  // Seed default tax rates if none exist
  useEffect(() => {
    if (!isLoadingRates && taxRates.length === 0 && storeId) {
      const seedDefaults = async () => {
        const defaults = [
          { name: 'PPN 11%', type: 'Value Added Tax', rate: 11, status: 'active', applied_to: 'Sales, Purchase', store_id: storeId },
          { name: 'PPh 21', type: 'Income Tax', rate: 5, status: 'active', applied_to: 'Payroll, Services', store_id: storeId },
          { name: 'PPh 23', type: 'Income Tax', rate: 2, status: 'active', applied_to: 'Services, Rent', store_id: storeId },
          { name: 'PB1 (Pajak Restoran)', type: 'Local Tax', rate: 10, status: 'inactive', applied_to: 'Sales', store_id: storeId },
        ];
        for (const d of defaults) {
          try { await api.entities.TaxRate.create(d); } catch(e) { console.error(e); }
        }
        await loadTaxRates();
      };
      seedDefaults();
    }
  }, [isLoadingRates, taxRates.length, storeId]);

  const handleAddTax = async () => {
    if(!newTax.name || !newTax.rate) {
       toast({ title: "Error", description: "Nama dan tarif pajak harus diisi.", variant: "destructive" });
       return;
    }
    setIsSaving(true);
    try {
      await api.entities.TaxRate.create({
        ...newTax,
        rate: Number(newTax.rate),
        status: 'active',
        store_id: storeId,
      });
      await loadTaxRates();
      setIsAddModalOpen(false);
      setNewTax({ name: '', rate: '', type: 'Value Added Tax', applied_to: 'Sales' });
      toast({ title: "Berhasil", description: "Tax Rate baru telah ditambahkan." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (tax) => {
    setEditingTax({ ...tax });
    setIsEditModalOpen(true);
  };

  const handleUpdateTax = async () => {
    if(!editingTax.name || !editingTax.rate) {
       toast({ title: "Error", description: "Nama dan tarif pajak harus diisi.", variant: "destructive" });
       return;
    }
    setIsSaving(true);
    try {
      await api.entities.TaxRate.update(editingTax.id, {
        name: editingTax.name,
        rate: Number(editingTax.rate),
        type: editingTax.type,
        applied_to: editingTax.applied_to,
      });
      await loadTaxRates();
      setIsEditModalOpen(false);
      setEditingTax(null);
      toast({ title: "Berhasil", description: "Tax Rate telah diperbarui." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTax = async (id) => {
    try {
      await api.entities.TaxRate.delete(id);
      await loadTaxRates();
      toast({ title: "Dihapus", description: "Tax Rate telah dihapus." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id) => {
    const tax = taxRates.find(t => t.id === id);
    if (!tax) return;
    try {
      await api.entities.TaxRate.update(id, {
        status: tax.status === 'active' ? 'inactive' : 'active'
      });
      await loadTaxRates();
      toast({ title: "Diperbarui", description: "Status Tax Rate telah diubah." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="pt-2 md:pt-4 p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <PageHeader 
        title="Tax Management" 
        subtitle="Kelola tarif pajak terpusat dan pantau ringkasan pajak pertambahan nilai (PPN)."
        icon={FileSignature}
        actions={
          <ExportToolbar
            title="Daftar Tarif Pajak (Tax Rates)"
            date={formattedDate}
            storeName={store?.store_name}
            storeAddress={store?.address}
            storeLogoUrl={store?.logo_url}
            contentId="print-taxes-detailed"
          />
        }
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
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                          <TooltipTrigger asChild>
                            <button type="button" className="focus:outline-none">
                              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                            </button>
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
                          <TooltipTrigger asChild>
                            <button type="button" className="focus:outline-none">
                              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                            </button>
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

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
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
                          <TooltipTrigger asChild>
                            <button type="button" className="focus:outline-none">
                              <Info className="w-4 h-4 text-blue-200 hover:text-white cursor-help" />
                            </button>
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
                    <FileSignature className="w-8 h-8 text-slate-400" />
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
                        <TableCell className="text-slate-500">{tax.applied_to}</TableCell>
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
                          <Button onClick={() => handleToggleStatus(tax.id)} variant="ghost" size="sm" className="text-xs text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 mr-2">
                            Toggle Status
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(tax)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteTax(tax.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      {/* ADD TAX MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Tax Rate</DialogTitle>
            <DialogDescription>
              Buat tarif pajak baru yang akan digunakan pada seluruh transaksi ERP.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Name</label>
              <Input 
                placeholder="e.g. PPN 12%" 
                value={newTax.name}
                onChange={(e) => setNewTax({...newTax, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rate (%)</label>
              <Input 
                type="number"
                placeholder="e.g. 12" 
                value={newTax.rate}
                onChange={(e) => setNewTax({...newTax, rate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Type</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTax.type}
                onChange={(e) => setNewTax({...newTax, type: e.target.value})}
              >
                <option value="Value Added Tax">Value Added Tax</option>
                <option value="Income Tax">Income Tax</option>
                <option value="Local Tax">Local Tax</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Applied To (Modul Terintegrasi)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTax.applied_to}
                onChange={(e) => setNewTax({...newTax, applied_to: e.target.value})}
              >
                <option value="Sales">Modul Penjualan (Sales/AR)</option>
                <option value="Purchase">Modul Pembelian (Purchase/AP)</option>
                <option value="Payroll">Modul Payroll (HRIS)</option>
                <option value="Sales, Purchase">Semua Transaksi Barang (Sales & Purchase)</option>
                <option value="All Modules">Semua Modul</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTax} className="bg-blue-600 hover:bg-blue-700 text-white">Save Tax Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TAX MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tax Rate</DialogTitle>
            <DialogDescription>
              Ubah konfigurasi tarif pajak yang telah ada.
            </DialogDescription>
          </DialogHeader>
          {editingTax && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax Name</label>
                <Input 
                  placeholder="e.g. PPN 12%" 
                  value={editingTax.name}
                  onChange={(e) => setEditingTax({...editingTax, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate (%)</label>
                <Input 
                  type="number"
                  placeholder="e.g. 12" 
                  value={editingTax.rate}
                  onChange={(e) => setEditingTax({...editingTax, rate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingTax.type}
                  onChange={(e) => setEditingTax({...editingTax, type: e.target.value})}
                >
                  <option value="Value Added Tax">Value Added Tax</option>
                  <option value="Income Tax">Income Tax</option>
                  <option value="Local Tax">Local Tax</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Applied To (Modul Terintegrasi)</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingTax.applied_to}
                  onChange={(e) => setEditingTax({...editingTax, applied_to: e.target.value})}
                >
                  <option value="Sales">Modul Penjualan (Sales/AR)</option>
                  <option value="Purchase">Modul Pembelian (Purchase/AP)</option>
                  <option value="Payroll">Modul Payroll (HRIS)</option>
                  <option value="Sales, Purchase">Semua Transaksi Barang (Sales & Purchase)</option>
                  <option value="All Modules">Semua Modul</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTax} className="bg-blue-600 hover:bg-blue-700 text-white">Update Tax Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden table for export */}
      <div id="print-taxes-detailed" className="hidden">
        <div className="mb-4">
          <p><strong>PPN Keluaran:</strong> {formatCurrency(taxMetrics.ppnKeluaran)}</p>
          <p><strong>PPN Masukan:</strong> {formatCurrency(taxMetrics.ppnMasukan)}</p>
          <p><strong>Kurang Bayar PPN:</strong> {formatCurrency(taxMetrics.kurangBayar)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nama Pajak</th>
              <th>Tarif (%)</th>
              <th>Tipe</th>
              <th>Diterapkan Pada</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {taxRates.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.rate}%</td>
                <td>{t.type}</td>
                <td>{t.applied_to}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
