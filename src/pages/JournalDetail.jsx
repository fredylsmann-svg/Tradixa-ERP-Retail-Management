import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Calendar,
  Hash,
  FileText,
  User,
  Printer,
  ChevronRight,
  Info,
  BookOpen,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function JournalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [lines, setLines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coaData, setCoaData] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const entryData = await api.entities.JournalEntry.get(id);
      if (entryData) {
        setEntry(entryData);
        const linesData = await api.entities.JournalLine.filter({ journal_id: id });
        setLines(linesData);

        const coa = await api.entities.COA.filter();
        setCoaData(coa);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async () => {
    toast('Konfirmasi Post Jurnal', {
      description: 'Yakin ingin memposting jurnal ini? Data yang diposting akan masuk ke laporan keuangan.',
      action: {
        label: 'Ya, Post',
        onClick: async () => {
          setIsProcessing(true);
          try {
            await api.entities.JournalEntry.update(id, { status: 'Posted' });
            toast.success('Jurnal berhasil diposting!');
            loadData();
          } catch (e) {
            toast.error('Gagal memposting: ' + e.message);
          } finally {
            setIsProcessing(false);
          }
        }
      },
      cancel: { label: 'Batal' }
    });
  };

  const handleVoid = async () => {
    toast('Konfirmasi Void Jurnal', {
      description: 'Yakin ingin membatalkan (void) jurnal ini?',
      action: {
        label: 'Ya, Void',
        onClick: async () => {
          setIsProcessing(true);
          try {
            await api.entities.JournalEntry.update(id, { status: 'Void' });
            toast.success('Jurnal berhasil divoid!');
            loadData();
          } catch (e) {
            toast.error('Gagal memvoid: ' + e.message);
          } finally {
            setIsProcessing(false);
          }
        }
      },
      cancel: { label: 'Batal' }
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="font-bold text-slate-500">Memuat detail jurnal...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">Jurnal Tidak Ditemukan</h2>
        <Button onClick={() => navigate('/JournalEntries')} className="mt-6">Kembali ke Daftar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-transparent p-4 md:p-8 space-y-8">
      {/* Header Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/JournalEntries')}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Journal Entry</h1>
              <Badge className={
                entry.status === 'Posted' ? 'bg-emerald-100 text-emerald-700' :
                  entry.status === 'Void' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
              }>
                {entry.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Calendar className="w-4 h-4" />
              {new Date(entry.created_at || entry.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => window.print()} variant="ghost" className="h-12 px-6 rounded-2xl bg-white border border-slate-200 font-bold shadow-sm">
            <Printer className="w-4 h-4 mr-2 text-slate-400" />
            Cetak PDF
          </Button>

          {entry.status === 'Draft' && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleVoid}
                disabled={isProcessing}
                className="h-12 px-6 rounded-2xl bg-white border border-red-100 text-red-600 hover:bg-red-50 font-bold"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject / Void
              </Button>
              <Button
                onClick={handlePost}
                disabled={isProcessing}
                className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Post Journal
              </Button>
            </div>
          )}

          {entry.status === 'Posted' && (
            <Button
              variant="ghost"
              onClick={handleVoid}
              disabled={isProcessing}
              className="h-12 px-6 rounded-2xl bg-white border border-red-100 text-red-600 hover:bg-red-50 font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Void Journal
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-blue-600 text-white p-8">
              <CardTitle className="text-xl font-black">Informasi Jurnal</CardTitle>
              <p className="text-slate-400 text-sm font-medium mt-1">Detail referensi dan asal transaksi</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Referensi</p>
                    <p className="font-bold text-slate-900">{entry.transaction_id || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Jurnal</p>
                    <p className="font-bold text-slate-900">{entry.type || 'General'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dibuat Oleh</p>
                    <p className="font-bold text-slate-900">{entry.created_by || 'System'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Deskripsi</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                    "{entry.description}"
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-[11px] font-bold text-blue-700/70 leading-relaxed">
                  Jurnal ini otomatis dihasilkan oleh sistem saat transaksi pelunasan dicatat. Memposting jurnal akan memperbarui laporan neraca dan laba rugi secara real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ledger Lines Column */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-none shadow-sm h-full">
            <CardHeader className="px-8 py-6 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-black text-slate-900">Baris Jurnal (Ledger Entries)</CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors outline-none">
                        <Info className="w-4 h-4 text-blue-500 cursor-pointer" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="max-w-xs p-4 bg-blue-600 text-white border-none rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in duration-200">
                      <p className="font-bold mb-1 text-blue-400">💡 Penting: Sinkronisasi Akun</p>
                      <p className="text-[11px] leading-relaxed">
                        Agar saldo muncul di COA dan Laporan Keuangan, <b>Nama Akun</b> pada baris jurnal ini harus <b>sama persis</b> dengan nama akun yang terdaftar di Chart of Accounts (COA).
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Double Entry Posting</p>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border-none font-bold">
                {lines.length} Baris
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-4 text-left">Kode / Akun</th>
                    <th className="px-8 py-4 text-left">Keterangan Baris</th>
                    <th className="px-8 py-4 text-right">Debit (Rp)</th>
                    <th className="px-8 py-4 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono text-sm">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className={`space-y-1 ${line.credit > 0 ? 'pl-8' : ''}`}>
                          <p className="font-black text-slate-900">{line.account_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {(() => {
                              const match = coaData.find(c => {
                                const cName = (c.name || '').toLowerCase().trim();
                                const lName = (line.account_name || '').toLowerCase().trim();
                                return cName === lName || cName.includes(lName) || lName.includes(cName);
                              });
                              return match ? `${match.code} (${match.category})` : 'AUTO-GEN';
                            })()}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-medium italic">{line.description}</td>
                      <td className="px-8 py-6 text-right font-black text-slate-900">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-900">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-600 text-white">
                    <td colSpan="2" className="px-8 py-6 font-black uppercase tracking-widest text-right">Total Akhir</td>
                    <td className="px-8 py-6 text-right font-black text-lg">Rp {formatCurrency(entry.total_debit)}</td>
                    <td className="px-8 py-6 text-right font-black text-lg">Rp {formatCurrency(entry.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="p-8 flex items-center justify-center gap-2">
                <div className={`flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] ${entry.total_debit === entry.total_credit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {entry.total_debit === entry.total_credit ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {entry.total_debit === entry.total_credit ? 'Balance Verified' : 'Unbalanced Journal'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
