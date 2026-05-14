import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings2 } from 'lucide-react';
import Barcode from 'react-barcode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BarcodePrintModal({ open, onClose, products = [], store }) {
  const [paperSize, setPaperSize] = useState('100x150'); // '33x15', '100x150', 'A4'
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    const printElement = document.getElementById('printable-barcodes');
    if (!printElement) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: white; }
            @media print {
              @page { margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div style="display: block; width: 100%;">
            ${printElement.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const iframeDoc = iframe.contentWindow || iframe.contentDocument;
    if (iframeDoc.document) {
      iframeDoc.document.open();
      iframeDoc.document.write(htmlContent);
      iframeDoc.document.close();
    } else {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
    }

    // Clean up the iframe after a while to avoid memory leaks
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000); // Remove after 1 minute
  };

  if (!products || products.length === 0) return null;

  // We use pure inline styles here so that when innerHTML is copied to the new window, it looks exactly identical without relying on Tailwind CSS.
  const printableContent = (
    <div id="printable-barcodes" style={{ display: 'none' }}>
      {products.map((p, idx) => {
        const barcodeValue = p.barcode || p.sku || `PRD-${p.id.substring(0,6)}`;
        const formatPrice = (price) => price ? price.toLocaleString('id-ID') : '0';
        
        if (paperSize === '100x150') {
          return (
            <div key={idx} style={{ width: '100mm', height: '150mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10mm', textAlign: 'center', boxSizing: 'border-box', pageBreakAfter: 'always', pageBreakInside: 'avoid', margin: '0 auto' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{store?.store_name || 'Toko Anda'}</h1>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px', width: '100%', wordWrap: 'break-word' }}>{p.name}</h2>
              <Barcode value={barcodeValue} width={2.5} height={120} fontSize={18} margin={0} />
              <p style={{ fontSize: '30px', fontWeight: '900', marginTop: '32px', letterSpacing: '-1px' }}>Rp {formatPrice(p.sell_price)}</p>
            </div>
          );
        }
        
        if (paperSize === '33x15') {
          return (
            <div key={idx} style={{ width: '33mm', height: '15mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1mm', textAlign: 'center', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
              <p style={{ fontSize: '7px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', lineHeight: '1', marginBottom: '1mm' }}>{p.name}</p>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'top' }}>
                <Barcode value={barcodeValue} width={1} height={20} fontSize={10} margin={0} />
              </div>
            </div>
          );
        }

        // A4 Layout
        return (
          <div key={idx} style={{ width: '45mm', height: '25mm', border: '1px dashed #cbd5e1', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px', textAlign: 'center', margin: '4px', boxSizing: 'border-box', pageBreakInside: 'avoid', verticalAlign: 'top' }}>
            <p style={{ fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', marginBottom: '4px' }}>{p.name}</p>
            <div style={{ transform: 'scale(0.7)', transformOrigin: 'top' }}>
              <Barcode value={barcodeValue} width={1.2} height={30} fontSize={12} margin={0} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Configuration Dialog (Screen Only) */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              Cetak Barcode ({products.length} Produk)
            </DialogTitle>
          </DialogHeader>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4 mb-4">
            <Settings2 className="w-8 h-8 text-blue-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">Ukuran Kertas Printer</p>
              <Select value={paperSize} onValueChange={setPaperSize}>
                <SelectTrigger className="bg-white border-blue-200 h-9">
                  <SelectValue placeholder="Pilih ukuran kertas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100x150">Resi Thermal Besar (100mm x 150mm)</SelectItem>
                  <SelectItem value="33x15">Stiker Label Kecil (33mm x 15mm)</SelectItem>
                  <SelectItem value="A4">Kertas HVS Biasa (A4 Matrix)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6 flex flex-col items-center justify-center max-h-[40vh] overflow-y-auto">
            <p className="text-xs text-slate-400 mb-4 font-medium tracking-widest uppercase">Preview Layout ({paperSize})</p>
            
            {/* Minimalist Preview */}
            <div className={`bg-white border shadow-sm flex flex-col items-center justify-center relative ${paperSize === '100x150' ? 'w-[300px] aspect-[2/3] p-6' : paperSize === '33x15' ? 'w-[200px] h-[90px] p-2' : 'w-[300px] h-[400px] p-6'}`}>
               {products[0] && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center">
                    {paperSize === '100x150' && <p className="font-bold text-lg mb-2 truncate w-full">{store?.store_name || 'Toko Anda'}</p>}
                    <p className={`font-medium text-slate-800 truncate w-full ${paperSize === '33x15' ? 'text-[10px] mb-1' : 'text-sm mb-2'}`}>
                      {products[0].name}
                    </p>
                    <div className="w-full flex justify-center scale-[0.8] origin-top">
                      <Barcode 
                        value={products[0].barcode || products[0].sku || `PRD-${products[0].id.substring(0,6)}`} 
                        width={paperSize === '33x15' ? 1.2 : 2}
                        height={paperSize === '33x15' ? 30 : 60}
                        fontSize={paperSize === '33x15' ? 10 : 14}
                        margin={0}
                        displayValue={true}
                      />
                    </div>
                    {paperSize === '100x150' && (
                      <p className="font-black text-xl mt-4">Rp {products[0].sell_price?.toLocaleString('id-ID')}</p>
                    )}
                  </div>
               )}
               {products.length > 1 && (
                 <div className="absolute bg-black/80 text-white text-xs px-3 py-1 rounded-full bottom-4">
                   + {products.length - 1} label lainnya
                 </div>
               )}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">Preview ini hanya menampilkan 1 produk sebagai contoh.<br/>Sebanyak {products.length} produk akan dicetak saat Anda menekan tombol Cetak.</p>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Render Printable Content via Portal to completely bypass Dialog hidden styles */}
      {mounted && open && createPortal(printableContent, document.body)}
    </>
  );
}
