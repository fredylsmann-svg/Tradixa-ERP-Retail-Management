import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Package, ShoppingCart, DollarSign, Truck, Users, FileText,
  ArrowDown, ArrowRight, CheckCircle2, Clock, GitBranch, Database,
  Building2, Network, Workflow, BookOpen, AlertCircle, Info
} from 'lucide-react';

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: GitBranch },
  { id: 'system',   label: 'System Flow', icon: Network },
  { id: 'module',   label: 'Module Flow', icon: Workflow },
  { id: 'docs',     label: 'Dokumentasi', icon: BookOpen }
];

// ================ SUBVIEW: OVERVIEW ================
function OverviewTab() {
  const workflows = [
    { title: 'Inventory Management', icon: Package, color: 'bg-blue-500', steps: ['Product Master', 'Stock In', 'Stock Out', 'Inventory Reports'], status: 'active' },
    { title: 'Sales Process', icon: ShoppingCart, color: 'bg-emerald-500', steps: ['Sales Transaction', 'Invoice Generation', 'Payment', 'Reports'], status: 'active' },
    { title: 'Procurement', icon: Truck, color: 'bg-violet-500', steps: ['Purchase Order', 'Goods Receipt', 'Stock Update', 'Payables'], status: 'active' },
    { title: 'Financial Operations', icon: DollarSign, color: 'bg-amber-500', steps: ['Bank Accounts', 'Transactions', 'Payables', 'Receivables'], status: 'active' },
    { title: 'Agent Management', icon: Users, color: 'bg-pink-500', steps: ['Agent Setup', 'Services', 'Transactions', 'Fee Reports'], status: 'active' },
    { title: 'HR Management', icon: Building2, color: 'bg-cyan-500', steps: ['Employee Data', 'Attendance', 'Payroll', 'Reports'], status: 'partial' }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf) => {
          const Icon = wf.icon;
          return (
            <Card key={wf.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${wf.color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
                    <CardTitle className="text-lg">{wf.title}</CardTitle>
                  </div>
                  <Badge className={wf.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {wf.status === 'active' ? <><CheckCircle2 className="w-3 h-3 mr-1" />Active</> : <><Clock className="w-3 h-3 mr-1" />Partial</>}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">{wf.steps.map((step, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${idx === 0 ? wf.color + ' text-white' : 'bg-slate-100 text-slate-600'}`}>{idx + 1}</div>
                    <span className="text-sm text-slate-600">{step}</span>
                    {idx < wf.steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />}
                  </div>
                ))}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5" />System Integration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl"><h3 className="font-semibold text-blue-700 mb-2">Inventory → Sales</h3><p className="text-sm text-blue-600">Stock dikurangi otomatis saat transaksi penjualan</p></div>
            <div className="p-4 bg-emerald-50 rounded-xl"><h3 className="font-semibold text-emerald-700 mb-2">PO → Goods Receipt</h3><p className="text-sm text-emerald-600">Penerimaan barang update stock dan payables</p></div>
            <div className="p-4 bg-violet-50 rounded-xl"><h3 className="font-semibold text-violet-700 mb-2">Sales → Receivables</h3><p className="text-sm text-violet-600">Penjualan kredit masuk ke piutang usaha</p></div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ================ SUBVIEW: SYSTEM FLOWCHART ================
function SystemFlowTab() {
  return (
    <Card>
      <CardHeader><CardTitle>Alur Sistem Utama</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px] p-8">
            <div className="flex justify-center gap-8 mb-8">
              <div className="w-40 p-4 bg-blue-100 rounded-xl text-center"><Package className="w-8 h-8 text-blue-600 mx-auto mb-2" /><p className="font-medium text-blue-800">Product Master</p><p className="text-xs text-blue-600 mt-1">Data Produk</p></div>
              <div className="w-40 p-4 bg-emerald-100 rounded-xl text-center"><Users className="w-8 h-8 text-emerald-600 mx-auto mb-2" /><p className="font-medium text-emerald-800">Suppliers/Customer</p><p className="text-xs text-emerald-600 mt-1">Master Data</p></div>
              <div className="w-40 p-4 bg-violet-100 rounded-xl text-center"><Building2 className="w-8 h-8 text-violet-600 mx-auto mb-2" /><p className="font-medium text-violet-800">Bank Accounts</p><p className="text-xs text-violet-600 mt-1">Keuangan</p></div>
            </div>
            <div className="flex justify-center gap-32 mb-4">
              <ArrowDown className="w-6 h-6 text-slate-400" /><ArrowDown className="w-6 h-6 text-slate-400" /><ArrowDown className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="w-36 p-4 bg-amber-100 rounded-xl text-center"><Truck className="w-6 h-6 text-amber-600 mx-auto mb-2" /><p className="font-medium text-amber-800 text-sm">Purchase Order</p></div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-36 p-4 bg-amber-100 rounded-xl text-center"><Package className="w-6 h-6 text-amber-600 mx-auto mb-2" /><p className="font-medium text-amber-800 text-sm">Goods Receipt</p></div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-36 p-4 bg-blue-100 rounded-xl text-center border-2 border-blue-400"><Database className="w-6 h-6 text-blue-600 mx-auto mb-2" /><p className="font-medium text-blue-800 text-sm">INVENTORY</p></div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-36 p-4 bg-emerald-100 rounded-xl text-center"><ShoppingCart className="w-6 h-6 text-emerald-600 mx-auto mb-2" /><p className="font-medium text-emerald-800 text-sm">Sales Transaction</p></div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-36 p-4 bg-emerald-100 rounded-xl text-center"><FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" /><p className="font-medium text-emerald-800 text-sm">Invoice</p></div>
            </div>
            <div className="flex justify-center gap-[340px] mb-4"><ArrowDown className="w-6 h-6 text-slate-400" /><ArrowDown className="w-6 h-6 text-slate-400" /></div>
            <div className="flex justify-center gap-[280px]">
              <div className="w-40 p-4 bg-red-100 rounded-xl text-center"><DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" /><p className="font-medium text-red-800">Payables</p><p className="text-xs text-red-600 mt-1">Hutang Usaha</p></div>
              <div className="w-40 p-4 bg-green-100 rounded-xl text-center"><DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" /><p className="font-medium text-green-800">Receivables</p><p className="text-xs text-green-600 mt-1">Piutang Usaha</p></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card><CardHeader><CardTitle className="text-lg">Alur Pembelian</CardTitle></CardHeader><CardContent><div className="space-y-4">{['Purchase Order dibuat', 'Supplier mengirim barang', 'Goods Receipt dibuat', 'Stock bertambah', 'Payables dicatat'].map((step, idx) => (<div key={step} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">{idx + 1}</div><span className="text-slate-600">{step}</span></div>))}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Alur Penjualan</CardTitle></CardHeader><CardContent><div className="space-y-4">{['Customer memilih produk', 'Transaksi dibuat', 'Stock berkurang', 'Invoice digenerate', 'Payment diterima'].map((step, idx) => (<div key={step} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">{idx + 1}</div><span className="text-slate-600">{step}</span></div>))}</div></CardContent></Card>
        </div>
      </CardContent>
    </Card>
  );
}

// ================ SUBVIEW: MODULE FLOWCHART ================
function ModuleFlowTab() {
  const [activeModule, setActiveModule] = useState('inventory');
  const modules = [
    { id: 'inventory', name: 'Inventory', icon: Package, color: 'blue', flow: [{ step: 'Product Master', desc: 'Kelola data produk, barcode, harga' }, { step: 'Stock In', desc: 'Catat barang masuk ke gudang' }, { step: 'Stock Out', desc: 'Catat barang keluar dari gudang' }, { step: 'Inventory Reports', desc: 'Laporan stok dan nilai inventory' }, { step: 'Low Stock Alert', desc: 'Peringatan stok menipis' }] },
    { id: 'sales', name: 'Sales', icon: ShoppingCart, color: 'emerald', flow: [{ step: 'Sales Transaction', desc: 'Proses transaksi penjualan' }, { step: 'Stock Deduction', desc: 'Pengurangan stok otomatis' }, { step: 'Invoice Generation', desc: 'Pembuatan invoice penjualan' }, { step: 'Payment Recording', desc: 'Pencatatan pembayaran' }, { step: 'Revenue Reports', desc: 'Laporan pendapatan dan profit' }] },
    { id: 'procurement', name: 'Procurement', icon: Truck, color: 'amber', flow: [{ step: 'Purchase Order', desc: 'Buat pesanan pembelian ke supplier' }, { step: 'PO Approval', desc: 'Persetujuan purchase order' }, { step: 'Goods Receipt', desc: 'Terima barang dari supplier' }, { step: 'Stock Addition', desc: 'Penambahan stok otomatis' }, { step: 'Payables Creation', desc: 'Pencatatan hutang usaha' }] },
    { id: 'financial', name: 'Financial', icon: DollarSign, color: 'violet', flow: [{ step: 'Bank Accounts', desc: 'Kelola rekening bank' }, { step: 'Bank Transactions', desc: 'Catat mutasi bank' }, { step: 'Payables', desc: 'Kelola hutang usaha' }, { step: 'Receivables', desc: 'Kelola piutang usaha' }, { step: 'Financial Reports', desc: 'Laporan keuangan' }] },
    { id: 'agent', name: 'Agent', icon: Users, color: 'pink', flow: [{ step: 'Agent Setup', desc: 'Daftarkan agen baru' }, { step: 'Service Config', desc: 'Setup layanan dan fee' }, { step: 'Transaction', desc: 'Proses transaksi agen' }, { step: 'Balance', desc: 'Kelola saldo agen' }, { step: 'Fee Reports', desc: 'Laporan fee dan komisi' }] }
  ];

  const active = modules.find(m => m.id === activeModule);
  const colorMap = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', violet: 'bg-violet-500', pink: 'bg-pink-500' };
  const colorLightMap = { blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', violet: 'bg-violet-100 text-violet-700', pink: 'bg-pink-100 text-pink-700' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modules.map(m => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => setActiveModule(m.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeModule === m.id ? `${colorMap[m.color]} text-white border-transparent shadow-md` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4" />{m.name}
            </button>
          );
        })}
      </div>
      {active && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colorMap[active.color]} flex items-center justify-center`}><active.icon className="w-5 h-5 text-white" /></div>
              {active.name} Module Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {active.flow.map((step, idx) => (
                <div key={step.step} className="flex items-start gap-4 mb-6 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${colorLightMap[active.color]} flex items-center justify-center font-bold`}>{idx + 1}</div>
                    {idx < active.flow.length - 1 && <div className="w-0.5 h-12 bg-slate-200 mt-2" />}
                  </div>
                  <div className="flex-1 pt-1"><h3 className="font-semibold text-slate-800">{step.step}</h3><p className="text-sm text-slate-500 mt-1">{step.desc}</p></div>
                  <CheckCircle2 className={`w-5 h-5 mt-2 ${active.color === 'blue' ? 'text-blue-500' : active.color === 'emerald' ? 'text-emerald-500' : active.color === 'amber' ? 'text-amber-500' : active.color === 'violet' ? 'text-violet-500' : 'text-pink-500'}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ================ SUBVIEW: DOCS / DESCRIPTION ================
function DocsTab() {
  const workflows = [
    { id: 'inventory', title: 'Inventory Management', icon: Package, color: 'blue', description: 'Modul untuk mengelola seluruh data produk, stok masuk, stok keluar, dan pelaporan inventory.', features: [{ name: 'Product Master', desc: 'Kelola informasi produk termasuk barcode, SKU, kategori, harga beli, harga jual, dan reorder level.' }, { name: 'Stock In', desc: 'Catat barang masuk dengan tipe GRN, Purchase, Return, atau Adjustment.' }, { name: 'Stock Out', desc: 'Catat barang keluar dengan tipe Sales, Damaged, Return, Adjustment, atau Transfer.' }, { name: 'Inventory Reports', desc: 'Lihat laporan nilai inventory, stok per kategori, dan distribusi produk.' }], tips: ['Selalu update stok saat menerima barang', 'Set reorder level yang tepat', 'Rutin cek inventory reports'] },
    { id: 'sales', title: 'Sales Management', icon: ShoppingCart, color: 'emerald', description: 'Modul untuk mengelola transaksi penjualan, invoice, piutang, dan laporan pendapatan.', features: [{ name: 'Sales Transaction', desc: 'Proses penjualan dengan memilih produk, input qty, diskon dan PPN.' }, { name: 'Invoice Generation', desc: 'Invoice otomatis dibuat setelah transaksi dengan detail lengkap.' }, { name: 'Receivable Invoices', desc: 'Kelola piutang dari penjualan kredit.' }, { name: 'Revenue Reports', desc: 'Analisis pendapatan harian, keuntungan, dan trend penjualan.' }], tips: ['Periksa stok sebelum transaksi', 'Selalu cetak invoice untuk customer', 'Monitor piutang secara rutin'] },
    { id: 'procurement', title: 'Procurement', icon: Truck, color: 'amber', description: 'Modul untuk mengelola pembelian dari supplier, penerimaan barang, dan hutang usaha.', features: [{ name: 'Suppliers', desc: 'Kelola data supplier termasuk kontak dan informasi bank.' }, { name: 'Purchase Orders', desc: 'Buat pesanan pembelian ke supplier dengan detail produk dan jumlah.' }, { name: 'Goods Receipt', desc: 'Terima barang sesuai PO, verifikasi qty, stok otomatis bertambah.' }, { name: 'Payables', desc: 'Kelola hutang dari PO, catat pembayaran, tracking jatuh tempo.' }], tips: ['Selalu buat PO sebelum order ke supplier', 'Verifikasi qty saat penerimaan barang', 'Bayar hutang sebelum jatuh tempo'] },
    { id: 'financial', title: 'Financial Operations', icon: DollarSign, color: 'violet', description: 'Modul untuk mengelola rekening bank, transaksi keuangan, hutang dan piutang.', features: [{ name: 'Bank Accounts', desc: 'Kelola rekening bank toko, tracking saldo masing-masing rekening.' }, { name: 'Bank Transactions', desc: 'Catat mutasi debit/kredit setiap rekening bank.' }, { name: 'Payables Management', desc: 'Tracking hutang usaha, pembayaran, dan sisa hutang.' }, { name: 'Receivables Management', desc: 'Tracking piutang usaha.' }], tips: ['Update saldo bank secara rutin', 'Selalu cocokkan dengan rekening koran', 'Monitor arus kas harian'] }
  ];

  return (
    <>
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div><p className="font-medium text-blue-800">Tentang Tradixa Retail Management System</p><p className="text-sm text-blue-600 mt-1">Sistem manajemen retail terintegrasi untuk mengelola inventory, penjualan, pembelian, keuangan, dan agen. Semua modul saling terhubung untuk memberikan data real-time dan akurat.</p></div>
        </CardContent>
      </Card>
      <Accordion type="single" collapsible className="space-y-4">
        {workflows.map((wf) => {
          const Icon = wf.icon;
          const colorBg = wf.color === 'blue' ? 'bg-blue-500' : wf.color === 'emerald' ? 'bg-emerald-500' : wf.color === 'amber' ? 'bg-amber-500' : 'bg-violet-500';
          const colorCheck = wf.color === 'blue' ? 'text-blue-500' : wf.color === 'emerald' ? 'text-emerald-500' : wf.color === 'amber' ? 'text-amber-500' : 'text-violet-500';
          return (
            <AccordionItem key={wf.id} value={wf.id} className="border rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colorBg} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
                  <div className="text-left"><h3 className="font-semibold text-slate-800">{wf.title}</h3><p className="text-sm text-slate-500">{wf.description}</p></div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div><h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" />Fitur</h4>
                    <div className="space-y-3">{wf.features.map((f) => (<div key={f.name} className="flex items-start gap-3"><CheckCircle2 className={`w-5 h-5 ${colorCheck} mt-0.5`} /><div><p className="font-medium text-slate-700">{f.name}</p><p className="text-sm text-slate-500">{f.desc}</p></div></div>))}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl"><h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Tips Penggunaan</h4><ul className="text-sm text-slate-600 space-y-1">{wf.tips.map((tip) => (<li key={tip}>• {tip}</li>))}</ul></div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
}

// ================ MAIN COMPONENT ================
export default function WorkflowSystem() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow System</h1>
          <p className="text-slate-500">Dokumentasi alur kerja, flowchart sistem, dan integrasi antar modul</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {TAB_CONFIG.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'system' && <SystemFlowTab />}
      {tab === 'module' && <ModuleFlowTab />}
      {tab === 'docs' && <DocsTab />}
    </div>
  );
}
