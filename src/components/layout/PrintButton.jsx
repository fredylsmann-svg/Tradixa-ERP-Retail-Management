import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PrintButton - Global print utility untuk semua modul.
 * Akan mencetak konten dengan format standar perusahaan:
 * - Logo + Nama Toko di header
 * - Judul Laporan + Tanggal
 * - Tabel rapi yang bisa copy-paste
 * 
 * @param {string} title - Judul laporan, e.g. "Sales Transaction"
 * @param {string} date - Tanggal yang ditampilkan, e.g. "Senin, 21 April 2026"
 * @param {string} storeName - Nama toko/perusahaan
 * @param {string} storeAddress - Alamat toko
 * @param {string} storeLogoUrl - URL logo toko (optional)
 * @param {string} contentId - ID elemen HTML yang akan dicetak
 */
export default function PrintButton({ title, date, storeName, storeAddress, storeLogoUrl, contentId }) {
  const handlePrint = () => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const tableHTML = content.innerHTML;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${storeName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20mm 15mm;
            color: #1e293b;
            font-size: 11pt;
            line-height: 1.4;
          }
          
          /* Header Perusahaan */
          .print-header {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .print-header img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 6px;
          }
          .print-header .company-name {
            font-size: 16pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .print-header .company-address {
            font-size: 9pt;
            color: #64748b;
            margin-top: 2px;
          }
          .print-header .report-title {
            font-size: 13pt;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 12px;
            letter-spacing: 0.5px;
          }
          .print-header .report-date {
            font-size: 10pt;
            color: #475569;
            margin-top: 2px;
          }

          /* Table Styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10pt;
          }
          th {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #475569;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 10px;
            vertical-align: top;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          tr:hover { background-color: #f1f5f9; }

          /* Badge & formatting removal for clean print */
          .badge, [class*="badge"], [class*="Badge"] {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            font-weight: 600;
          }
          button, [class*="btn"], [class*="Button"] { display: none !important; }
          svg { display: none !important; }
          
          /* Utility */
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-medium { font-weight: 500; }

          /* Footer */
          .print-footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 8pt;
            color: #94a3b8;
            text-align: center;
          }

          @media print {
            body { padding: 10mm; }
            @page { margin: 10mm; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          ${storeLogoUrl ? `<img src="${storeLogoUrl}" alt="Logo" />` : ''}
          <div class="company-name">${storeName || 'TRADIXA'}</div>
          ${storeAddress ? `<div class="company-address">${storeAddress}</div>` : ''}
          <div class="report-title">${title}</div>
          <div class="report-date">${date}</div>
        </div>
        
        <div class="print-content">
          ${tableHTML}
        </div>

        <div class="print-footer">
          Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} &middot; ${storeName || 'Tradixa POS'}
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!printWindow) { window.alert('Pop-up blocked. Izinkan pop-up untuk mencetak.'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50">
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">Print</span>
    </Button>
  );
}
