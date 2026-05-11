import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Boxes, ClipboardCheck, Warehouse, Activity,
  ShoppingCart, Package, ArrowRight, CheckCircle2, Info,
  ChevronRight, RefreshCw, Workflow, Search, Cpu,
  Settings, Clock, ShieldCheck, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    id: 'product-master',
    title: 'Product Master',
    subtitle: 'Konfigurasi Pelacakan Stok',
    description: 'Atur tipe pelacakan (Standard, Batch, Serial), Shelf Life, dan Issue Method (FIFO/LIFO/FEFO) untuk tiap produk.',
    icon: Boxes,
    gradient: 'from-blue-500 to-blue-600',
    path: '/ProductMaster',
    tip: 'Aktifkan "Track Expiry" dan tentukan default usia simpan dalam hari untuk otomasi peringatan.',
    output: 'Produk siap dilacak secara Enterprise (Batch/Serial)',
    journal: 'N/A (Master Data)',
    subSteps: [
      'Buka profil produk dan atur Tipe Pelacakan',
      'Masukkan batas hari Shelf Life & Reorder Level',
      'Simpan konfigurasi untuk mengunci sistem alokasi'
    ]
  },
  {
    id: 'gr',
    title: 'Goods Receipt',
    subtitle: 'Verifikasi Fisik (Blind Check)',
    description: 'Verifikasi fisik awal atas barang yang tiba dari supplier berdasarkan PO/Surat Jalan. Pada tahap ini, Batch & Expiry belum perlu diinput.',
    icon: ClipboardCheck,
    gradient: 'from-teal-500 to-teal-600',
    path: '/GoodsReceipt',
    tip: 'Pisahkan tanggung jawab: Tim penerima hanya mengecek kuantitas & kondisi fisik kotor.',
    output: 'Bukti terima barang fisik & QC (Draft masuk)',
    journal: 'N/A (Belum di-posting ke Ledger)',
    subSteps: [
      'Pilih dokumen PO yang datang',
      'Hitung fisik vs qty PO secara blind check',
      'Input kondisi reject atau selisih'
    ]
  },
  {
    id: 'igrn',
    title: 'Inventory GRN',
    subtitle: 'Input Batch & Expiry',
    description: 'Tim Gudang Inti memasukkan barang ke sistem Ledger. Jika barang memiliki tipe pelacakan Batch, sistem mewajibkan input Nomor Batch & Tanggal Kedaluwarsa.',
    icon: Warehouse,
    gradient: 'from-orange-500 to-orange-600',
    path: '/InventoryGRN',
    tip: 'Inventory GRN adalah Single Source of Truth. Stok tidak akan bertambah sebelum proses ini diselesaikan.',
    output: 'Stok bertambah + Batch ID terekam di database',
    journal: 'DR Persediaan | CR Hutang Dagang (A/P)',
    subSteps: [
      'Tarik data dari Goods Receipt',
      'Jika produk batch-tracked, alokasikan Nomor Batch & Tanggal Expiry',
      'Posting untuk menambah stok riil dan hutang dagang'
    ]
  },
  {
    id: 'ledger',
    title: 'Inventory Ledger',
    subtitle: 'Kartu Stok Detail',
    description: 'Seluruh riwayat mutasi masuk dan keluar terekam permanen. Setiap baris pergerakan stok untuk barang ber-Batch akan menampilkan badge Nomor Batch & Expiry.',
    icon: Activity,
    gradient: 'from-indigo-500 to-indigo-600',
    path: '/InventoryLedger',
    tip: 'Gunakan filter Tanggal dan Pencarian Batch untuk audit penelusuran (Traceability).',
    output: 'Buku besar tervalidasi dengan audit trail 100%',
    journal: 'Integrasi dengan Buku Besar (GL) per Transaksi',
    subSteps: [
      'Sistem mencatat Stock In saat IGRN diposting',
      'Sistem mencatat Stock Out otomatis saat Sales terjadi',
      'Nilai HPP (COGS) terekam real-time per transaksi'
    ]
  },
  {
    id: 'sales',
    title: 'Sales & POS',
    subtitle: 'Auto-Batch Deduction',
    description: 'Saat kasir membuat transaksi, sistem Batch Engine otomatis mencari batch yang sesuai dengan pengaturan produk (FIFO/LIFO/FEFO) untuk dipotong lebih dulu.',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-emerald-600',
    path: '/SalesTransaction',
    tip: 'Kasir tidak perlu memilih batch secara manual. Otak alokasi berjalan otomatis di belakang layar.',
    output: 'Stok berkurang dari batch terlama secara presisi',
    journal: 'DR Kas/Piutang | CR Pendapatan & DR HPP | CR Persediaan',
    subSteps: [
      'Kasir memasukkan total kuantitas penjualan',
      'Sistem mengecek batch aktif, diurutkan dari Expiry terdekat',
      'Jika 1 batch tidak cukup, sistem akan memecah otomatis ke batch berikutnya'
    ]
  },
  {
    id: 'report',
    title: 'Stock Report',
    subtitle: 'Monitor Expiry & Overstock',
    description: 'Dashboard khusus untuk mengawasi kesehatan stok secara makro. Terdapat tab khusus untuk memantau Batch, Peringatan Kedaluwarsa, dan produk Slow Moving.',
    icon: Package,
    gradient: 'from-violet-500 to-violet-600',
    path: '/StockReport',
    tip: 'Periksa tab "Expiry Monitor" setiap minggu untuk melakukan clearance sale pada barang Near Expiry.',
    output: 'Analitik stok untuk pengambilan keputusan bisnis',
    journal: 'N/A (Laporan Analitik)',
    subSteps: [
      'Pantau Total Valuasi Stok di Tab General',
      'Buka Tab Expiry Monitor untuk melihat barang < 3 Bulan Expired',
      'Buka Tab Slow Moving untuk barang Overstock'
    ]
  },
  {
    id: 'opname',
    title: 'Stock Opname',
    subtitle: 'Akurasi Batch Fisik',
    description: 'Proses audit berkala untuk memastikan jumlah fisik di rak sama dengan data di sistem. Auditor memverifikasi kesesuaian Nomor Batch dan sisa umur simpan barang.',
    icon: RefreshCw,
    gradient: 'from-rose-500 to-rose-600',
    path: '/StockOpname',
    tip: 'Lakukan stock opname parsial (Cycle Count) secara mingguan khusus untuk barang ber-Batch tinggi.',
    output: 'Penyesuaian stok tervalidasi & Laporan Selisih',
    journal: 'DR/CR Persediaan | CR/DR Selisih Inventaris (Variance)',
    subSteps: [
      'Hitung fisik barang per lokasi/rak',
      'Bandingkan dengan sisa kuantitas tiap Batch di sistem',
      'Posting Adjustment jika terdapat selisih fisik'
    ]
  },
  {
    id: 'traceability',
    title: 'Traceability',
    subtitle: 'Pelacakan & Recall',
    description: 'Kemampuan pelacakan end-to-end untuk mengetahui batch tertentu telah terjual ke pelanggan mana saja. Sangat penting untuk penanganan komplain kualitas.',
    icon: Search,
    gradient: 'from-slate-600 to-slate-700',
    path: '/InventoryLedger',
    tip: 'Cukup masukkan Nomor Batch di kolom pencarian Ledger untuk melihat riwayat distribusi lengkap.',
    output: 'Mitigasi risiko penarikan barang yang presisi',
    journal: 'Audit Trail Trail 100% Sesuai Standar Akuntansi',
    subSteps: [
      'Cari Nomor Batch pada Inventory Ledger',
      'Lihat daftar Invoice yang menggunakan batch tersebut',
      'Hubungi pelanggan terkait jika diperlukan penarikan barang'
    ]
  }
];

export default function InventoryWorkflow() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Inventory Workflow</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">SOP Manajemen Stok Enterprise dengan Otomatisasi Batch (FIFO/LIFO/FEFO)</p>
          </div>
        </div>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] uppercase tracking-widest hidden md:inline-flex">
          Enterprise Retail Standard
        </Badge>
      </div>

      {/* FLOWCHART */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" /> Inventory Lifecycle — Standard Operating Procedure
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Alur kerja gudang dari pengaturan master hingga pencatatan transaksi keluar otomatis</p>
        </div>
        <CardContent className="p-10">
          <div className="relative overflow-x-auto lg:overflow-visible pb-4 md:pb-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16 min-w-max lg:min-w-0">
              {steps.map((s, i) => {
                const isEndOfRow = (i + 1) % 4 === 0;
                const isLastItem = i === steps.length - 1;

                return (
                  <div key={s.id} className="relative flex flex-col items-center text-center group">
                    {/* Horizontal Connector Line (Subtle Blue) */}
                    {!isEndOfRow && !isLastItem && (
                      <div className="absolute top-[28px] left-[50%] w-full h-[1.5px] bg-blue-100 dark:bg-blue-900/30 z-0 hidden md:block" />
                    )}

                    {/* Arrow Icon (Subtle Blue) */}
                    {!isEndOfRow && !isLastItem && (
                      <div className="absolute top-[28px] -right-1 translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-blue-200 dark:text-blue-800" />
                      </div>
                    )}

                    {/* Step Number & Icon */}
                    <div className="relative z-10 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/20`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                        {i + 1}
                      </div>
                    </div>

                    {/* Text Labels (Mixed Case) */}
                    <div className="px-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">{s.title}</p>
                      {s.subtitle && <p className="text-[10px] text-slate-400 font-medium mt-1 leading-snug">{s.subtitle}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FEFO AUTO-DEDUCTION GUIDE */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div className="bg-slate-900 dark:bg-black px-6 py-3">
          <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-300" /> Sistem Batch Engine Otomatis (FIFO, LIFO, FEFO)
          </h3>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Sistem gudang Tradixa Management Retail System dirancang dengan "otak" untuk mengatur prioritas barang mana yang harus dikeluarkan lebih dulu tanpa membebani staf kasir atau penjual.
              </p>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Ilustrasi Pemotongan Stok:</p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Misal Gudang memiliki <strong>Paracetamol Sirup</strong> sebanyak 90 botol dari 2 Batch:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800/30">
                    <div>
                      <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase">Batch A (Mendekati Expiry)</p>
                      <p className="text-[10px] text-red-600/80">Sisa 10 Botol • Exp: 1 Bulan lagi</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-none shadow-none">Diprioritaskan</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    <div>
                      <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">Batch B (Stok Baru)</p>
                      <p className="text-[10px] text-emerald-600/80">Sisa 80 Botol • Exp: 2 Tahun lagi</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-none shadow-none">Disimpan</Badge>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 space-y-2">
                    <p>Jika kasir menjual <strong>15 botol</strong>, Batch Engine akan memotong berdasarkan <em>Issue Method</em>:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><span className="font-bold text-blue-600 dark:text-blue-400">FIFO:</span> Memotong 10 dari Batch masuk pertama, 5 dari masuk kedua.</li>
                      <li><span className="font-bold text-indigo-600 dark:text-indigo-400">LIFO:</span> Memotong 15 langsung dari Batch masuk paling akhir (terbaru).</li>
                      <li><span className="font-bold text-emerald-600 dark:text-emerald-400">FEFO:</span> Memotong 10 dari Batch A (Exp terdekat) dan 5 dari Batch B.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-center">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Manfaat Enterprise Batch Management:</h4>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Mencegah Dead Stock (Rugi Basi)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Barang terlama tidak akan tertumpuk di gudang karena sistem "memaksa" pengeluaran stok secara FIFO/FEFO.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Kecepatan Kasir (Seamless POS)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kasir fokus pada pelayanan (quantity) tanpa perlu memikirkan batch mana yang harus dipotong manual.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Audit Trail Sempurna 100%</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Semua jejak pemotongan otomatis terekam permanen di dalam Inventory Ledger per transaksi.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step, index) => (
          <Card key={step.id} className="group hover:shadow-xl transition-all duration-300 border-slate-100 dark:border-slate-800 overflow-hidden dark:hover:shadow-slate-900/20">
            <CardContent className="p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs">
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <div className="flex-grow space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors leading-tight">{step.title}</h3>
                {step.subtitle && <p className="text-xs font-bold text-emerald-600">{step.subtitle}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Sub-steps */}
              {step.subSteps && (
                <div className="mt-4 space-y-1.5">
                  {step.subSteps.map((sub, si) => (
                    <div key={si} className="flex gap-2 items-start">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {si + 1}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Output */}
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-normal">
                      <span className="text-blue-600 font-bold">Output:</span> {step.output}
                    </p>
                  </div>
                </div>

                {/* Accounting Journal Info */}
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-800/50">
                  <div className="flex gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 leading-normal">
                      <span className="font-bold">Accounting:</span> {step.journal}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Tip */}
              <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-900/20 rounded-xl border border-amber-100/50 dark:border-amber-800/50">
                <div className="flex gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 leading-normal">
                    <span className="font-bold">Pro Tip:</span> {step.tip}
                  </p>
                </div>
              </div>

              {/* Button */}
              {step.path && (
                <Button
                  onClick={() => navigate(step.path)}
                  variant="outline"
                  className="w-full mt-4 h-10 rounded-xl font-bold text-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Buka Modul <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
