import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Boxes, Users, ShoppingCart, CreditCard, Receipt, Truck,
  Wallet, BarChart3, ChevronRight, Info, RefreshCw, Workflow,
  CheckCircle2, ArrowRight, ShieldCheck, Settings, Banknote, QrCode, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';

const steps = [
  {
    id: 'product',
    title: 'Product Master',
    description: 'Buat katalog produk retail Anda dengan SKU, barcode, harga beli, harga jual, dan tingkat persediaan minimum (reorder level).',
    icon: Boxes,
    gradient: 'from-blue-500 to-blue-600',
    path: '/ProductMaster',
    tip: 'Gunakan scanner barcode USB saat input SKU untuk mempercepat entry data.',
    output: 'Katalog Produk & Barcode → digunakan saat checkout kasir',
    subSteps: [
      'Input nama produk, SKU, barcode, kategori, dan deskripsi',
      'Tentukan harga pokok (COGS) dan harga jual retail/agen',
      'Set reorder level untuk notifikasi stok menipis'
    ]
  },
  {
    id: 'customer',
    title: 'Customer Master',
    description: 'Kelola basis data pelanggan Anda. Catat preferensi, riwayat belanja, tingkat loyalitas, poin member, dan data segmentasi otomatis.',
    icon: Users,
    gradient: 'from-indigo-500 to-indigo-600',
    path: '/CustomerMaster',
    tip: 'Pelanggan loyal bisa diberikan promo khusus menggunakan modul Discount Management.',
    output: 'Profil Pelanggan & Loyalty → meningkatkan retensi pembeli',
    subSteps: [
      'Daftarkan data pembeli (nama, nomor WA/kontak, email)',
      'Set program loyalitas (kategori member & akumulasi poin)',
      'Segmentasikan pelanggan otomatis (RFM Analysis)'
    ]
  },
  {
    id: 'pos',
    title: 'Sales Transaction (POS)',
    description: 'Proses kasir POS (Point of Sale) retail. Pilih barang dengan barcode scanner, hubungkan pelanggan, input diskon, dan tentukan metode pembayaran.',
    icon: ShoppingCart,
    gradient: 'from-violet-500 to-violet-600',
    path: '/SalesTransaction',
    tip: 'Gunakan tombol shortcut keyboard di layar kasir untuk mempercepat proses checkout.',
    output: 'Transaksi Kasir POS → pengurangan stok otomatis + draft invoice',
    subSteps: [
      'Scan barcode produk / cari produk di katalog POS',
      'Pilih pembeli untuk akumulasi poin & loyalty member',
      'Pilih metode pembayaran (Tunai, Bank Transfer, QRIS, atau EDC)'
    ]
  },
  {
    id: 'payment-methods',
    title: 'Payment Channels',
    subtitle: 'EDC, Cash, & QRIS Gateway',
    description: 'Tradixa POS terintegrasi secara modular dengan 3 opsi pembayaran utama untuk rekonsiliasi instan tanpa input manual kasir.',
    icon: CreditCard,
    gradient: 'from-pink-500 to-pink-600',
    path: '/CompanySettings',
    tip: 'Pastikan integrasi pembayaran diatur ke default channel yang sesuai di Company Settings.',
    output: 'Kas Tercatat + Saldo Bank Sinkron + Jurnal Transaksi Otomatis',
    subSteps: [
      'Cash Payment: Transaksi tunai tercatat langsung ke modul Cash Register untuk mengelola kas laci.',
      'Card/EDC: Transaksi kartu diproses instan via Tradixa Link Bridge Agent langsung ke terminal EDC fisik.',
      'QRIS & e-Wallet: Pembayaran digital secara real-time via online Payment Gateway terintegrasi.'
    ],
    phaseLabel: 'INTEGRASI'
  },
  {
    id: 'invoice',
    title: 'Sales Invoice',
    description: 'Faktur resmi penjualan otomatis dibuat secara real-time. Melacak status pembayaran (Paid, Unpaid, Overdue) dan jatuh tempo piutang.',
    icon: Receipt,
    gradient: 'from-emerald-500 to-emerald-600',
    path: '/SalesInvoices',
    tip: 'Atur template struk thermal di Company Settings untuk menampilkan logo toko Anda.',
    output: 'Faktur Penjualan Resmi → sinkronisasi dengan piutang usaha',
    subSteps: [
      'Invoice otomatis digenerate setelah kasir klik Bayar',
      'Status ter-update real-time (Lunas atau Piutang/Tempo)',
      'Cetak struk belanja thermal / kirim e-invoice via email'
    ]
  },
  {
    id: 'delivery',
    title: 'Outbound Delivery',
    description: 'Proses pengiriman barang dari gudang untuk pesanan delivery/pesanan online. Membuat dokumen Surat Jalan & melacak status kurir.',
    icon: Truck,
    gradient: 'from-amber-500 to-amber-600',
    path: '/OutboundDelivery',
    tip: 'Gunakan WMS Pick List untuk memandu petugas gudang mengambil barang pengiriman dengan cepat.',
    output: 'Surat Jalan & Shipping → pengiriman barang tercatat',
    subSteps: [
      'Buat dokumen Outbound Delivery / Surat Jalan pengiriman',
      'Verifikasi fisik barang keluar dari rak gudang (WMS)',
      'Serahkan ke kurir internal/ekspedisi eksternal'
    ]
  },
  {
    id: 'receivables',
    title: 'Accounts Receivable',
    description: 'Kelola piutang pelanggan untuk transaksi tempo/kredit. Melacak umur piutang, mencatat cicilan pelunasan, dan mengirim tagihan.',
    icon: Wallet,
    gradient: 'from-teal-500 to-teal-600',
    path: '/Receivables',
    tip: 'Kirim pengingat tagihan piutang secara sopan sebelum tanggal jatuh tempo.',
    output: 'Pencatatan Piutang Usaha → penagihan terjadwal',
    subSteps: [
      'Monitor tagihan piutang jatuh tempo per pelanggan',
      'Catat penerimaan pembayaran cicilan/pelunasan kredit',
      'Otomatis meng-update status invoice menjadi Paid/Lunas'
    ]
  },
  {
    id: 'reports',
    title: 'Revenue & Tax',
    description: 'Sinkronisasi pembukuan otomatis. Setiap transaksi lunas otomatis tercatat di Jurnal Keuangan (Debit Kas/Bank, Kredit Penjualan) & laporan rugi laba.',
    icon: BarChart3,
    gradient: 'from-blue-600 to-blue-700',
    path: '/RevenueReports',
    tip: 'Gunakan filter cabang di modul Laporan Pendapatan untuk membandingkan profitabilitas antar gerai.',
    output: 'Laba Rugi & Jurnal Buku Besar → sinkronisasi keuangan instan',
    subSteps: [
      'Posting jurnal otomatis ke Chart of Accounts (COA)',
      'Hitung perhitungan PPN keluaran otomatis untuk pelaporan pajak',
      'Lihat analisis pendapatan harian & margin laba kotor toko'
    ]
  }
];

// Status flow data
const statusFlow = [
  { label: 'POS Checkout', color: 'bg-blue-500', desc: 'Transaksi dibuat di POS' },
  { label: 'Payment Method Selected', color: 'bg-pink-500', desc: 'Cash / EDC / QRIS Gateway' },
  { label: 'Payment Approved', color: 'bg-emerald-500', desc: 'Otorisasi sukses / Cash ter-register' },
  { label: 'Invoice Generated', color: 'bg-violet-500', desc: 'Faktur dibuat otomatis' },
  { label: 'Journal Posted', color: 'bg-blue-600', desc: 'Ledger keuangan disinkronisasi' }
];

export default function SalesWorkflow() {
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
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Sales Workflow</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alur transaksi kasir, otomasi integrasi EDC lokal, hingga pelaporan laba rugi</p>
          </div>
        </div>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] uppercase tracking-widest">
          Enterprise Retail Standard
        </Badge>
      </div>

      {/* FLOWCHART */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400" /> Sales Lifecycle — Standard Operating Procedure
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Alur kerja POS terintegrasi desentralisasi dari pembuatan katalog produk hingga pelaporan rugi laba</p>
        </div>
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute top-7 left-[calc(6.25%)] right-[calc(6.25%)] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 via-violet-200 via-pink-200 via-emerald-200 via-amber-200 to-blue-200 z-0 hidden lg:block" />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-0">
              {steps.map((s, i) => (
                <div key={s.id} className="relative flex flex-col items-center text-center group">
                  {i < steps.length - 1 && (
                    <div className="absolute top-[28px] right-0 translate-x-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="relative z-10 mb-2">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg transition-all duration-300 ${s.phaseLabel ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-pink-300' : ''}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[9px] font-black text-slate-700 dark:text-slate-300 shadow-sm">
                      {i + 1}
                    </div>
                    {s.phaseLabel && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {s.phaseLabel}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">{s.title.split('—')[0].trim()}</p>
                  {s.subtitle && <p className="text-[8px] text-pink-600 font-bold">{s.subtitle}</p>}
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 px-0.5 hidden md:block">{s.description.split('.')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAILED PAYMENT CHANNELS DIAGRAM */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-pink-400" /> Multi-Channel Payment Integration Flow — Detail Alur
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Alur pemrosesan mutasi berdasarkan 4 gerbang metode pembayaran di Kasir POS</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CASH FLOW */}
            <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-850 dark:text-slate-100">1. Tunai / Cash Payment</h4>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Modul Cash Register</p>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                    <p>Pilih Pembayaran <strong>Tunai (Cash)</strong> pada layar transaksi kasir POS.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                    <p>Sistem otomatis mengirim mutasi & nominal ke modul <strong>Cash Register</strong> toko.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                    <p>Saldo uang laci fisik dicatat rapi guna mempermudah rekonsiliasi akhir shift kasir.</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/CashRegister')}
                className="mt-6 w-full h-8 text-[11px] font-bold rounded-lg border-blue-200 text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                Buka Cash Register <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* CARD / EDC FLOW */}
            <div className="p-5 bg-pink-50/50 dark:bg-pink-950/20 rounded-2xl border border-pink-100 dark:border-pink-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-pink-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-850 dark:text-slate-100">2. Debit & Kartu Kredit</h4>
                    <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">Tradixa Link Local Bridge</p>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-pink-100 dark:bg-pink-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                    <p>Pilih Pembayaran <strong>EDC / Card</strong> di kasir POS Tradixa.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-pink-100 dark:bg-pink-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                    <p>POS memicu Local Loopback WebSocket ke <strong>Tradixa Link Agent</strong> lokal kasir.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-pink-100 dark:bg-pink-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                    <p>Mesin EDC menyala menerima nominal tagihan otomatis tanpa risiko human-error.</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/CompanySettings')}
                className="mt-6 w-full h-8 text-[11px] font-bold rounded-lg border-pink-200 text-pink-600 hover:bg-pink-100 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-950/40"
              >
                Unduh Bridge Agent <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* QRIS / E-WALLET FLOW */}
            <div className="p-5 bg-violet-50/50 dark:bg-violet-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-850 dark:text-slate-100">3. QRIS GPN & E-Wallet</h4>
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">4 Mode Pembayaran Cerdas</p>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                    <p>Kasir memilih metode <strong>QRIS / E-Wallet</strong> pada layar POS.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                    <p>Sistem auto-deteksi mode: <strong>Dynamic QRIS</strong> (via API Gateway) atau <strong>Static QRIS GPN</strong> (dari Settings).</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-violet-100 dark:bg-violet-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                    <p>Status auto-paid via <strong>Webhook</strong> (jika Gateway aktif) atau konfirmasi manual <strong>RRN</strong> kasir.</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/CompanySettings')}
                className="mt-6 w-full h-8 text-[11px] font-bold rounded-lg border-violet-200 text-violet-600 hover:bg-violet-100 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40"
              >
                Konfigurasi Gateway <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {/* RECEIVABLES (AR / CREDIT) FLOW */}
            <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col justify-between animate-in fade-in duration-300">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-850 dark:text-slate-100">4. Piutang & Uang Muka (AR)</h4>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Accounts Receivable</p>
                  </div>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                    <p>Pilih metode <strong>Piutang / Termin</strong>, input Uang Muka (DP) & Jatuh Tempo.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                    <p>Sisa tagihan otomatis dikirim ke modul <strong>Account Receivables (AR)</strong> sebagai piutang aktif.</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-350">
                    <div className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/60 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                    <p>Pembayaran angsuran (cicilan) / pelunasan langsung memotong sisa piutang & balance otomatis.</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/Receivables')}
                className="mt-6 w-full h-8 text-[11px] font-bold rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                Manajemen Piutang <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QRIS GPN 4-MODE ARCHITECTURE DETAIL */}
      <Card className="border-violet-200 dark:border-violet-800/50 overflow-hidden">
        <div className="bg-slate-950 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <QrCode className="w-4 h-4 text-violet-300" /> Arsitektur QRIS GPN — 4 Mode Pembayaran Cerdas
          </h3>
          <p className="text-violet-200 text-[11px] mt-0.5">Sistem secara otomatis mendeteksi konfigurasi toko dan memilih mode QRIS terbaik di layar kasir POS</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode A */}
            <div className="p-4 bg-violet-50/50 dark:bg-violet-950/10 rounded-2xl border border-violet-100 dark:border-violet-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-violet-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">A</div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Dynamic QRIS via Payment Gateway</h5>
                  <p className="text-[9px] text-violet-600 dark:text-violet-400 font-bold">Mayar API Key ✅ • QRIS Statis ❌</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed">
                  POS memanggil API Payment Gateway untuk men-generate <strong>QRIS dinamis</strong> dengan nominal pas setiap transaksi. Setelah pelanggan scan & bayar, <strong>Webhook otomatis</strong> mengubah status menjadi Paid secara instan.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Auto-Paid via Webhook</span>
                </div>
              </div>
            </div>

            {/* Mode B — RECOMMENDED */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 relative">
              <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                🏆 Rekomendasi
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">B</div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Static QRIS dari Gateway + Webhook</h5>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Mayar API Key ✅ • QRIS Statis ✅ (dari Mayar)</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed">
                  Merchant download gambar QRIS statis dari <strong>Dashboard Mayar</strong>, lalu upload ke Company Settings. POS menampilkan gambar <strong>instan tanpa API call</strong>. Webhook Mayar tetap aktif untuk auto-confirm pembayaran.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Auto-Paid + Instan (Tanpa Loading API)</span>
                </div>
              </div>
            </div>

            {/* Mode C */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-amber-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">C</div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">Static QRIS dari Bank (Manual RRN)</h5>
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Mayar API Key ❌ • QRIS Statis ✅ (dari Bank)</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed">
                  Merchant upload gambar QRIS statis dari bank/e-wallet (akrilik standee). POS menampilkan gambar instan. Kasir <strong>input nomor referensi (RRN)</strong> dari bukti bayar pelanggan untuk konfirmasi manual.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Info className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">Gratis 100% • Tanpa Biaya Integrasi</span>
                </div>
              </div>
            </div>

            {/* Mode D */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-slate-400 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">D</div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">QRIS Belum Dikonfigurasi</h5>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Mayar API Key ❌ • QRIS Statis ❌</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pilihan QRIS akan <strong>dinonaktifkan (disabled)</strong> di dropdown metode pembayaran kasir POS. Merchant perlu mengaktifkan minimal salah satu: Mayar API Key atau upload gambar QRIS statis.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Settings className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Atur di Company Settings untuk mengaktifkan</span>
                </div>
              </div>
            </div>
          </div>

          {/* GPN Network Info */}
          <div className="mt-5 p-4 bg-violet-50/30 dark:bg-violet-950/10 rounded-xl border border-violet-100 dark:border-violet-800/40 flex gap-3">
            <Smartphone className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-violet-800 dark:text-violet-300">
                Semua mode menggunakan jaringan GPN (Gerbang Pembayaran Nasional) Bank Indonesia
              </p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                QRIS adalah standar kode QR nasional yang kompatibel dengan seluruh e-wallet & mobile banking di Indonesia (GoPay, OVO, DANA, ShopeePay, LinkAja, BCA Mobile, Mandiri Livin, dll). MDR (biaya transaksi) sebesar ~0.7% dipotong otomatis oleh jaringan GPN — baik dari gateway maupun bank.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POS / EDC STATUS FLOW */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 px-6 py-3">
          <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" /> POS & EDC Integration Lifecycle
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
          <div className="mt-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-800/50 flex gap-2">
            <Info className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-pink-800 dark:text-pink-300 font-medium leading-relaxed">
              <strong>Local ECR Bridge Aktif:</strong> Sinyal data nominal transaksi POS otomatis dikirim langsung ke mesin EDC lokal lewat Loopback WebSocket (port 9000). Transaksi menjadi sangat aman, cepat, dan terbebas dari kesalahan entry manual kasir.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CONFIGURATION INFO */}
      <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Konfigurasi Enterprise Sales — Aktif
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Pengaturan metode integrasi default perangkat kasir toko</p>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Integration Config */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Integrasi Pembayaran EDC</p>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {settings.defaultEdcIntegration === 'bridge' ? 'Tradixa Link Bridge (WebSocket)' : 'Input Manual / Standar'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {settings.defaultEdcIntegration === 'bridge' 
                  ? 'Setiap transaksi kartu otomatis menyalakan terminal EDC kasir.' 
                  : 'Kasir memasukkan nilai pembayaran ke mesin EDC secara manual.'}
              </p>
            </div>

            {/* Loyalty Integration Config */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loyalty Member Program</p>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Auto-Accumulation Poin & Tiered Discount
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Akumulasi poin pelanggan setia terintegrasi otomatis di POS untuk klaim promo instan.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <div className="flex gap-2 items-center">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                Ubah konfigurasi metode integrasi ini di modul <strong>Company Settings</strong> kasir.
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
          <Card key={step.id} className={`group hover:shadow-xl transition-all duration-300 border-slate-100 dark:border-slate-800 overflow-hidden ${step.phaseLabel ? 'dark:hover:shadow-pink-900/10 ring-1 ring-pink-100 dark:ring-pink-800/50' : 'dark:hover:shadow-slate-900/20'}`}>
            <CardContent className="p-6 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  {step.phaseLabel && (
                    <Badge className="bg-pink-100 text-pink-700 border-pink-200 font-black text-[9px] uppercase tracking-widest">{step.phaseLabel}</Badge>
                  )}
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300 font-black text-xs">
                  {index + 1}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-grow space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors leading-tight">{step.title}</h3>
                {step.subtitle && <p className="text-xs font-bold text-pink-600">{step.subtitle}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Sub-steps */}
              {step.subSteps && (
                <div className="mt-4 space-y-1.5">
                  {step.subSteps.map((sub, si) => (
                    <div key={si} className="flex gap-2 items-start">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black ${step.phaseLabel ? 'bg-pink-400 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
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
              <Button 
                onClick={() => navigate(step.path)}
                variant="outline"
                className="w-full mt-4 h-10 rounded-xl font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              >
                Buka Modul <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FOOTER CTA */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 overflow-hidden relative">
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Otomatisasi Pembukuan & Laba Rugi</h2>
                <p className="text-emerald-100 text-sm mt-1 max-w-xl">
                  Setiap transaksi POS yang lunas otomatis memotong stok produk dan memposting jurnal mutasi debit Kas/Bank serta kredit Penjualan secara real-time.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/SalesTransaction')} className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold h-10 px-6 rounded-xl shadow-lg">
                Masuk POS Kasir
              </Button>
              <Button onClick={() => navigate('/RevenueReports')} variant="ghost" className="text-white hover:bg-white/10 font-bold h-10 px-6 rounded-xl border border-white/20">
                Laporan Pendapatan
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full -ml-24 -mb-24 blur-3xl" />
      </Card>
    </div>
  );
}
