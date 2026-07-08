import React, { useState, useEffect } from 'react';
import { X, Printer, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDocumentTemplate } from '@/utils/documentTemplates';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/api/client';

export default function PrintInvoice({ invoice, store, onClose, forceThermal = false, type = 'INVOICE' }) {
  const [printLayout, setPrintLayout] = useState(forceThermal ? 'Thermal' : (store?.invoice_layout_style || 'Modern'));
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (invoice?.customer_id) {
      api.entities.Customer.get(invoice.customer_id)
        .then(data => {
          if (data) {
            setCustomer(data);
          }
        })
        .catch(err => console.error('[PrintInvoice] Failed to fetch customer:', err));
    }
  }, [invoice?.customer_id]);

  const isPaidPro = (store?.plan === 'pro' && store?.has_used_trial === false) || store?.plan === 'premium' || store?.plan === 'enterprise';

  const handlePrint = () => {
    window.print();
  };

  // Persiapkan data item untuk template
  const mappedItems = invoice?.items?.map(item => {
    let displayName = item.product_name;
    if (item.uom) {
      if (item.qty_per_base && item.qty_per_base > 1) {
        displayName += ` [${item.uom} (${item.qty_per_base} Pcs)]`;
      } else {
        displayName += ` [${item.uom}]`;
      }
    }
    return {
      name: displayName,
      qty: item.quantity,
      price: item.unit_price,
      total: item.subtotal,
      unit: item.uom || 'Pcs'
    };
  }) || [];

  // Generate HTML dari template engine
  const invoiceHtml = getDocumentTemplate({
    type: type,
    storeName: store?.store_name,
    logoUrl: store?.logo_url,
    brandColor: store?.brand_color || '#2563eb',
    titleColor: store?.title_color || '#0f172a',
    signatureUrl: store?.signature_url,
    ownerName: store?.owner_name,
    ownerPosition: store?.owner_position,
    layout: printLayout,
    isPaidPro: isPaidPro,
    data: {
      invoice_number: invoice?.invoice_number,
      date: invoice?.timestamp_wib?.split(' ')[0],
      time: invoice?.timestamp_wib?.split(' ')[1],
      customer_name: invoice?.customer_name,
      items: mappedItems,
      discount: invoice?.discount || 0,
      total: invoice?.total,
      payment_method: invoice?.payment_method,
      status: invoice?.payment_status || invoice?.status,
      due_date: invoice?.due_date || '-',
      bill_amount: invoice?.amount,
      settled_amount: invoice?.paid_amount,
      remaining_amount: invoice?.remaining_amount,
      supplier_name: invoice?.supplier_name,
      store_address: store?.address || 'Alamat Toko Belum Diatur',
      store_phone: store?.phone || '-',
      store_email: store?.email || '-',
      tax_amount: invoice?.tax_amount || 0,
      tax_percentage: invoice?.tax_percentage || 0,
      customer_address: customer?.address || '-',
      customer_phone: customer?.phone || '-',
      customer_email: customer?.email || '-'
    }
  });

  return (
    <Dialog open={true} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent hideClose hideFullscreen className="!max-w-none !w-full !h-full !m-0 !p-0 !rounded-none border-none overflow-auto bg-white z-[9999] flex flex-col">
        {/* Inject print margin overrides for Thermal layout */}
        {printLayout === 'Thermal' && (
          <style>{`
          @media print {
            @page { margin: 0; }
            body { margin: 0; }
          }
        `}</style>
        )}

        {/* Kontrol di atas yang tidak ikut diprint */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b z-20 pl-6 pr-24 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Print Preview</h2>
              <p className="text-xs text-slate-500">Invoice #{invoice?.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border text-sm font-medium text-slate-600">
              <Printer className="w-4 h-4 text-slate-500" /> {printLayout === 'Thermal' ? 'Struk Thermal' : `Standard (${printLayout})`}
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 shadow-lg">
              Cetak Sekarang
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Area Invoice */}
        <div className="bg-slate-100 min-h-screen py-12 flex justify-center items-start print:bg-white print:py-0">
          <div className={`${printLayout === 'Thermal' ? 'w-[300px] shadow-md' : 'w-full max-w-[850px] shadow-2xl'} h-fit bg-white print:shadow-none mx-auto overflow-hidden`}>
            <div dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
