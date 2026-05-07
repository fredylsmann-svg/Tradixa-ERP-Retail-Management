import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Contact, FileInput, ClipboardList, ClipboardCheck, Warehouse,
  ArrowRightLeft, CreditCard, ArrowRight, CheckCircle2, Info,
  ChevronRight, RefreshCw, Workflow, Truck, Send, FileSignature,
  Package, ShieldCheck, FileText, Settings, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';

const steps = [
  {
    id: 'supplier',
    title: 'Supplier Master',
    description: 'Daftarkan mitra supplier Anda untuk manajemen basis data yang terpusat. Setiap supplier memiliki profil lengkap termasuk nomor WhatsApp untuk pengiriman PO digital.',
    icon: Contact,
    gradient: 'from-blue-500 to-blue-600',
    path: '/Suppliers',
    tip: 'Pastikan nomor WhatsApp aktif untuk fitur sharing PO otomatis.',
    output: 'Database Supplier → digunakan oleh PR & PO',
    subSteps: [
      'Input data supplier (nama, alamat, kontak WA, email)',
      'Simpan informasi rekening bank supplier',
      'Data otomatis tersedia di modul PO & PR'
    ]
  },
  {
    id: 'pr',
    title: 'Purchase Requisition',
    description: 'Permintaan pengadaan barang dari divisi/gudang. Dokumen awal sebelum PO dibuat, untuk mapping kebutuhan stok dengan supplier terpilih.',
    icon: FileInput,
    gradient: 'from-indigo-500 to-indigo-600',
    path: '/PurchaseRequisition',
    tip: 'Review daftar kebutuhan stok sebelum membuat Purchase Order resmi.',
    output: 'Daftar kebutuhan → input untuk Purchase Order',
    subSteps: [
      'Pilih produk yang perlu dipesan',
      'Tentukan kuantitas & prioritas',
      'Approve PR untuk dikonversi ke PO'
    ]
  },
  {
    id: 'po',
    title: 'Purchase Order',
    description: 'Buat pesanan resmi ke supplier. PO dikirim via WhatsApp sebagai link digital. Supplier approve harga & item di portal (Fase 1), lalu konfirmasi pengiriman + isi Surat Jalan (Fase 2).',
    icon: ClipboardList,
    gradient: 'from-violet-500 to-violet-600',
    path: '/PurchaseOrders',
    tip: 'PO adalah dokumen komersial — harga & item. Detail pengiriman diisi supplier di portal terpisah (Fase 2).',
    output: 'PO resmi → dikirim ke supplier via WhatsApp',
    subSteps: [
      'Buat PO → pilih supplier, item, harga, requested arrival date',
      'Kirim link PO ke supplier via WhatsApp → status: Sent',
      'Template PO: hanya menampilkan Requested Arrival Date (tanpa Ship Via)'
    ]
  },
  {
    id: 'portal-phase1',
    title: 'Portal Supplier — Fase 1',
    subtitle: 'Persetujuan Harga',
    description: 'Supplier membuka link PO, verifikasi nomor HP, lalu review item & harga. Bisa negosiasi harga (opsional). Tanda tangan digital → status PO menjadi Approved.',
    icon: FileSignature,
    gradient: 'from-emerald-500 to-emerald-600',
    path: null,
    tip: 'Fase 1 hanya untuk persetujuan komersial (harga & item). Belum ada detail pengiriman.',
    output: 'PO Approved → supplier setuju harga & item',
    subSteps: [
      'Supplier buka link → verifikasi nomor HP',
      'Review Section 1 (Item Pesanan) & Section 2 (Negosiasi Harga)',
      'Tanda tangan digital persetujuan harga → status: Approved',
      'Halaman sukses: Download PO + tombol "Isi Detail Pengiriman"'
    ],
    isPortal: true,
    phaseLabel: 'FASE 1'
  },
  {
    id: 'portal-phase2',
    title: 'Portal Supplier — Fase 2',
    subtitle: 'Konfirmasi Pengiriman',
    description: 'Saat barang siap kirim, supplier kembali ke portal dan mengisi detail pengiriman: No. Surat Jalan, driver, kendaraan, ekspedisi, tracking. Tanda tangan → status In Transit.',
    icon: Truck,
    gradient: 'from-amber-500 to-amber-600',
    path: null,
    tip: 'Surat Jalan (SJ) adalah milik supplier. Sistem Tradixa hanya menerima & me-reference nomor SJ supplier.',
    output: 'Status: In Transit → No. SJ Supplier tercatat',
    subSteps: [
      'Supplier buka link lagi → otomatis masuk Fase 2',
      'Isi Section 3: metode kirim, No. SJ Supplier, driver, kendaraan, tracking',
      'Tanda tangan digital konfirmasi pengiriman → status: In Transit',
      'Halaman sukses: Download PO + Download Surat Jalan'
    ],
    isPortal: true,
    phaseLabel: 'FASE 2'
  },
  {
    id: 'gr',
    title: 'Goods Receipt',
    description: 'Verifikasi fisik barang yang datang. No. Surat Jalan supplier otomatis terisi dari PO. Cocokkan jumlah fisik dengan SJ, catat kondisi barang & QC.',
    icon: ClipboardCheck,
    gradient: 'from-teal-500 to-teal-600',
    path: '/GoodsReceipt',
    tip: 'Field Surat Jalan otomatis terisi dari konfirmasi supplier. GRN hanya untuk verifikasi penerimaan fisik.',
    output: 'Bukti terima barang → input untuk Inventory GRN',
    subSteps: [
      'Pilih PO → SJ, driver, kendaraan auto-fill dari supplier',
      'Verifikasi qty fisik vs qty order per item',
      'Input QC status, kondisi barang, reject qty',
      'Simpan GRN → cetak GRN Note'
    ]
  },
  {
    id: 'igrn',
    title: 'Inventory GRN',
    description: 'Proses stok masuk ke rak gudang. Nilai stok bertambah dan hutang supplier (Account Payable) diakui secara otomatis oleh sistem.',
    icon: Warehouse,
    gradient: 'from-orange-500 to-orange-600',
    path: '/InventoryGRN',
    tip: 'Pada tahap ini, nilai stok bertambah dan hutang supplier diakui sistem secara otomatis.',
    output: 'Stok bertambah + Hutang supplier tercatat otomatis',
    subSteps: [
      'Posting GRN ke Inventory Ledger',
      'Stok produk bertambah di warehouse',
      'Account Payable (hutang) tercatat otomatis',
      'Journal Entry debit Inventory, kredit AP'
    ]
  },
  {
    id: 'return',
    title: 'Supplier Return',
    description: 'Klaim barang rusak atau tidak sesuai melalui portal review supplier. Retur mengurangi hutang dan menyesuaikan stok.',
    icon: ArrowRightLeft,
    gradient: 'from-red-500 to-red-600',
    path: '/SupplierReturn',
    tip: 'Refund dari supplier otomatis tercatat di mutasi bank.',
    output: 'Retur barang → pengurangan hutang otomatis',
    subSteps: [
      'Buat claim retur → pilih GRN & item',
      'Supplier review via portal',
      'Hutang dikurangi otomatis'
    ]
  },
  {
    id: 'ap',
    title: 'Account Payable',
    description: 'Pelunasan hutang ke supplier dan sinkronisasi laporan keuangan. Pembayaran dicatat dengan Journal Entry otomatis.',
    icon: CreditCard,
    gradient: 'from-blue-600 to-blue-700',
    path: '/Payables',
    tip: 'Lakukan pembayaran sebelum jatuh tempo untuk menjaga performa supplier.',
    output: 'Hutang lunas → Journal Entry otomatis',
    subSteps: [
      'Review daftar hutang jatuh tempo',
      'Lakukan pembayaran (transfer/tunai)',
      'Journal Entry: debit AP, kredit Bank/Cash'
    ]
  }
];

// Status flow data
const statusFlow = [
  { label: 'Draft', color: 'bg-slate-400', desc: 'PO baru dibuat' },
  { label: 'Sent', color: 'bg-blue-500', desc: 'Dikirim via WA' },
  { label: 'Negotiation', color: 'bg-amber-400', desc: 'Supplier negosiasi' },
  { label: 'Approved', color: 'bg-emerald-500', desc: 'Fase 1 selesai' },
  { label: 'In Transit', color: 'bg-amber-500', desc: 'Fase 2 — barang dikirim' },
  { label: 'Confirmed', color: 'bg-blue-600', desc: 'Admin TTD' },
  { label: 'Fully Received', color: 'bg-emerald-600', desc: 'GRN selesai' },
];

export default function ProcurementWorkflow() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Procurement Workflow</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alur pengadaan barang terintegrasi dari supplier hingga pembayaran</p>
          </div>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-widest">
          Enterprise Retail Standard
        </Badge>
      </div>

      {/* FLOWCHART */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-violet-400" /> Procurement Lifecycle — Standard Operating Procedure
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Alur kerja pengadaan barang dari pendaftaran supplier hingga pelunasan hutang dagang</p>
        </div>
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute top-7 left-[calc(5.55%)] right-[calc(5.55%)] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 via-emerald-200 via-amber-200 to-blue-200 z-0 hidden lg:block" />
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 md:gap-0">
              {steps.map((s, i) => (
                <div key={s.id} className="relative flex flex-col items-center text-center group">
                  {i < steps.length - 1 && (
                    <div className="absolute top-[28px] right-0 translate-x-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="relative z-10 mb-2">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg transition-all duration-300 ${s.isPortal ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-amber-300' : ''}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[9px] font-black text-slate-700 dark:text-slate-300 shadow-sm">
                      {i + 1}
                    </div>
                    {s.phaseLabel && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {s.phaseLabel}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">{s.title.split('—')[0].trim()}</p>
                  {s.subtitle && <p className="text-[8px] text-amber-600 font-bold">{s.subtitle}</p>}
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 px-0.5 hidden md:block">{s.description.split('.')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PO STATUS FLOW */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 px-6 py-3">
          <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> PO Status Lifecycle
          </h3>
        </div>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            {statusFlow.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{s.label}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">{s.desc}</p>
                  </div>
                </div>
                {i < statusFlow.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 flex gap-2">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              <strong>Surat Jalan = milik Supplier.</strong> Supplier mengisi No. SJ mereka di portal (Fase 2). Sistem Tradixa hanya menerima & me-reference nomor SJ supplier. GRN otomatis terisi dari data supplier.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ENTERPRISE WORKFLOW CONFIG INFO */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Konfigurasi Enterprise Workflow — Aktif
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Pengaturan mode negosiasi dan persetujuan yang berlaku saat ini</p>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Negotiation Mode Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mode Negosiasi Harga</p>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {settings.negotiationMode === 'Total' ? 'Mode B: Grand Total Counter Offer' : 'Mode A: Per Item Counter Offer'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {settings.negotiationMode === 'Total' 
                  ? 'Supplier hanya menawar total harga akhir dokumen PO.' 
                  : 'Supplier bisa menawar harga satuan untuk setiap produk di portal.'}
              </p>
            </div>

            {/* Warehouse Approval Mode Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mode Persetujuan Gudang</p>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {settings.warehouseApprovalMode === 'Dual' ? 'Dual Signature (Enterprise)' : 'Single Signature (Standar)'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {settings.warehouseApprovalMode === 'Dual' 
                  ? 'Memerlukan tanda tangan Admin Gudang + Manajer Gudang untuk posting stok.' 
                  : 'Hanya perlu tanda tangan Admin Gudang untuk posting stok GRN.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <div className="flex gap-2 items-center">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                Ubah konfigurasi ini di <strong>Company Settings</strong> untuk menyesuaikan alur kerja procurement.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/CompanySettings')}
              className="ml-4 shrink-0 h-8 text-xs font-bold rounded-lg border-blue-200 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/40"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Atur di Company Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step, index) => (
          <Card key={step.id} className={`group hover:shadow-xl transition-all duration-300 border-slate-100 dark:border-slate-800 overflow-hidden ${step.isPortal ? 'dark:hover:shadow-amber-900/10 ring-1 ring-amber-100 dark:ring-amber-800/50' : 'dark:hover:shadow-slate-900/20'}`}>
            <CardContent className="p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  {step.isPortal && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black text-[9px] uppercase tracking-widest">{step.phaseLabel}</Badge>
                  )}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs">
                  {index + 1}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-grow space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors leading-tight">{step.title}</h3>
                {step.subtitle && <p className="text-xs font-bold text-amber-600">{step.subtitle}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Sub-steps */}
              {step.subSteps && (
                <div className="mt-4 space-y-1.5">
                  {step.subSteps.map((sub, si) => (
                    <div key={si} className="flex gap-2 items-start">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black ${step.isPortal ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                        {si + 1}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Output */}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-normal">
                    <span className="text-emerald-600 font-bold">Output:</span> {step.output}
                  </p>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="mt-3 p-3 bg-blue-50/60 dark:bg-blue-900/20 rounded-xl border border-blue-100/50 dark:border-blue-800/50">
                <div className="flex gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 leading-normal">
                    <span className="font-bold">Pro Tip:</span> {step.tip}
                  </p>
                </div>
              </div>

              {/* Button */}
              {step.path ? (
                <Button 
                  onClick={() => navigate(step.path)}
                  variant="outline"
                  className="w-full mt-4 h-10 rounded-xl font-bold text-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Buka Modul <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <div className="mt-4 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 text-center">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                    <Send className="w-3 h-3" />
                    Akses via link WA yang dikirim ke supplier
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FOOTER CTA */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 overflow-hidden relative">
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Otomatisasi Finansial</h2>
                <p className="text-blue-200 text-sm mt-1 max-w-xl">
                  Setiap Inventory GRN yang selesai akan otomatis mencatat hutang dagang (Account Payable) di modul keuangan. Surat Jalan supplier ter-reference di seluruh alur.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/InventoryGRN')} className="bg-white text-blue-600 hover:bg-blue-50 font-bold h-10 px-6 rounded-xl shadow-lg">
                Cek IGRN
              </Button>
              <Button onClick={() => navigate('/Payables')} variant="ghost" className="text-white hover:bg-white/10 font-bold h-10 px-6 rounded-xl border border-white/20">
                Daftar Hutang
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full -ml-24 -mb-24 blur-3xl" />
      </Card>
    </div>
  );
}
