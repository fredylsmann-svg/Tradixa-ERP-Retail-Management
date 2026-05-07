import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Package, ShoppingCart, DollarSign, Truck, Users, FileText,
  CheckCircle2, AlertCircle, Info, BookOpen
} from 'lucide-react';

export default function WorkflowDescription() {
  const workflows = [
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: Package,
      color: 'blue',
      description: 'Modul untuk mengelola seluruh data produk, stok masuk, stok keluar, dan pelaporan inventory.',
      features: [
        { name: 'Product Master', desc: 'Kelola informasi produk termasuk barcode, SKU, kategori, harga beli, harga jual, dan reorder level.' },
        { name: 'Stock In', desc: 'Catat barang masuk dengan tipe GRN, Purchase, Return, atau Adjustment. Stok otomatis bertambah.' },
        { name: 'Stock Out', desc: 'Catat barang keluar dengan tipe Sales, Damaged, Return, Adjustment, atau Transfer. Stok otomatis berkurang.' },
        { name: 'Inventory Reports', desc: 'Lihat laporan nilai inventory, stok per kategori, dan distribusi produk.' },
        { name: 'Low Stock Alert', desc: 'Peringatan otomatis untuk produk dengan stok di bawah reorder level.' }
      ],
      tips: ['Selalu update stok saat menerima barang', 'Set reorder level yang tepat untuk menghindari kehabisan stok', 'Rutin cek inventory reports untuk monitoring']
    },
    {
      id: 'sales',
      title: 'Sales Management',
      icon: ShoppingCart,
      color: 'emerald',
      description: 'Modul untuk mengelola transaksi penjualan, invoice, piutang, dan laporan pendapatan.',
      features: [
        { name: 'Sales Transaction', desc: 'Proses penjualan dengan memilih produk, input qty, tambah diskon dan PPN, pilih metode pembayaran.' },
        { name: 'Invoice Generation', desc: 'Invoice otomatis dibuat setelah transaksi dengan detail lengkap.' },
        { name: 'Receivable Invoices', desc: 'Kelola piutang dari penjualan kredit, terima pembayaran bertahap.' },
        { name: 'Revenue Reports', desc: 'Analisis pendapatan harian, keuntungan, dan trend penjualan.' }
      ],
      tips: ['Periksa stok sebelum transaksi', 'Selalu cetak invoice untuk customer', 'Monitor piutang secara rutin']
    },
    {
      id: 'procurement',
      title: 'Procurement',
      icon: Truck,
      color: 'amber',
      description: 'Modul untuk mengelola pembelian dari supplier, penerimaan barang, dan hutang usaha.',
      features: [
        { name: 'Suppliers', desc: 'Kelola data supplier termasuk kontak, alamat, dan informasi bank.' },
        { name: 'Purchase Orders', desc: 'Buat pesanan pembelian ke supplier dengan detail produk dan jumlah.' },
        { name: 'Goods Receipt', desc: 'Terima barang sesuai PO, verifikasi qty, stok otomatis bertambah.' },
        { name: 'Payables', desc: 'Kelola hutang dari PO, catat pembayaran, tracking jatuh tempo.' }
      ],
      tips: ['Selalu buat PO sebelum order ke supplier', 'Verifikasi qty saat penerimaan barang', 'Bayar hutang sebelum jatuh tempo']
    },
    {
      id: 'financial',
      title: 'Financial Operations',
      icon: DollarSign,
      color: 'violet',
      description: 'Modul untuk mengelola rekening bank, transaksi keuangan, hutang dan piutang.',
      features: [
        { name: 'Bank Accounts', desc: 'Kelola rekening bank toko, tracking saldo masing-masing rekening.' },
        { name: 'Bank Transactions', desc: 'Catat mutasi debit/kredit setiap rekening bank.' },
        { name: 'Payables Management', desc: 'Tracking hutang usaha, pembayaran, dan sisa hutang.' },
        { name: 'Receivables Management', desc: 'Tracking piutang usaha, penerimaan pembayaran, dan sisa piutang.' }
      ],
      tips: ['Update saldo bank secara rutin', 'Selalu cocokkan dengan rekening koran', 'Monitor arus kas harian']
    },
    {
      id: 'agent',
      title: 'Financial Agent',
      icon: Users,
      color: 'pink',
      description: 'Modul untuk mengelola agen keuangan, layanan PPOB, saldo dan fee.',
      features: [
        { name: 'Agent Setup', desc: 'Daftarkan agen baru dengan informasi lengkap dan rate komisi.' },
        { name: 'Service Configuration', desc: 'Setup layanan (pulsa, listrik, dll) dengan fee dan komisi.' },
        { name: 'Agent Transactions', desc: 'Proses transaksi deposit, withdrawal, dan layanan.' },
        { name: 'Balance Management', desc: 'Top up dan tarik saldo agen, tracking balance.' },
        { name: 'Fee Reports', desc: 'Laporan fee dan komisi per layanan dan per agen.' }
      ],
      tips: ['Pastikan saldo agen cukup sebelum transaksi', 'Set fee dan komisi yang kompetitif', 'Monitor performa agen']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Workflow Description</h1>
        <p className="text-slate-500">Dokumentasi lengkap alur kerja sistem</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Tentang Tradixa Retail Management System</p>
            <p className="text-sm text-blue-600 mt-1">
              Sistem manajemen retail terintegrasi untuk mengelola inventory, penjualan, pembelian, keuangan, dan agen.
              Semua modul saling terhubung untuk memberikan data real-time dan akurat.
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <AccordionItem key={workflow.id} value={workflow.id} className="border rounded-xl overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${workflow.color}-500 flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">{workflow.title}</h3>
                    <p className="text-sm text-slate-500">{workflow.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Fitur
                    </h4>
                    <div className="space-y-3">
                      {workflow.features.map((feature) => (
                        <div key={feature.name} className="flex items-start gap-3">
                          <CheckCircle2 className={`w-5 h-5 text-${workflow.color}-500 mt-0.5`} />
                          <div>
                            <p className="font-medium text-slate-700">{feature.name}</p>
                            <p className="text-sm text-slate-500">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 bg-${workflow.color}-50 rounded-xl`}>
                    <h4 className={`font-semibold text-${workflow.color}-700 mb-2 flex items-center gap-2`}>
                      <AlertCircle className="w-4 h-4" />
                      Tips Penggunaan
                    </h4>
                    <ul className={`text-sm text-${workflow.color}-600 space-y-1`}>
                      {workflow.tips.map((tip) => (
                        <li key={tip}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
