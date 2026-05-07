import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function PrintPayment({ payment, store, onClose }) {
  const [printLayout, setPrintLayout] = useState('Modern');

  const handlePrint = () => {
    window.print();
  };

  // Map BankTransaction to Template Data
  const mappedItems = [{
    name: payment.description || 'Pembayaran',
    qty: 1,
    price: payment.amount,
    total: payment.amount
  }];

  const paymentHtml = getDocumentTemplate({
    type: 'PAYMENT',
    storeName: store?.store_name,
    logoUrl: store?.logo_url,
    brandColor: store?.brand_color || '#2563eb',
    titleColor: store?.title_color || '#0f172a',
    signatureUrl: store?.signature_url,
    ownerName: store?.owner_name,
    ownerPosition: store?.owner_position,
    layout: printLayout,
    data: {
      invoice_number: payment.reference || payment.id?.substring(0, 8),
      date: payment.timestamp_wib?.split(' ')[0],
      time: payment.timestamp_wib?.split(' ')[1],
      customer_name: payment.transaction_type === 'Credit' ? 'Customer / Pelanggan' : 'Supplier / Vendor',
      items: mappedItems,
      total: payment.amount,
      payment_method: payment.bank_name || 'Transfer',
      status: 'Paid'
    }
  });

  return (
    <Dialog open={true} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent hideClose className="!max-w-none !w-full !h-full !m-0 !p-0 !rounded-none border-none overflow-auto bg-white z-[9999] flex flex-col">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b z-20 px-6 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Cetak Kuitansi</h2>
              <p className="text-xs text-slate-500">Ref: {payment.reference || payment.id?.substring(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
              Cetak Sekarang
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="bg-slate-100 min-h-screen py-12 flex justify-center items-start print:bg-white print:py-0">
          <div className="w-full max-w-[850px] shadow-2xl h-fit bg-white print:shadow-none mx-auto overflow-hidden">
            <div dangerouslySetInnerHTML={{ __html: paymentHtml }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
