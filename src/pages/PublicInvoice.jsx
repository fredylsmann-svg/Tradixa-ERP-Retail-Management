import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import PrintInvoice from '@/components/invoice/PrintInvoice';

export default function PublicInvoice() {
  const { type, id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [store, setStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id, type]);

  const loadData = async () => {
    try {
      console.log('Loading Public Invoice:', { type, id });
      // Normalizing entity name: 'payable' -> 'Payable', 'receivable' -> 'Receivable'
      let entityName = type.charAt(0).toUpperCase() + type.slice(1);
      if (type === 'sales') entityName = 'SalesTransaction';
      const data = await api.entities[entityName].get(id);

      if (data) {
        setInvoice(data);
        const storeData = await api.entities.Store.get(data.store_id);
        setStore(storeData);
      } else {
        setError('Data invoice tidak ditemukan atau sudah dihapus.');
      }
    } catch (err) {
      console.error('Public Invoice Error:', err);
      setError('Terjadi kesalahan saat memuat data. Mohon coba lagi nanti.');
    }
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value);

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-amber-100 text-amber-700',
      Partial: 'bg-blue-600 text-white font-bold',
      Paid: 'bg-emerald-100 text-emerald-700',
      Overdue: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-slate-100'} variant="outline">{status}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">{error || 'Invoice Tidak Ditemukan'}</h2>
          <p className="text-slate-500 text-sm">Pastikan link yang Anda gunakan sudah benar atau hubungi pihak toko untuk konfirmasi ulang.</p>
        </div>
      </div>
    );
  }

  // For sales invoices, render using the same PrintInvoice component
  if (type === 'sales') {
    return <PrintInvoice invoice={invoice} store={store} onClose={() => window.history.back()} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/50 py-8 px-4 sm:px-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 0mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          #invoice-main-container { 
            border: none !important; 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: none !important;
            padding: 0 !important;
          }
          #invoice-inner-content {
            padding: 1.5cm !important;
            border: none !important;
          }
          .flex-1 { overflow: visible !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div id="invoice-main-container" className="max-w-4xl mx-auto space-y-6">
        <div className="no-print flex items-center justify-between gap-4 p-4 bg-white rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Official Viewer</p>
              <p className="text-sm font-bold text-slate-900 italic">Tradixa Certified Document</p>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold gap-2 h-11 px-6">
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </Button>
        </div>

        <div id="invoice-inner-content" className="bg-white rounded-xl shadow-2xl shadow-blue-100/40 p-8 md:p-16 border border-slate-200 overflow-hidden relative min-h-[1000px] flex flex-col">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-35deg] select-none">
            <h1 className="text-[150px] font-black tracking-tighter">TRADIXA</h1>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 relative z-10">
            <div className="space-y-6">
              {store?.logo_url ? (
                <img src={store.logo_url} alt="Logo" className="h-20 w-auto object-contain" />
              ) : (
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-3xl">
                  {store?.store_name?.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{store?.store_name}</h2>
                <p className="text-xs font-bold text-slate-500 max-w-xs mt-3 leading-relaxed uppercase opacity-80">{store?.address}</p>
              </div>
            </div>
            <div className="text-left md:text-right space-y-1">
              <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic opacity-5 leading-none mb-2">INVOICE</h1>
              <p className="text-lg font-black text-blue-600">{invoice.invoice_number}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Published: {invoice.timestamp_wib}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-y-2 py-10 border-slate-100 relative z-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bill To ({type === 'payable' ? 'Supplier' : 'Customer'})</label>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">{type === 'payable' ? invoice.supplier_name : invoice.customer_name}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digital Verified Identity</p>
              </div>
            </div>
            <div className="text-left md:text-right space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Terms</label>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 italic">Due Date: <span className="text-red-600 not-italic font-black ml-2 underline decoration-red-100">{invoice.due_date}</span></p>
                <div className="flex md:justify-end mt-3">{getStatusBadge(invoice.status)}</div>
              </div>
            </div>
          </div>

          {/* Amount Details */}
          <div className="space-y-6 mt-16 flex-grow relative z-10">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4 italic underline decoration-blue-100 decoration-4 underline-offset-8">Financial Breakdown</label>
            <div className="border-2 border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b-2 border-slate-100">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="p-6 text-left">Description</th>
                    <th className="p-6 text-right">Amount (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50 font-medium">
                  <tr>
                    <td className="p-6 text-slate-600">
                      <p className="font-bold text-slate-800">Principal Invoice Value</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total recorded liability/receivable</p>
                    </td>
                    <td className="p-6 text-right font-black text-slate-900 text-lg">Rp {formatCurrency(invoice.amount)}</td>
                  </tr>
                  <tr className="bg-emerald-50/20">
                    <td className="p-6 text-emerald-800">
                      <p className="font-bold">Total Paid / Settled</p>
                      <p className="text-[10px] uppercase font-bold text-emerald-400 mt-1">Confirmed payments received</p>
                    </td>
                    <td className="p-6 text-right font-black text-emerald-600 text-lg">- Rp {formatCurrency(invoice.paid_amount || 0)}</td>
                  </tr>
                  <tr className="bg-blue-600 text-white shadow-inner">
                    <td className="p-8">
                      <p className="font-black uppercase text-sm tracking-widest">Total Outstanding Balance</p>
                      <p className="text-[10px] uppercase font-bold text-blue-200 mt-1">Net amount due for settlement</p>
                    </td>
                    <td className="p-8 text-right font-black text-4xl italic tracking-tighter">Rp {formatCurrency(invoice.remaining_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Notes & Signatures */}
          <div className="mt-16 pt-12 border-t-2 border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-12 items-end relative z-10">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Notes & Instructions</p>
              <div className="text-[11px] text-slate-500 italic font-medium leading-relaxed bg-slate-50 p-6 rounded-xl border-2 border-slate-100">
                "{invoice.notes || 'This is a system-generated document. Digital verification is active.'}"
                <div className="mt-4 pt-4 border-t border-slate-200 not-italic font-black text-slate-800 uppercase tracking-tighter">
                  * Payment must be completed before {invoice.due_date}
                </div>
              </div>

              {/* Manual Signature Path for Receiver/Customer */}
              <div className="pt-8 flex flex-col items-start gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Penerima / {type === 'payable' ? 'Supplier' : 'Pelanggan'}</p>
                <div className="w-48 h-24 border-b-2 border-slate-200 flex items-end justify-center pb-2">
                  <span className="text-[10px] font-bold text-slate-300 italic">( Tanda Tangan & Nama Terang )</span>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right space-y-8 flex flex-col items-end">
              <div className="flex flex-col items-end gap-4 w-full">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Otorisasi Toko / Finance</p>
                {/* Signature Box as per Image 1 request */}
                <div className="w-64 h-32 bg-white rounded-3xl border-2 border-slate-100 shadow-sm relative flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-slate-50/50" />
                  <div className="relative z-10 text-center space-y-2">
                    <div className="p-3 bg-white rounded-xl shadow-sm inline-block border border-slate-100">
                      <p className="text-xs font-black text-slate-900 tracking-tighter mb-1">VALIDATED SYSTEM</p>
                      <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest italic opacity-60">Digital Authenticated</p>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 h-px bg-slate-200" />
                  <p className="absolute bottom-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">Authorized Path</p>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mr-2 italic">Ref ID: {id.substring(0, 12).toUpperCase()}</p>
              </div>
              <div className="pt-4 opacity-40 flex items-center md:justify-end gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">T</div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-900 uppercase italic leading-none">TRADIXA SYSTEMS</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Cloud Financial Infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] pt-8 pb-12">
          &copy; 2026 {store?.store_name?.toUpperCase()} &bull; TRADIXA ENTERPRISE SOLUTION
        </p>
      </div>
    </div>
  );
}
