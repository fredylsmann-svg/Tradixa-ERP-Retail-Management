import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, ShoppingCart, DollarSign, Truck, Users, FileText,
  ArrowDown, ArrowRight, CheckCircle2, Database
} from 'lucide-react';

export default function ModuleFlowchart() {
  const modules = [
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Package,
      color: 'blue',
      flow: [
        { step: 'Product Master', desc: 'Kelola data produk, barcode, harga' },
        { step: 'Stock In', desc: 'Catat barang masuk ke gudang' },
        { step: 'Stock Out', desc: 'Catat barang keluar dari gudang' },
        { step: 'Inventory Reports', desc: 'Laporan stok dan nilai inventory' },
        { step: 'Low Stock Alert', desc: 'Peringatan stok menipis' }
      ]
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: ShoppingCart,
      color: 'emerald',
      flow: [
        { step: 'Sales Transaction', desc: 'Proses transaksi penjualan' },
        { step: 'Stock Deduction', desc: 'Pengurangan stok otomatis' },
        { step: 'Invoice Generation', desc: 'Pembuatan invoice penjualan' },
        { step: 'Payment Recording', desc: 'Pencatatan pembayaran' },
        { step: 'Revenue Reports', desc: 'Laporan pendapatan dan profit' }
      ]
    },
    {
      id: 'procurement',
      name: 'Procurement',
      icon: Truck,
      color: 'amber',
      flow: [
        { step: 'Purchase Order', desc: 'Buat pesanan pembelian ke supplier' },
        { step: 'PO Approval', desc: 'Persetujuan purchase order' },
        { step: 'Goods Receipt', desc: 'Terima barang dari supplier' },
        { step: 'Stock Addition', desc: 'Penambahan stok otomatis' },
        { step: 'Payables Creation', desc: 'Pencatatan hutang usaha' }
      ]
    },
    {
      id: 'financial',
      name: 'Financial',
      icon: DollarSign,
      color: 'violet',
      flow: [
        { step: 'Bank Accounts', desc: 'Kelola rekening bank' },
        { step: 'Bank Transactions', desc: 'Catat mutasi bank' },
        { step: 'Payables Management', desc: 'Kelola hutang usaha' },
        { step: 'Receivables Management', desc: 'Kelola piutang usaha' },
        { step: 'Financial Reports', desc: 'Laporan keuangan' }
      ]
    },
    {
      id: 'agent',
      name: 'Agent',
      icon: Users,
      color: 'pink',
      flow: [
        { step: 'Agent Setup', desc: 'Daftarkan agen baru' },
        { step: 'Service Configuration', desc: 'Setup layanan dan fee' },
        { step: 'Agent Transaction', desc: 'Proses transaksi agen' },
        { step: 'Balance Management', desc: 'Kelola saldo agen' },
        { step: 'Fee Reports', desc: 'Laporan fee dan komisi' }
      ]
    }
  ];

  const getColorClasses = (color) => ({
    bg: `bg-${color}-100`,
    text: `text-${color}-700`,
    border: `border-${color}-200`,
    iconBg: `bg-${color}-500`
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Module Flowchart</h1>
        <p className="text-slate-500">Alur kerja detail setiap modul</p>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-slate-100">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <TabsTrigger 
                key={module.id} 
                value={module.id}
                className="flex items-center gap-2 data-[state=active]:bg-white"
              >
                <Icon className="w-4 h-4" />
                {module.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <TabsContent key={module.id} value={module.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${module.color}-500 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {module.name} Module Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {module.flow.map((step, idx) => (
                      <div key={step.step} className="flex items-start gap-4 mb-6 last:mb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full bg-${module.color}-100 flex items-center justify-center text-${module.color}-700 font-bold`}>
                            {idx + 1}
                          </div>
                          {idx < module.flow.length - 1 && (
                            <div className={`w-0.5 h-12 bg-${module.color}-200 mt-2`} />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <h3 className="font-semibold text-slate-800">{step.step}</h3>
                          <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                        </div>
                        <CheckCircle2 className={`w-5 h-5 text-${module.color}-500 mt-2`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Inter-Module Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-xl">
              <h4 className="font-semibold mb-2">Inventory ↔ Sales</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Transaksi penjualan mengurangi stok</li>
                <li>• Alert stok menipis saat penjualan</li>
                <li>• Harga jual dari Product Master</li>
              </ul>
            </div>
            <div className="p-4 border rounded-xl">
              <h4 className="font-semibold mb-2">Procurement ↔ Inventory</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Goods Receipt menambah stok</li>
                <li>• Update harga beli produk</li>
                <li>• Stock movement tercatat</li>
              </ul>
            </div>
            <div className="p-4 border rounded-xl">
              <h4 className="font-semibold mb-2">Sales ↔ Financial</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Penjualan kredit jadi Receivables</li>
                <li>• Cash sales ke Bank Transaction</li>
                <li>• Revenue reports dari transaksi</li>
              </ul>
            </div>
            <div className="p-4 border rounded-xl">
              <h4 className="font-semibold mb-2">Procurement ↔ Financial</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• PO approval jadi Payables</li>
                <li>• Payment dari Bank Account</li>
                <li>• Expense tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
