import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Settings, List, Wallet, ArrowRightLeft, LayoutDashboard,
  DollarSign, Users, ChevronRight, PlayCircle, CheckCircle2,
  Info, ArrowRight, Workflow, Banknote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    id: 'setup-agent',
    title: 'Pengaturan Agen',
    description: 'Daftarkan agen BRILINK/payment point beserta data kontak, alamat, dan rate komisi yang disepakati.',
    icon: Settings,
    gradient: 'from-slate-600 to-slate-700',
    path: '/PengaturanAgen',
    tip: 'Setiap agen memiliki rate komisi berbeda. Agen aktif bisa langsung menerima transaksi.',
    output: 'Database Agen → digunakan di seluruh modul'
  },
  {
    id: 'setup-service',
    title: 'Daftar Layanan',
    description: 'Konfigurasi layanan yang tersedia: Pulsa, Listrik, PDAM, BPJS, Transfer, E-Wallet, dan lainnya.',
    icon: List,
    gradient: 'from-blue-500 to-blue-600',
    path: '/DaftarLayanan',
    tip: 'Setiap layanan bisa memiliki fee (biaya admin) dan komisi (pendapatan agen) yang berbeda.',
    output: 'Daftar layanan + fee/komisi → input transaksi'
  },
  {
    id: 'topup',
    title: 'Saldo & Kas Agen',
    description: 'Top up saldo agen sebelum melayani customer. Tarik saldo saat agen ingin mencairkan pendapatan.',
    icon: Wallet,
    gradient: 'from-emerald-500 to-emerald-600',
    path: '/SaldoKasAgen',
    tip: 'Pastikan saldo agen mencukupi sebelum melayani transaksi tarik tunai customer.',
    output: 'Saldo agen terupdate → siap melayani transaksi'
  },
  {
    id: 'transaction',
    title: 'Transaksi Agen',
    description: 'Customer datang → agen input transaksi (tarik tunai, transfer, bayar tagihan). Fee & komisi otomatis terhitung.',
    icon: ArrowRightLeft,
    gradient: 'from-violet-500 to-violet-600',
    path: '/TransaksiAgen',
    tip: 'Setiap transaksi otomatis menghitung fee layanan dan komisi agen berdasarkan konfigurasi.',
    output: 'Transaksi tercatat + komisi agen + saldo terupdate'
  },
  {
    id: 'dashboard',
    title: 'Dashboard Agent',
    description: 'Pantau ringkasan real-time: total transaksi masuk, layanan berhasil, estimasi komisi, dan grafik harian.',
    icon: LayoutDashboard,
    gradient: 'from-amber-500 to-amber-600',
    path: '/DashboardAgent',
    tip: 'Gunakan grafik 7 hari terakhir untuk melihat tren transaksi dan identifikasi waktu ramai.',
    output: 'Insight bisnis → keputusan operasional'
  },
  {
    id: 'fee-report',
    title: 'Laporan Fee',
    description: 'Rekap seluruh fee admin yang terkumpul dan komisi yang sudah dibayarkan ke masing-masing agen.',
    icon: DollarSign,
    gradient: 'from-teal-500 to-teal-600',
    path: '/LaporanFee',
    tip: 'Laporan fee bisa difilter per periode untuk memudahkan rekonsiliasi bulanan.',
    output: 'Rekap fee & komisi → input laporan keuangan'
  },
  {
    id: 'performance',
    title: 'Agent Performance',
    description: 'Ranking agen berdasarkan pendapatan, jumlah transaksi, dan distribusi tipe layanan. Export ke CSV.',
    icon: Users,
    gradient: 'from-indigo-500 to-indigo-600',
    path: '/AgentPerformance',
    tip: 'Top agen bisa diberikan bonus atau insentif untuk meningkatkan motivasi layanan.',
    output: 'Evaluasi kinerja → reward system'
  }
];

export default function FinancialAgentWorkflow() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Workflow className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Financial Agent Workflow</h1>
            <p className="text-sm text-slate-500">Alur kerja agen pembayaran BRILINK & payment point</p>
          </div>
        </div>
      </div>

      {/* PROFESSIONAL FLOWCHART */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
          <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-indigo-400" /> Agent Lifecycle · BRILINK Payment Point
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Alur kerja agen keuangan dari registrasi hingga pelaporan performa</p>
        </div>
        <CardContent className="p-6">
          <div className="relative">
            {/* Connector Line */}
            <div className="absolute top-7 left-[calc(7.14%)] right-[calc(7.14%)] h-0.5 bg-gradient-to-r from-slate-200 via-violet-200 via-emerald-200 to-indigo-200 z-0 hidden lg:block" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-0">
              {steps.map((s, i) => (
                <div key={s.id} className="relative flex flex-col items-center text-center group cursor-pointer" onClick={() => navigate(s.path)}>
                  {i < steps.length - 1 && (
                    <div className="absolute top-[28px] right-0 translate-x-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="relative z-10 mb-3">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-700 shadow-sm">
                      {i + 1}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{s.title}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-1 px-1 hidden md:block">{s.description.split('.')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HOW IT WORKS - BRILINK CONCEPT */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100">
        <CardContent className="p-6">
          <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-600" /> Bagaimana Sistem Agent Bekerja?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-indigo-100">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Customer Datang</h4>
              <p className="text-xs text-slate-500">Customer membutuhkan layanan: tarik tunai, transfer bank, bayar listrik/PDAM/BPJS, beli pulsa, top up e-wallet.</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-indigo-100">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Agen Proses + Fee</h4>
              <p className="text-xs text-slate-500">Agen memproses transaksi. Sistem otomatis menghitung fee admin (dibayar customer) dan komisi (pendapatan agen).</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-indigo-100">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center mb-2">
                <Wallet className="w-4 h-4 text-violet-600" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">Saldo & Komisi Update</h4>
              <p className="text-xs text-slate-500">Saldo agen terupdate real-time. Komisi terakumulasi dan bisa dicairkan kapan saja melalui modul Saldo & Kas.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step, index) => (
          <Card key={step.id} className="group hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 border-slate-100 overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                  {index + 1}
                </div>
              </div>
              
              <div className="flex-grow space-y-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold text-slate-600 leading-normal">
                    <span className="text-emerald-600 font-bold">Output:</span> {step.output}
                  </p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100/50">
                <div className="flex gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-indigo-700 leading-normal">
                    <span className="font-bold">Pro Tip:</span> {step.tip}
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => navigate(step.path)}
                variant="outline"
                className="w-full mt-4 h-10 rounded-xl font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                Buka Modul <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FOOTER CTA */}
      <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 border-0 overflow-hidden relative">
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Otomatisasi Fee & Komisi</h2>
                <p className="text-indigo-200 text-sm mt-1 max-w-xl">
                  Setiap transaksi agen otomatis menghitung fee admin dan komisi. Saldo agen terupdate real-time tanpa input manual.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/TransaksiAgen')} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold h-10 px-6 rounded-xl">
                Transaksi Baru
              </Button>
              <Button onClick={() => navigate('/LaporanFee')} variant="ghost" className="text-white hover:bg-white/10 font-bold h-10 px-6 rounded-xl border border-white/20">
                Laporan Fee
              </Button>
            </div>
          </div>
        </CardContent>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-400/10 rounded-full -ml-24 -mb-24 blur-3xl" />
      </Card>
    </div>
  );
}
