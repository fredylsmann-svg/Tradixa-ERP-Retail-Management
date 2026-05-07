import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import {
  LineChart as LineChartIcon, TrendingUp, TrendingDown, BarChart3,
  DollarSign, Wallet, Loader2, RefreshCw, Printer, FileSpreadsheet, FileText
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

// =====================================================
// FINANCIAL STATEMENTS — FORMAT STANDAR PERUSAHAAN
// Tabel dengan warna, border, logo, export PDF/Excel
// =====================================================

const TabButton = ({ active, children, onClick, icon: Icon }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
    {Icon && <Icon className="w-4 h-4" />}{children}
  </button>
);

const StatCard = ({ title, value, subtitle, icon: Icon, trendColor = 'text-emerald-600', bgColor = 'bg-blue-50' }) => (
  <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-medium text-slate-500 mb-1">{title}</p>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            <AnimatedNumber value={typeof value === 'number' ? value : 0} prefix={typeof value === 'number' ? 'Rp ' : ''} />
            {typeof value === 'string' && <span>{value}</span>}
          </div>
          {subtitle && <p className={`text-xs mt-1 ${trendColor}`}>{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const fmt = (v) => `Rp ${Math.abs(v).toLocaleString('id-ID')}`;

// Print/Export for Financial Statements
function fsExport(mode, storeName, storeAddress, storeLogoUrl, reportTitle, periodLabel, contentId) {
  const content = document.getElementById(contentId);
  if (!content) return;
  const clone = content.cloneNode(true);
  const tableHTML = clone.outerHTML;

  if (mode === 'excel') {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8">
      <style>table{border-collapse:collapse;font-family:Calibri;font-size:11pt}th{background:#4472C4;color:#fff;font-weight:bold;border:1px solid #8EA9DB;padding:6px 10px}td{border:1px solid #D6DCE4;padding:4px 10px}tr:nth-child(even){background:#D9E2F3}.text-right{text-align:right}</style>
      </head><body>
      <table><tr><td colspan="10" style="font-size:16pt;font-weight:bold;text-align:center;border:none">${storeName || 'SISTEM BISNIS'}</td></tr>
      ${storeAddress ? `<tr><td colspan="10" style="font-size:9pt;text-align:center;color:#666;border:none">${storeAddress}</td></tr>` : ''}
      <tr><td colspan="10" style="font-size:13pt;font-weight:bold;text-align:center;border:none">${reportTitle}</td></tr>
      <tr><td colspan="10" style="font-size:10pt;text-align:center;color:#666;border:none">${periodLabel}</td></tr>
      <tr><td colspan="10" style="border:none"></td></tr></table>
      ${tableHTML}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click(); URL.revokeObjectURL(url);
  } else {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${reportTitle}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Tahoma,sans-serif;padding:15mm;color:#1e293b;font-size:10pt}
        .header{text-align:center;margin-bottom:20px}
        .header img{width:48px;height:48px;object-fit:cover;border-radius:8px;margin-bottom:6px}
        .header .name{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:1px}
        .header .addr{font-size:8pt;color:#64748b;margin-top:2px}
        .header .title{font-size:12pt;font-weight:700;text-transform:uppercase;margin-top:10px}
        .header .period{font-size:9pt;color:#475569;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:9pt}
        thead tr:first-child { display: none !important; } /* Hide redundant table header to prevent huge native logo */
        th{background:#e8edf3;border:1px solid #cbd5e1;padding:6px 8px;font-weight:600;text-transform:uppercase;color:#475569}
        td{border:1px solid #e2e8f0;padding:5px 8px}
        tr:nth-child(even){background:#f8fafc}
        .section-header td{background:#3b82f6!important;color:#fff!important;font-weight:700;border-color:#2563eb}
        .subtotal td{background:#e0e7ff!important;font-weight:700;border-color:#93c5fd}
        .total td{background:#1e40af!important;color:#fff!important;font-weight:700;font-size:10pt;border-color:#1e3a8a}
        .text-right{text-align:right}
        .footer{text-align:center;margin-top:24px;font-size:7pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px}
        @media print{body{padding:8mm}@page{margin:8mm;size:A4}}
      </style></head><body>
      <div class="header">
        ${storeLogoUrl ? `<img src="${storeLogoUrl}" alt="Logo" />` : ''}
        <div class="name">${storeName || 'TRADIXA'}</div>
        ${storeAddress ? `<div class="addr">${storeAddress}</div>` : ''}
        <div class="title">${reportTitle}</div>
        <div class="period">${periodLabel}</div>
      </div>
      ${tableHTML}
      <div class="footer">Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <script>window.onload=function(){window.print();};</script>
    </body></html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) { window.alert('Pop-up blocked! Izinkan pop-up untuk export.'); return; }
    
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

export default function FinancialStatements({ store }) {
  const [activeTab, setActiveTab] = useState('pnl');
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salesTx, setSalesTx] = useState([]);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [journals, journalLines, expenseData, sales] = await Promise.all([
        api.entities.JournalEntry.filter({ status: 'Posted' }),
        api.entities.JournalLine.filter({}),
        api.entities.Expense.filter({}, '-date'),
        api.entities.SalesTransaction.filter({}, '-created_date')
      ]);

      // Map lines to their journal entry to get the date
      const postedJournalIds = new Set(journals.map(j => j.id));
      const validLines = journalLines.filter(l => postedJournalIds.has(l.journal_id)).map(l => {
        const parent = journals.find(j => j.id === l.journal_id);
        return { ...l, date: parent?.date };
      });

      setJournalEntries(validLines);
      setExpenses(expenseData);
      setSalesTx(sales);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const filterByPeriod = (data, dateField = 'date') => {
    if (!dateFrom && !dateTo && period === 'all') return data;
    let from, to;
    if (period === 'month') { const n = new Date(); from = new Date(n.getFullYear(), n.getMonth(), 1); to = new Date(n.getFullYear(), n.getMonth() + 1, 0); }
    else if (period === 'year') { const n = new Date(); from = new Date(n.getFullYear(), 0, 1); to = new Date(n.getFullYear(), 11, 31); }
    else if (dateFrom || dateTo) { from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01'); to = dateTo ? new Date(dateTo) : new Date('2099-12-31'); }
    else return data;
    return data.filter(d => { const dd = new Date(d[dateField]); return dd >= from && dd <= to; });
  };

  const fj = useMemo(() => filterByPeriod(journalEntries, 'date'), [journalEntries, dateFrom, dateTo, period]);
  const fe = useMemo(() => filterByPeriod(expenses, 'date'), [expenses, dateFrom, dateTo, period]);
  const fsx = useMemo(() => filterByPeriod(salesTx, 'created_date'), [salesTx, dateFrom, dateTo, period]);

  const calculateFinancials = (jData, eData, sData) => {
    const at = {};
    jData.forEach(j => {
      const n = j.account_name;
      if (!at[n]) at[n] = { debit: 0, credit: 0, type: j.account_type };
      at[n].debit += Number(j.debit || 0);
      at[n].credit += Number(j.credit || 0);
    });

    const revenue = (at['Pendapatan Penjualan']?.credit || 0) - (at['Pendapatan Penjualan']?.debit || 0);
    const hpp = (at['Harga Pokok Penjualan (HPP)']?.debit || 0) - (at['Harga Pokok Penjualan (HPP)']?.credit || 0);
    const grossProfit = revenue - hpp;

    const opex = {}; let totalOpex = 0;
    eData.forEach(e => {
      if (e.category === 'Pembelian Produk (HPP)') return;
      if (!opex[e.category]) opex[e.category] = 0;
      opex[e.category] += Number(e.amount || 0);
      totalOpex += Number(e.amount || 0);
    });

    const netProfit = grossProfit - totalOpex;
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

    let kas = 0;
    Object.keys(at).forEach(name => {
      if (name.toLowerCase().includes('kas') || name.toLowerCase().includes('bank')) {
        kas += (at[name].debit || 0) - (at[name].credit || 0);
      }
    });

    const piutang = (at['Piutang Usaha']?.debit || 0) - (at['Piutang Usaha']?.credit || 0);
    const persediaan = (at['Persediaan Barang Dagang']?.debit || 0) - (at['Persediaan Barang Dagang']?.credit || 0);
    const totalAssets = kas + piutang + persediaan;
    const hutang = (at['Hutang Usaha']?.credit || 0) - (at['Hutang Usaha']?.debit || 0);
    const equity = totalAssets - hutang;

    const cashIn = {}; let totalCashIn = 0;
    jData.filter(j => (j.account_name.toLowerCase().includes('kas') || j.account_name.toLowerCase().includes('bank')) && Number(j.debit) > 0).forEach(j => {
      const c = j.description?.includes('Penjualan') ? 'Penerimaan Penjualan' : 'Penerimaan Lainnya';
      if (!cashIn[c]) cashIn[c] = 0; cashIn[c] += Number(j.debit); totalCashIn += Number(j.debit);
    });

    const cashOut = {}; let totalCashOut = 0;
    jData.filter(j => (j.account_name.toLowerCase().includes('kas') || j.account_name.toLowerCase().includes('bank')) && Number(j.credit) > 0).forEach(j => {
      let c = 'Pengeluaran Lainnya';
      if (j.description?.includes('Pembelian') || j.description?.includes('Stok')) c = 'Pembelian Barang Dagang';
      else if (j.description?.includes('Beban')) c = 'Pembayaran Beban Operasional';
      if (!cashOut[c]) cashOut[c] = 0; cashOut[c] += Number(j.credit); totalCashOut += Number(j.credit);
    });

    const totalDiscount = sData.reduce((s, tx) => s + Number(tx.discount || 0), 0);
    return { revenue, hpp, grossProfit, grossMargin, totalOpex, opex, netProfit, netMargin, totalDiscount, kas, piutang, persediaan, totalAssets, hutang, equity, retainedEarnings: netProfit, totalCashIn, cashIn, totalCashOut, cashOut, netCashFlow: totalCashIn - totalCashOut, txCount: sData.length, journalCount: jData.length };
  };

  const f = useMemo(() => calculateFinancials(fj, fe, fsx), [fj, fe, fsx]);

  const prevF = useMemo(() => {
    // Calculate previous month data for MoM comparison
    const now = new Date();
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0);

    const pFj = journalEntries.filter(j => { const d = new Date(j.date); return d >= startPrev && d <= endPrev; });
    const pFe = expenses.filter(e => { const d = new Date(e.date); return d >= startPrev && d <= endPrev; });
    const pFsx = salesTx.filter(s => { const d = new Date(s.created_date); return d >= startPrev && d <= endPrev; });

    return calculateFinancials(pFj, pFe, pFsx);
  }, [journalEntries, expenses, salesTx]);

  const periodLabel = period === 'month' ? `Bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : period === 'year' ? `Tahun ${new Date().getFullYear()}` : dateFrom || dateTo ? `${dateFrom} s/d ${dateTo}` : 'Seluruh Periode';
  const tabTitles = { pnl: 'LAPORAN LABA RUGI', balance: 'NERACA (BALANCE SHEET)', cashflow: 'LAPORAN ARUS KAS' };
  const tabIds = { pnl: 'print-pnl', balance: 'print-balance', cashflow: 'print-cashflow' };

  if (isLoading) return (<div className="flex items-center justify-center h-96"><div className="text-center space-y-3"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" /><p className="text-sm text-slate-500">Memuat data keuangan...</p></div></div>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Statements"
        subtitle="Laporan Keuangan Standar Perusahaan"
        icon={LineChartIcon}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => fsExport('print', store?.store_name, store?.address, store?.logo_url, tabTitles[activeTab], periodLabel, tabIds[activeTab])} className="gap-1.5 text-xs h-11 px-4 rounded-xl border-slate-200">
              <Printer className="w-4 h-4" />Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => fsExport('pdf', store?.store_name, store?.address, store?.logo_url, tabTitles[activeTab], periodLabel, tabIds[activeTab])} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-4 rounded-xl">
              <FileText className="w-4 h-4" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => fsExport('excel', store?.store_name, store?.address, store?.logo_url, tabTitles[activeTab], periodLabel, tabIds[activeTab])} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-4 rounded-xl">
              <FileSpreadsheet className="w-4 h-4" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={loadAllData} className="gap-1.5 text-xs h-11 px-4 rounded-xl border-slate-200"><RefreshCw className="w-4 h-4" />Refresh</Button>
          </div>
        }
      />

      {/* Period Filter */}
      <Card className="border-slate-200"><CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Periode:</span>
          <Select value={period} onValueChange={(v) => { setPeriod(v); setDateFrom(''); setDateTo(''); }}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Waktu</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (<>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-9" />
            <span className="text-slate-400 text-sm">s/d</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-9" />
          </>)}
          <span className="text-xs text-slate-400 ml-auto">{f.journalCount} entri | {f.txCount} transaksi</span>
        </div>
      </CardContent></Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === 'pnl'} onClick={() => setActiveTab('pnl')} icon={TrendingUp}>Laba Rugi</TabButton>
        <TabButton active={activeTab === 'balance'} onClick={() => setActiveTab('balance')} icon={BarChart3}>Neraca</TabButton>
        <TabButton active={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')} icon={Wallet}>Arus Kas</TabButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan"
          value={f.revenue}
          subtitle={
            <span className="flex items-center gap-1">
              {f.revenue >= prevF.revenue ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              {f.revenue >= prevF.revenue ? 'Naik' : 'Turun'} {prevF.revenue > 0 ? ((Math.abs(f.revenue - prevF.revenue) / prevF.revenue) * 100).toFixed(1) : 0}% MoM
            </span>
          }
          icon={DollarSign}
          bgColor="bg-emerald-50"
        />
        <StatCard
          title="Laba Kotor"
          value={f.grossProfit}
          subtitle={`Margin: ${f.grossMargin}%`}
          icon={TrendingUp}
          trendColor={f.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Laba Bersih"
          value={f.netProfit}
          subtitle={
            <span className="flex items-center gap-1">
              {f.netProfit >= prevF.netProfit ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              {f.netProfit >= prevF.netProfit ? 'Naik' : 'Turun'} {prevF.netProfit !== 0 ? ((Math.abs(f.netProfit - prevF.netProfit) / Math.abs(prevF.netProfit)) * 100).toFixed(1) : 0}% MoM
            </span>
          }
          icon={f.netProfit >= 0 ? TrendingUp : TrendingDown}
          trendColor={f.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          bgColor={f.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard title="Saldo Kas" value={f.kas} subtitle={`Arus: Rp ${f.netCashFlow.toLocaleString('id-ID')}`} icon={Wallet} trendColor={f.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'} bgColor="bg-amber-50" />
      </div>

      {/* Content */}
      {activeTab === 'pnl' && <PnLReport data={f} storeName={store?.store_name} period={periodLabel} logoUrl={store?.logo_url} />}
      {activeTab === 'balance' && <BalanceSheetReport data={f} storeName={store?.store_name} period={periodLabel} logoUrl={store?.logo_url} />}
      {activeTab === 'cashflow' && <CashFlowReport data={f} storeName={store?.store_name} period={periodLabel} logoUrl={store?.logo_url} />}
    </div>
  );
}

// =====================================================
// CSS for tabel laporan keuangan with warna & border
// =====================================================
const tableStyle = "w-full text-sm border-collapse";
const thStyle = "bg-slate-700 text-white font-semibold text-left py-2.5 px-4 border border-slate-600 text-xs uppercase tracking-wider";
const tdStyle = "py-2 px-4 border border-slate-200";
const sectionStyle = "bg-blue-600 text-white font-bold";
const subtotalStyle = "bg-blue-50 font-bold text-slate-800";
const totalStyle = "bg-blue-700 text-white font-bold text-base";

// =====================================================
// LAPORAN LABA RUGI — TABEL FORMAT PERUSAHAAN
// =====================================================
function PnLReport({ data, storeName, period, logoUrl }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <table id="print-pnl" className={tableStyle}>
          <thead>
            <tr><th colSpan="3" className="bg-white text-center py-6 border-b-2 border-slate-300">
              {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 mx-auto mb-2 rounded-lg object-cover" />}
              <div className="font-bold text-lg uppercase tracking-wide text-slate-900">{storeName || 'TRADIXA'}</div>
              <div className="font-bold text-sm uppercase text-slate-700 mt-1">LAPORAN LABA RUGI</div>
              <div className="text-xs text-slate-500 mt-0.5">{period}</div>
            </th></tr>
            <tr>
              <th className={thStyle}>KETERANGAN</th>
              <th className={`${thStyle} text-right`}>SUB JUMLAH</th>
              <th className={`${thStyle} text-right`}>JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">Pendapatan</td></tr>
            <tr><td className={tdStyle + " pl-8"}>Pendapatan Penjualan</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.revenue + data.totalDiscount)}</td><td className={tdStyle}></td></tr>
            {data.totalDiscount > 0 && <tr><td className={tdStyle + " pl-8 text-red-600"}>Potongan & Retur Penjualan</td><td className={tdStyle + " text-right font-mono text-red-600"}>({fmt(data.totalDiscount)})</td><td className={tdStyle}></td></tr>}
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Pendapatan Bersih</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.revenue)}</td></tr>

            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">Harga Pokok Penjualan</td></tr>
            <tr><td className={tdStyle + " pl-8"}>Harga Pokok Barang Terjual</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.hpp)}</td><td className={tdStyle}></td></tr>
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Total Beban Pokok Penjualan</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.hpp)}</td></tr>

            <tr className="bg-emerald-50 font-bold border-y-2 border-emerald-300"><td className={tdStyle + " pl-4 text-emerald-800"}>Laba Kotor</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono text-emerald-800"}>{fmt(data.grossProfit)}</td></tr>

            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">Biaya Operasional dan Administrasi Umum</td></tr>
            {Object.entries(data.opex).length === 0 ? (
              <tr><td className={tdStyle + " pl-8 italic text-slate-400"}>(Belum ada pencatatan)</td><td className={tdStyle + " text-right font-mono"}>Rp 0</td><td className={tdStyle}></td></tr>
            ) : (
              Object.entries(data.opex).map(([cat, val]) => (
                <tr key={cat}><td className={tdStyle + " pl-8"}>Biaya {cat.toLowerCase()}</td><td className={tdStyle + " text-right font-mono"}>{fmt(val)}</td><td className={tdStyle}></td></tr>
              ))
            )}
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Total Biaya Operasional</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.totalOpex)}</td></tr>

            <tr className={totalStyle}><td className="py-3 px-4 border border-slate-700">Laba Bersih</td><td className="py-3 px-4 border border-slate-700"></td><td className="py-3 px-4 border border-slate-700 text-right font-mono">{data.netProfit < 0 ? `(${fmt(data.netProfit)})` : fmt(data.netProfit)}</td></tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// =====================================================
// NERACA — TABEL FORMAT PERUSAHAAN
// =====================================================
function BalanceSheetReport({ data, storeName, period, logoUrl }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <table id="print-balance" className={tableStyle}>
          <thead>
            <tr><th colSpan="3" className="bg-white text-center py-6 border-b-2 border-slate-300">
              {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 mx-auto mb-2 rounded-lg object-cover" />}
              <div className="font-bold text-lg uppercase tracking-wide text-slate-900">{storeName || 'TRADIXA'}</div>
              <div className="font-bold text-sm uppercase text-slate-700 mt-1">NERACA (BALANCE SHEET)</div>
              <div className="text-xs text-slate-500 mt-0.5">{period}</div>
            </th></tr>
            <tr><th className={thStyle}>KETERANGAN</th><th className={`${thStyle} text-right`}>SUB JUMLAH</th><th className={`${thStyle} text-right`}>JUMLAH</th></tr>
          </thead>
          <tbody>
            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">ASET</td></tr>
            <tr className="bg-slate-50"><td colSpan="3" className={tdStyle + " font-semibold text-slate-600 text-xs uppercase"}>Aset Lancar</td></tr>
            <tr><td className={tdStyle + " pl-8"}>Kas & Setara Kas</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.kas)}</td><td className={tdStyle}></td></tr>
            <tr className="bg-slate-50/50"><td className={tdStyle + " pl-8"}>Piutang Usaha</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.piutang)}</td><td className={tdStyle}></td></tr>
            <tr><td className={tdStyle + " pl-8"}>Persediaan Barang Dagang</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.persediaan)}</td><td className={tdStyle}></td></tr>
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Total Aset</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.totalAssets)}</td></tr>

            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">KEWAJIBAN</td></tr>
            <tr><td className={tdStyle + " pl-8"}>Hutang Usaha</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.hutang)}</td><td className={tdStyle}></td></tr>
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Total Kewajiban</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.hutang)}</td></tr>

            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">EKUITAS</td></tr>
            <tr><td className={tdStyle + " pl-8"}>Modal Disetor</td><td className={tdStyle + " text-right font-mono"}>Rp 0</td><td className={tdStyle}></td></tr>
            <tr className="bg-slate-50/50"><td className={tdStyle + " pl-8"}>Laba Ditahan</td><td className={tdStyle + " text-right font-mono"}>{fmt(data.retainedEarnings)}</td><td className={tdStyle}></td></tr>
            <tr className={subtotalStyle}><td className={tdStyle + " pl-4"}>Total Ekuitas</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono"}>{fmt(data.equity)}</td></tr>

            <tr className={totalStyle}><td className="py-3 px-4 border border-slate-700">Total Kewajiban + Ekuitas</td><td className="py-3 px-4 border border-slate-700"></td><td className="py-3 px-4 border border-slate-700 text-right font-mono">{fmt(data.hutang + data.equity)}</td></tr>

            <tr>
              <td colSpan="3" className="p-0 border-t-2 border-slate-300">
                <div className={`flex items-center justify-center gap-3 py-4 ${Math.abs(data.totalAssets - (data.hutang + data.equity)) < 1 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                  <div className="text-xl font-black uppercase tracking-widest">
                    {Math.abs(data.totalAssets - (data.hutang + data.equity)) < 1 ? '✓ Balanced' : '✕ Unbalanced'}
                  </div>
                  <div className="w-px h-8 bg-white/30" />
                  <div className="text-sm font-medium">
                    {Math.abs(data.totalAssets - (data.hutang + data.equity)) < 1
                      ? 'Persamaan Akuntansi: Aset = Kewajiban + Ekuitas'
                      : `Terdapat Selisih: Rp ${Math.abs(data.totalAssets - (data.hutang + data.equity)).toLocaleString('id-ID')}`}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// =====================================================
// ARUS KAS — TABEL FORMAT PERUSAHAAN
// =====================================================
function CashFlowReport({ data, storeName, period, logoUrl }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <table id="print-cashflow" className={tableStyle}>
          <thead>
            <tr><th colSpan="3" className="bg-white text-center py-6 border-b-2 border-slate-300">
              {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 mx-auto mb-2 rounded-lg object-cover" />}
              <div className="font-bold text-lg uppercase tracking-wide text-slate-900">{storeName || 'TRADIXA'}</div>
              <div className="font-bold text-sm uppercase text-slate-700 mt-1">LAPORAN ARUS KAS</div>
              <div className="text-xs text-slate-500 mt-0.5">Metode Langsung — {period}</div>
            </th></tr>
            <tr><th className={thStyle}>KETERANGAN</th><th className={`${thStyle} text-right`}>SUB JUMLAH</th><th className={`${thStyle} text-right`}>JUMLAH</th></tr>
          </thead>
          <tbody>
            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">Arus Kas Masuk (Cash Inflows)</td></tr>
            {Object.entries(data.cashIn).length === 0 ? (
              <tr><td className={tdStyle + " pl-8 italic text-slate-400"}>(Belum ada)</td><td className={tdStyle + " text-right font-mono"}>Rp 0</td><td className={tdStyle}></td></tr>
            ) : (
              Object.entries(data.cashIn).map(([cat, val]) => <tr key={cat}><td className={tdStyle + " pl-8"}>{cat}</td><td className={tdStyle + " text-right font-mono"}>{fmt(val)}</td><td className={tdStyle}></td></tr>)
            )}
            <tr className="bg-emerald-50 font-bold"><td className={tdStyle + " pl-4 text-emerald-800"}>Total Kas Masuk</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono text-emerald-800"}>{fmt(data.totalCashIn)}</td></tr>

            <tr className={sectionStyle}><td colSpan="3" className="py-2 px-4 border border-blue-500">Arus Kas Keluar (Cash Outflows)</td></tr>
            {Object.entries(data.cashOut).length === 0 ? (
              <tr><td className={tdStyle + " pl-8 italic text-slate-400"}>(Belum ada)</td><td className={tdStyle + " text-right font-mono"}>Rp 0</td><td className={tdStyle}></td></tr>
            ) : (
              Object.entries(data.cashOut).map(([cat, val]) => <tr key={cat}><td className={tdStyle + " pl-8"}>{cat}</td><td className={tdStyle + " text-right font-mono text-red-600"}>({fmt(val)})</td><td className={tdStyle}></td></tr>)
            )}
            <tr className="bg-red-50 font-bold"><td className={tdStyle + " pl-4 text-red-700"}>Total Kas Keluar</td><td className={tdStyle}></td><td className={tdStyle + " text-right font-mono text-red-700"}>({fmt(data.totalCashOut)})</td></tr>

            <tr className={totalStyle}><td className="py-3 px-4 border border-slate-700">Arus Kas Bersih (Net Cash Flow)</td><td className="py-3 px-4 border border-slate-700"></td><td className="py-3 px-4 border border-slate-700 text-right font-mono">{data.netCashFlow < 0 ? `(${fmt(data.netCashFlow)})` : fmt(data.netCashFlow)}</td></tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
