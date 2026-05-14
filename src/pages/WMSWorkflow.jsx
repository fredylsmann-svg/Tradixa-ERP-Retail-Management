import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  MapPin, Warehouse, LayoutDashboard, ClipboardList, Truck, ArrowRightLeft,
  RefreshCw, Workflow, ChevronRight, ArrowRight, Info, CheckCircle2,
  Activity, DollarSign, Package, ShieldCheck, Clock, Cpu, Lightbulb,
  Layers, Target, Boxes
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const wmsSteps = [
  {
    id: 'location-setup',
    title: 'Location Settings',
    subtitle: 'Konfigurasi Gudang & Rak',
    description: 'Definisikan struktur gudang: lokasi toko/gudang utama dan rak penyimpanan. Setiap produk akan terikat pada lokasi fisiknya.',
    icon: MapPin,
    gradient: 'from-blue-500 to-blue-600',
    path: '/ProductLocations',
    tip: 'Gunakan penamaan rak yang konsisten (contoh: RAK-A01, RAK-B02) agar mudah dilacak saat picking.',
    output: 'Peta lokasi gudang lengkap untuk navigasi staf',
    journal: 'N/A (Master Data)',
    subSteps: [
      'Buat lokasi tipe "Toko/Gudang" untuk setiap cabang',
      'Tambahkan rak/zona penyimpanan per gudang',
      'Atur kapasitas dan tipe barang per rak (opsional)'
    ]
  },
  {
    id: 'putaway',
    title: 'Putaway (IGRN)',
    subtitle: 'Penempatan Barang ke Rak',
    description: 'Saat barang diterima via Inventory GRN, sistem memberikan saran rak penempatan (Putaway Suggestion) berdasarkan histori kategori produk sejenis. Staf gudang tinggal klik untuk apply.',
    icon: Warehouse,
    gradient: 'from-teal-500 to-teal-600',
    path: '/InventoryGRN',
    tip: 'Putaway Suggestion akan muncul otomatis sebagai badge kuning "💡 Disarankan: [nama rak]". Klik untuk langsung apply.',
    output: 'Barang tersimpan di rak optimal + terekam di Ledger',
    journal: 'DR Persediaan | CR Hutang Dagang (A/P)',
    subSteps: [
      'Pilih Procurement GRN yang akan diproses',
      'Pilih gudang tujuan penyimpanan',
      'Lihat Putaway Suggestion dan klik untuk apply',
      'Post ke Inventory Ledger'
    ]
  },
  {
    id: 'dashboard',
    title: 'Warehouse Dashboard',
    subtitle: 'Monitoring Real-Time',
    description: 'Pusat kontrol gudang dengan KPI cards, grafik stok per gudang, distribusi kategori, dan alert transfer yang sedang dalam perjalanan.',
    icon: LayoutDashboard,
    gradient: 'from-violet-500 to-violet-600',
    path: '/WarehouseDashboard',
    tip: 'Cek dashboard setiap pagi untuk melihat ringkasan aktivitas hari sebelumnya dan transfer yang pending.',
    output: 'Visibilitas 360° terhadap seluruh operasi gudang',
    journal: 'N/A (Dashboard Analitik)',
    subSteps: [
      'Pantau KPI: total lokasi, SKU, nilai inventori',
      'Lihat distribusi stok per gudang via bar chart',
      'Monitor transfer "In Transit" yang belum diterima',
      'Identifikasi produk low stock dari tabel Top 10'
    ]
  },
  {
    id: 'pick-list',
    title: 'Pick List',
    subtitle: 'Batch Picking Multi-Order',
    description: 'Gabungkan beberapa order Outbound Delivery menjadi satu daftar pengambilan barang. Sistem akan mengonsolidasikan produk yang sama dari order berbeda, lengkap dengan lokasi rak.',
    icon: ClipboardList,
    gradient: 'from-amber-500 to-amber-600',
    path: '/PickList',
    tip: 'Buat pick list di awal shift agar picker bisa mengambil barang sekaligus untuk semua order, bukan satu per satu.',
    output: 'Daftar picking terkonsolidasi dengan lokasi rak',
    journal: 'N/A (Dokumen Operasional)',
    subSteps: [
      'Pilih beberapa Outbound Order berstatus "Pending"',
      'Sistem otomatis konsolidasi produk yang sama',
      'Tugaskan picker (staff gudang) untuk menjalankan',
      'Tandai selesai setelah semua barang diambil'
    ]
  },
  {
    id: 'outbound',
    title: 'Outbound Delivery',
    subtitle: 'Pengiriman ke Pelanggan',
    description: 'Proses akhir logistik keluar: pack barang yang sudah di-pick, buat surat jalan, dan catat biaya pengiriman. Sistem otomatis membuat entri Expense dan Receivable.',
    icon: Truck,
    gradient: 'from-rose-500 to-rose-600',
    path: '/OutboundDelivery',
    tip: 'Gunakan fitur "Alokasi Ongkir" untuk menentukan apakah ongkos kirim ditanggung toko (Expense) atau pelanggan (Receivable).',
    output: 'Barang terkirim + jurnal akuntansi otomatis',
    journal: 'DR Biaya Kirim / Piutang | CR Kas / Pendapatan',
    subSteps: [
      'Buat delivery order dari order yang sudah di-pick',
      'Input data pengiriman: kurir, ongkir, resi',
      'Tentukan alokasi biaya (toko/customer)',
      'Kirim — sistem auto-create Expense / Receivable'
    ]
  },
  {
    id: 'transfer',
    title: 'Transfer Gudang',
    subtitle: 'Pemindahan Antar Lokasi',
    description: 'Pindahkan stok dari satu gudang/cabang ke yang lain dengan workflow 3-tahap: Draft → In Transit → Received. Setiap transfer terekam dengan audit trail lengkap.',
    icon: ArrowRightLeft,
    gradient: 'from-indigo-500 to-indigo-600',
    path: '/WarehouseTransfer',
    tip: 'Pastikan gudang tujuan melakukan konfirmasi "Terima" agar lokasi produk ter-update di sistem secara akurat.',
    output: 'Stok berpindah lokasi dengan jejak pergerakan penuh',
    journal: 'Perpindahan Aset Internal (No P&L Impact)',
    subSteps: [
      'Buat Transfer Order dan pilih gudang asal → tujuan',
      'Tambahkan item beserta kuantitas transfer',
      'Kirim (status: In Transit)',
      'Gudang tujuan konfirmasi "Terima" untuk finalisasi'
    ]
  },
  {
    id: 'stock-opname',
    title: 'Stock Opname',
    subtitle: 'Cycle Count & Verifikasi',
    description: 'Audit fisik berkala untuk memastikan jumlah dan kondisi barang di rak sesuai dengan data sistem. Selisih akan di-adjust otomatis ke Inventory Ledger.',
    icon: RefreshCw,
    gradient: 'from-slate-600 to-slate-700',
    path: '/StockOpname',
    tip: 'Lakukan cycle count mingguan per zona rak, bukan full opname bulanan. Lebih efisien dan tidak mengganggu operasional.',
    output: 'Akurasi stok 99%+ dengan adjustment terdokumentasi',
    journal: 'DR/CR Persediaan | CR/DR Selisih Inventaris (Variance)',
    subSteps: [
      'Pilih lokasi/rak yang akan di-opname',
      'Hitung fisik dan input ke sistem',
      'Bandingkan dengan data sistem secara otomatis',
      'Posting adjustment jika ada selisih'
    ]
  }
];

export default function WMSWorkflow() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">WMS Workflow</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Standard Operating Procedure — Warehouse Management System</p>
          </div>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-widest hidden md:inline-flex">
          Enterprise WMS
        </Badge>
      </div>

      {/* FLOWCHART */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-300" /> WMS Lifecycle — Alur Operasi Gudang End-to-End
          </h3>
          <p className="text-emerald-200/70 text-[11px] mt-0.5">Dari konfigurasi lokasi, penerimaan barang, picking, pengiriman, hingga transfer antar gudang</p>
        </div>
        <CardContent className="p-10">
          <div className="relative overflow-x-auto lg:overflow-visible pb-4 md:pb-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16 min-w-max lg:min-w-0">
              {wmsSteps.map((s, i) => {
                const isEndOfRow = (i + 1) % 4 === 0;
                const isLastItem = i === wmsSteps.length - 1;
                return (
                  <div key={s.id} className="relative flex flex-col items-center text-center group">
                    {!isEndOfRow && !isLastItem && (
                      <div className="absolute top-[28px] left-[50%] w-full h-[1.5px] bg-emerald-100 dark:bg-emerald-900/30 z-0 hidden md:block" />
                    )}
                    {!isEndOfRow && !isLastItem && (
                      <div className="absolute top-[28px] -right-1 translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-emerald-200 dark:text-emerald-800" />
                      </div>
                    )}
                    <div className="relative z-10 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-emerald-500/20`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                        {i + 1}
                      </div>
                    </div>
                    <div className="px-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-emerald-600 transition-colors">{s.title}</p>
                      {s.subtitle && <p className="text-[10px] text-slate-400 font-medium mt-1 leading-snug">{s.subtitle}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WMS ADVANTAGE SECTION */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div className="bg-slate-900 dark:bg-black px-6 py-3">
          <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-300" /> Mengapa WMS Diperlukan untuk Retail?
          </h3>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Warehouse Management System (WMS) menjadi keharusan ketika bisnis retail berkembang ke multi-lokasi. Tanpa WMS, perusahaan menghadapi:
              </p>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-100 dark:border-red-800 shadow-sm space-y-3">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-500" /> Masalah Tanpa WMS:
                </p>
                <div className="space-y-2">
                  {[
                    'Staf picking jalan bolak-balik karena tidak tahu lokasi rak',
                    'Transfer stok antar cabang tidak terlacak — selisih misterius',
                    'Barang baru masuk ditaruh sembarang — sulit dicari saat order masuk',
                    'Tidak ada visibilitas real-time kapasitas gudang per cabang'
                  ].map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-center">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Keunggulan WMS Tradixa:</h4>
              {[
                { icon: Lightbulb, color: 'amber', title: 'Putaway Suggestion Otomatis', desc: 'Sistem menyarankan rak berdasarkan histori produk sejenis. Staf tinggal klik.' },
                { icon: Layers, color: 'blue', title: 'Batch Picking Multi-Order', desc: 'Gabungkan 10 order jadi 1 daftar picking. Efisiensi naik 3-5x lipat.' },
                { icon: ArrowRightLeft, color: 'indigo', title: 'Transfer Antar Gudang Terlacak', desc: 'Workflow 3 tahap dengan audit trail. Tidak ada stok hilang misterius.' },
                { icon: LayoutDashboard, color: 'emerald', title: 'Dashboard Real-Time', desc: 'KPI, grafik, dan alert dalam satu layar. Keputusan berbasis data.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/40 flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className={`w-4 h-4 text-${item.color}-600 dark:text-${item.color}-400`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {wmsSteps.map((step, index) => (
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
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors leading-tight">{step.title}</h3>
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
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-normal">
                      <span className="text-emerald-600 font-bold">Output:</span> {step.output}
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
                  className="w-full mt-4 h-10 rounded-xl font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
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
