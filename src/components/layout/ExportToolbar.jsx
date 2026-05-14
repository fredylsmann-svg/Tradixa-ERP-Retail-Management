import { Button } from '@/components/ui/button';
import PremiumGate from '@/components/ui/PremiumGate';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';

/**
 * ExportToolbar — Global export utility: Print, PDF, Excel
 * Format standar perusahaan dengan logo, tanggal, tabel yang rapi saat copy-paste.
 * Kolom "Aksi" otomatis disembunyikan saat export.
 */

function buildPrintHTML(title, date, storeName, storeAddress, storeLogoUrl, tableHTML) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
    <title>${title} - ${storeName}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:15mm;color:#1e293b;font-size:10pt;line-height:1.5}
      .print-header{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:14px;margin-bottom:24px}
      .print-header img{width:48px;height:48px;object-fit:cover;border-radius:8px;margin-bottom:6px}
      .print-header .company-name{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:1px}
      .print-header .company-address{font-size:8pt;color:#64748b;margin-top:2px}
      .print-header .report-title{font-size:12pt;font-weight:700;text-transform:uppercase;margin-top:12px;letter-spacing:.5px}
      .print-header .report-date{font-size:9pt;color:#475569;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:8px}
      th{background-color:#eef2f7;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-weight:600;font-size:8pt;text-transform:uppercase;letter-spacing:.3px;color:#475569}
      td{border:1px solid #e2e8f0;padding:5px 8px;vertical-align:top}
      tr:nth-child(even){background-color:#f8fafc}
      /* Hide action columns and interactive elements */
      .no-print,th:last-child.aksi-col,td:last-child.aksi-col{display:none!important}
      button,svg,[class*="ghost"]{display:none!important}
      .badge,[class*="badge"],[class*="Badge"]{background:none!important;border:none!important;padding:0!important;font-weight:600;display:inline!important}
      .text-right{text-align:right}.text-center{text-align:center}.font-bold{font-weight:700}.font-medium{font-weight:500}
      .print-footer{margin-top:30px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:7pt;color:#94a3b8;text-align:center}
      @media print{body{padding:8mm}@page{margin:8mm;size:A4}}
    </style></head><body>
    <div class="print-header">
      ${storeLogoUrl ? `<img src="${storeLogoUrl}" alt="Logo" />` : ''}
      <div class="company-name">${storeName || 'LAPORAN SISTEM'}</div>
      ${storeAddress ? `<div class="company-address">${storeAddress}</div>` : ''}
      <div class="report-title">${title}</div>
      <div class="report-date">${date}</div>
    </div>
    <div class="print-content">${tableHTML}</div>
    <div class="print-footer">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })} · ${storeName || 'Management System'}</div>
    <script>window.onload=function(){window.print();};</script>
  </body></html>`;
}

function cleanTableHTML(contentId) {
  const el = document.getElementById(contentId);
  if (!el) return '';
  // Temporarily unhide so cloneNode captures full layout
  const wasHidden = el.classList.contains('hidden');
  if (wasHidden) el.classList.remove('hidden');
  const clone = el.cloneNode(true);
  if (wasHidden) el.classList.add('hidden');
  // Remove action columns (last column with buttons/icons)
  clone.querySelectorAll('button, [class*="ghost"]').forEach(b => {
    const cell = b.closest('td') || b.closest('th');
    if (cell) cell.remove();
  });
  // Remove SVG icons
  clone.querySelectorAll('svg').forEach(s => s.remove());
  return clone.innerHTML;
}

function exportToExcel(title, date, storeName, storeAddress, contentId) {
  const tableHTML = cleanTableHTML(contentId);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:spreadsheet">
    <head><meta charset="UTF-8">
    <style>
      table{border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt}
      th{background-color:#4472C4;color:white;font-weight:bold;border:1px solid #8EA9DB;padding:6px 10px;text-align:left}
      td{border:1px solid #D6DCE4;padding:4px 10px}
      tr:nth-child(even){background-color:#D9E2F3}
      .text-right{text-align:right}.text-center{text-align:center}
    </style></head><body>
    <table>
      <tr><td colspan="20" style="font-size:16pt;font-weight:bold;text-align:center;padding:10px;border:none">${storeName || 'LAPORAN BISNIS'}</td></tr>
      ${storeAddress ? `<tr><td colspan="20" style="font-size:9pt;text-align:center;color:#666;padding:2px;border:none">${storeAddress}</td></tr>` : ''}
      <tr><td colspan="20" style="font-size:13pt;font-weight:bold;text-align:center;padding:6px;border:none">${title}</td></tr>
      <tr><td colspan="20" style="font-size:10pt;text-align:center;color:#666;padding:4px;border:none">${date}</td></tr>
      <tr><td colspan="20" style="padding:4px;border:none"></td></tr>
    </table>
    ${tableHTML}
  </body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(title, date, storeName, storeAddress, storeLogoUrl, contentId) {
  const tableHTML = cleanTableHTML(contentId);
  const htmlContent = buildPrintHTML(title, date, storeName, storeAddress, storeLogoUrl, tableHTML);
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) { window.alert('Pop-up blocked! Izinkan pop-up untuk export PDF.'); return; }
  
  // Clean up memory after the new tab has likely loaded
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function ExportToolbar({ title, date, storeName, storeAddress, storeLogoUrl, contentId, store }) {
  return (
    <div className="flex items-center gap-1.5">
      <PremiumGate store={store} featureName="Export PDF & Print">
        <Button variant="outline" size="sm" onClick={() => exportToPDF(title, date, storeName, storeAddress, storeLogoUrl, contentId)} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-8 px-2.5">
          <Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Print</span>
        </Button>
      </PremiumGate>

      <PremiumGate store={store} featureName="Export PDF">
        <Button variant="outline" size="sm" onClick={() => exportToPDF(title, date, storeName, storeAddress, storeLogoUrl, contentId)} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-8 px-2.5">
          <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">PDF</span>
        </Button>
      </PremiumGate>

      <PremiumGate store={store} featureName="Export Excel">
        <Button variant="outline" size="sm" onClick={() => exportToExcel(title, date, storeName, storeAddress, contentId)} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-8 px-2.5">
          <FileSpreadsheet className="w-3.5 h-3.5" /><span className="hidden sm:inline">Excel</span>
        </Button>
      </PremiumGate>
    </div>
  );
}

// Re-export functions for custom usage (e.g., FinancialStatements)
export { exportToPDF, exportToExcel, buildPrintHTML, cleanTableHTML };
