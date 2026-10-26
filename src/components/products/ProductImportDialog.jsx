import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle, XCircle,
  SkipForward, RefreshCw, ImagePlus, ChevronLeft, ChevronRight, Info, X, PackagePlus,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { toast as sonnerToast } from 'sonner';
import { getEffectiveLimits, DEV_EMAILS } from '@/planConfig';
import { useAuth } from '@/lib/AuthContext';
import { UNITS } from '@/components/products/ProductForm';
import { formatNumber } from '@/components/utils/currencyFormatter';
import {
  IMPORT_BATCH_SIZE, MAX_IMPORT_ROWS,
  downloadImportTemplate, parseImportFile, fetchExistingProducts,
  validateImportRows, summarizeRows, toRpcPayload, downloadIssueReport,
} from '@/utils/productImport';

const PAGE_SIZE = 50;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB — sama dengan ProductForm
const PHOTO_CONCURRENCY = 3;

const ACTION_BADGE = {
  insert: { label: 'Baru', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  update: { label: 'Update', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  skip: { label: 'Lewati', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const fileBaseName = (name) => name.replace(/\.[^.]+$/, '').trim().toLowerCase();

export default function ProductImportDialog({ open, onClose, store, categories = [], onSuccess }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // upload | preview | processing | done
  const [mode, setMode] = useState('skip');
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [unknownHeaders, setUnknownHeaders] = useState([]);
  const [locations, setLocations] = useState({ warehouses: [], racks: [] });
  const [existingProducts, setExistingProducts] = useState([]);
  const [stockInCount, setStockInCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [progress, setProgress] = useState({ phase: '', done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const limits = getEffectiveLimits(store);
  const isDev = !!(user?.email && DEV_EMAILS.includes(user.email.toLowerCase()));
  // Aturan tracking identik dengan ProductForm.jsx
  const canUseTracking =
    isDev ||
    (store?.plan === 'pro' && store?.has_used_trial === false) ||
    store?.plan === 'premium' ||
    store?.plan === 'enterprise';

  // Reset saat dialog dibuka
  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setMode('skip');
    setFileName('');
    setParsedRows([]);
    setUnknownHeaders([]);
    setExistingProducts([]);
    setFilter('all');
    setPage(1);
    setPhotoFiles([]);
    setProgress({ phase: '', done: 0, total: 0 });
    setResult(null);
    if (store?.id) loadLocations();
  }, [open, store?.id]);

  // Cegah tab ditutup saat proses berjalan
  useEffect(() => {
    if (step !== 'processing') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  const loadLocations = async () => {
    try {
      const data = await api.entities.ProductLocation.filter({ store_id: store.id });
      setLocations({
        warehouses: [...new Set(data.filter((l) => l.type === 'store').map((l) => l.name).filter(Boolean))],
        racks: [...new Set(data.filter((l) => l.type === 'rack').map((l) => l.name).filter(Boolean))],
      });
    } catch (err) {
      console.error('[Import] Gagal memuat lokasi:', err);
    }
  };

  // ------------------------------------------------------------
  // Validasi (dihitung ulang saat mode berubah)
  // ------------------------------------------------------------
  const rows = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return validateImportRows(parsedRows, {
      mode,
      existingProducts,
      warehouses: locations.warehouses,
      racks: locations.racks,
      canUseTracking,
    });
  }, [parsedRows, mode, existingProducts, locations, canUseTracking]);

  const summary = useMemo(() => summarizeRows(rows), [rows]);

  // Pre-check kuota (aturan sama dengan planConfig + trigger 124)
  const quota = useMemo(() => {
    const issues = [];
    const currentProducts = existingProducts.length;
    if (limits.maxProducts !== Infinity && currentProducts + summary.insert > limits.maxProducts) {
      const over = currentProducts + summary.insert - limits.maxProducts;
      issues.push(
        `Kuota produk paket ${store?.plan || 'Free'}: terpakai ${currentProducts}, baris baru ${summary.insert}, batas ${limits.maxProducts}. Kurangi ${over} baris baru atau upgrade paket.`
      );
    }
    if (limits.maxStockIn !== Infinity && summary.newWithStock > 0 && stockInCount + summary.newWithStock > limits.maxStockIn) {
      issues.push(
        `Kuota pencatatan stok masuk: terpakai ${stockInCount}, dibutuhkan ${summary.newWithStock} untuk Stok Awal, batas ${limits.maxStockIn}. Kosongkan kolom Stok Awal pada sebagian produk atau upgrade paket.`
      );
    }
    if (limits.maxProductPhotos !== Infinity) {
      const currentPhotos = existingProducts.filter((p) => p.image_url && p.image_url !== '').length;
      const newUrlPhotos = rows.filter((r) =>
        r.data.image_url && (r.action === 'insert' || (r.action === 'update' && !r.existing?.image_url))
      ).length;
      if (newUrlPhotos > 0 && currentPhotos + newUrlPhotos > limits.maxProductPhotos) {
        issues.push(
          `Kuota foto produk: terpakai ${currentPhotos}, kolom URL Foto menambah ${newUrlPhotos}, batas ${limits.maxProductPhotos}. Kosongkan sebagian kolom URL Foto atau upgrade paket.`
        );
      }
    }
    return issues;
  }, [existingProducts, rows, summary, stockInCount, limits, store?.plan]);

  // Pencocokan foto: nama file = SKU atau Barcode
  const photoMatch = useMemo(() => {
    const eligible = rows.filter((r) => r.action === 'insert' || r.action === 'update');
    const bySku = new Map();
    const byBarcode = new Map();
    eligible.forEach((r) => {
      const s = r.sku.toLowerCase();
      if (!bySku.has(s)) bySku.set(s, []);
      bySku.get(s).push(r);
      const b = r.data.barcode || r.existing?.barcode;
      if (b) {
        const k = String(b).trim().toLowerCase();
        if (!byBarcode.has(k)) byBarcode.set(k, []);
        byBarcode.get(k).push(r);
      }
    });
    const matched = [];
    const unmatched = [];
    const tooLarge = [];
    photoFiles.forEach((f) => {
      if (f.size > MAX_PHOTO_SIZE) { tooLarge.push(f); return; }
      const base = fileBaseName(f.name);
      const targets = bySku.get(base) || byBarcode.get(base);
      if (targets) matched.push({ file: f, rows: targets });
      else unmatched.push(f);
    });
    return { matched, unmatched, tooLarge };
  }, [rows, photoFiles]);

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'insert': return rows.filter((r) => r.action === 'insert');
      case 'existing': return rows.filter((r) => r.action === 'update' || r.action === 'skip');
      case 'error': return rows.filter((r) => r.action === 'error');
      case 'warning': return rows.filter((r) => r.action !== 'error' && r.warnings.length > 0);
      default: return rows;
    }
  }, [rows, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, mode]);

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------
  const handleDownloadTemplate = () => {
    downloadImportTemplate({
      warehouses: locations.warehouses,
      racks: locations.racks,
      categories,
      units: UNITS,
    });
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      sonnerToast.error('Format file harus .xlsx, .xls, atau .csv');
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseImportFile(file);
      if (!parsed.hasNameColumn) {
        sonnerToast.error('Kolom "Nama Produk" tidak ditemukan. Gunakan template impor dari Tradixa.', { duration: 6000 });
        return;
      }
      if (parsed.rows.length === 0) {
        sonnerToast.error(`Sheet "${parsed.sheetName}" tidak berisi data produk.`);
        return;
      }
      if (parsed.rows.length > MAX_IMPORT_ROWS) {
        sonnerToast.error(`Maksimal ${formatNumber(MAX_IMPORT_ROWS)} baris per file. File Anda berisi ${formatNumber(parsed.rows.length)} baris, silakan bagi menjadi beberapa file.`, { duration: 7000 });
        return;
      }

      const existing = await fetchExistingProducts(store.id);
      let inCount = 0;
      if (limits.maxStockIn !== Infinity) {
        const { count } = await supabase
          .from('stock_movements')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('movement_type', 'in');
        inCount = count || 0;
      }

      setExistingProducts(existing);
      setStockInCount(inCount);
      setUnknownHeaders(parsed.unknownHeaders);
      setParsedRows(parsed.rows);
      setFileName(file.name);
      setFilter('all');
      setPage(1);
      setStep('preview');
    } catch (err) {
      console.error('[Import] Gagal membaca file:', err);
      sonnerToast.error(`Gagal membaca file: ${err.message || 'format tidak dikenali'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePhotosSelected = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length === 0) return;
    setPhotoFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      files.forEach((f) => map.set(f.name, f));
      return [...map.values()];
    });
  };

  const runImport = async () => {
    const toSend = rows.filter((r) => r.action !== 'error');
    if (toSend.length === 0) return;

    setStep('processing');
    const outcome = {
      inserted: 0, updated: 0, skipped: 0,
      failedRows: [], fatalError: null,
      photosUploaded: 0, photosFailed: [], photosSkippedQuota: 0,
    };
    const idByRow = new Map(); // rowNumber -> { id, action }

    // 1. Simpan data per batch via RPC (1 batch = 1 transaksi)
    const batches = [];
    for (let i = 0; i < toSend.length; i += IMPORT_BATCH_SIZE) batches.push(toSend.slice(i, i + IMPORT_BATCH_SIZE));
    setProgress({ phase: 'data', done: 0, total: toSend.length });

    let processed = 0;
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const { data, error } = await supabase.rpc('import_products_bulk', {
        p_store_id: store.id,
        p_rows: batch.map(toRpcPayload),
        p_mode: mode,
      });

      if (error) {
        outcome.fatalError = error.message || 'Terjadi kesalahan saat menyimpan data.';
        const remaining = batches.slice(b).flat();
        remaining.forEach((r) => outcome.failedRows.push({ ...r, reportStatus: 'Gagal', errors: [outcome.fatalError], warnings: [] }));
        break;
      }

      outcome.inserted += data?.inserted || 0;
      outcome.updated += data?.updated || 0;
      outcome.skipped += data?.skipped || 0;
      (data?.results || []).forEach((res) => idByRow.set(res.idx, { id: res.id, action: res.action }));
      processed += batch.length;
      setProgress({ phase: 'data', done: processed, total: toSend.length });
    }

    // 2. Upload foto (hanya untuk produk yang benar-benar ditambah / diupdate)
    const photoJobs = photoMatch.matched
      .map(({ file, rows: targets }) => ({
        file,
        targets: targets
          .map((r) => ({ row: r, saved: idByRow.get(r.rowNumber) }))
          .filter((t) => t.saved && (t.saved.action === 'inserted' || t.saved.action === 'updated')),
      }))
      .filter((j) => j.targets.length > 0);

    if (photoJobs.length > 0) {
      setProgress({ phase: 'photo', done: 0, total: photoJobs.length });

      // Kuota foto (cek sama seperti ProductForm)
      let remainingQuota = Infinity;
      if (limits.maxProductPhotos !== Infinity) {
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .not('image_url', 'is', null)
          .neq('image_url', '');
        remainingQuota = Math.max(0, limits.maxProductPhotos - (count || 0));
      }

      // Alokasikan kuota sebelum upload (produk yang sudah punya foto tidak menambah pemakaian)
      const allocated = photoJobs.map((job) => {
        const targets = job.targets.filter((t) => {
          const hasPhoto = !!(t.row.existing?.image_url || t.row.data.image_url);
          if (hasPhoto) return true;
          if (remainingQuota > 0) { remainingQuota -= 1; return true; }
          outcome.photosSkippedQuota += 1;
          return false;
        });
        return { ...job, targets };
      }).filter((j) => j.targets.length > 0);

      let done = photoJobs.length - allocated.length;
      setProgress({ phase: 'photo', done, total: photoJobs.length });

      const queue = [...allocated];
      const worker = async () => {
        while (queue.length > 0) {
          const job = queue.shift();
          try {
            let fileToUpload = job.file;
            try {
              fileToUpload = await imageCompression(job.file, { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true });
            } catch (compressErr) {
              console.warn('[Import] Kompresi gagal, pakai file asli:', compressErr);
            }
            const { url } = await api.storage.upload(fileToUpload, 'product');
            if (!url) throw new Error('URL foto kosong');
            for (const t of job.targets) {
              const { error } = await supabase.from('products').update({ image_url: url }).eq('id', t.saved.id);
              if (error) throw error;
            }
            outcome.photosUploaded += 1;
          } catch (err) {
            console.error('[Import] Upload foto gagal:', job.file.name, err);
            outcome.photosFailed.push(job.file.name);
          } finally {
            done += 1;
            setProgress({ phase: 'photo', done, total: photoJobs.length });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(PHOTO_CONCURRENCY, allocated.length) }, worker));
    }

    setResult(outcome);
    setStep('done');
    if (outcome.inserted > 0 || outcome.updated > 0) onSuccess?.();
  };

  const handleDownloadReport = () => {
    const validationIssues = rows.filter((r) => r.action === 'error' || r.warnings.length > 0);
    const failedNumbers = new Set((result?.failedRows || []).map((r) => r.rowNumber));
    const merged = [
      ...(result?.failedRows || []),
      ...validationIssues.filter((r) => !failedNumbers.has(r.rowNumber)),
    ].sort((a, b) => a.rowNumber - b.rowNumber);
    if (merged.length === 0) {
      sonnerToast.success('Tidak ada baris bermasalah.');
      return;
    }
    downloadIssueReport(merged);
  };

  const handleOpenChange = (next) => {
    if (!next && step === 'processing') return; // jangan tutup saat proses
    if (!next) onClose();
  };

  const importableCount = summary.insert + summary.update + summary.skip;
  const canImport = step === 'preview' && importableCount > 0 && quota.length === 0 && (summary.insert + summary.update) > 0;

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  const stepIndex = { upload: 0, preview: 1, processing: 2, done: 2 }[step];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] md:max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Impor Produk dari Excel
          </DialogTitle>
          <DialogDescription>
            Tambahkan atau perbarui banyak produk sekaligus menggunakan file Excel.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs font-semibold mt-1">
          {['Siapkan File', 'Preview & Validasi', 'Proses Impor'].map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 ${i <= stepIndex ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${i < stepIndex ? 'bg-blue-600 text-white' : i === stepIndex ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${i < stepIndex ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ================= STEP 1: UPLOAD ================= */}
        {step === 'upload' && (
          <div className="space-y-5 mt-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-200">1. Download template</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Template berisi kolom, petunjuk, contoh, dan daftar Gudang/Rak toko Anda.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/40 shrink-0">
                <Download className="w-4 h-4 mr-2" /> Download Template
              </Button>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">2. Jika SKU + Gudang sudah ada di sistem</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModeCard
                  active={mode === 'skip'}
                  onClick={() => setMode('skip')}
                  icon={SkipForward}
                  title="Lewati"
                  desc="Produk yang sudah ada tidak diubah. Hanya produk baru yang ditambahkan. Aman untuk impor pertama."
                />
                <ModeCard
                  active={mode === 'update'}
                  onClick={() => setMode('update')}
                  icon={RefreshCw}
                  title="Update"
                  desc="Data master produk lama (nama, harga, satuan, dll) ditimpa dengan data Excel. Stok tidak diubah."
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">3. Upload file</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelected} id="product-import-file" />
              <label
                htmlFor="product-import-file"
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isParsing ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-300'}`}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="mt-2 text-sm text-slate-500">Membaca & memvalidasi file...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Klik untuk memilih file Excel</span>
                    <span className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv · maks {formatNumber(MAX_IMPORT_ROWS)} baris</span>
                  </>
                )}
              </label>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <span>
                Jumlah produk mengikuti kuota paket <b className="capitalize">{store?.plan || 'free'}</b>
                {limits.maxProducts !== Infinity ? ` (maks ${formatNumber(limits.maxProducts)} produk)` : ' (tanpa batas)'}.
                Data belum disimpan sebelum Anda menekan tombol <b>Mulai Impor</b> di langkah berikutnya.
              </span>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW ================= */}
        {step === 'preview' && (
          <div className="space-y-4 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium truncate">{fileName}</span>
                <span className="text-slate-400 shrink-0">· {formatNumber(summary.total)} baris</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {[['skip', 'Lewati'], ['update', 'Update']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMode(val)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === val ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <SummaryCard label="Produk Baru" value={summary.insert} tone="emerald" active={filter === 'insert'} onClick={() => setFilter('insert')} />
              <SummaryCard label={mode === 'update' ? 'Akan Diupdate' : 'Dilewati'} value={mode === 'update' ? summary.update : summary.skip} tone={mode === 'update' ? 'blue' : 'slate'} active={filter === 'existing'} onClick={() => setFilter('existing')} />
              <SummaryCard label="Peringatan" value={summary.warning} tone="amber" active={filter === 'warning'} onClick={() => setFilter('warning')} />
              <SummaryCard label="Error" value={summary.error} tone="red" active={filter === 'error'} onClick={() => setFilter('error')} />
              <SummaryCard label="Semua Baris" value={summary.total} tone="slate" active={filter === 'all'} onClick={() => setFilter('all')} />
            </div>

            {quota.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs space-y-1">
                {quota.map((q) => (
                  <p key={q} className="flex items-start gap-2"><XCircle className="w-4 h-4 shrink-0" /> {q}</p>
                ))}
              </div>
            )}

            {summary.error > 0 && quota.length === 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {formatNumber(summary.error)} baris error <b>tidak akan diimpor</b>. Download laporan, perbaiki, lalu upload ulang. Baris yang sudah masuk otomatis dilewati di mode Lewati.
                </span>
              </div>
            )}

            {unknownHeaders.length > 0 && (
              <p className="text-[11px] text-slate-400">Kolom tidak dikenal dan diabaikan: {unknownHeaders.join(', ')}</p>
            )}

            {/* Tabel preview */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[38vh]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 font-semibold">Baris</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">SKU</th>
                      <th className="px-3 py-2 font-semibold">Nama Produk</th>
                      <th className="px-3 py-2 font-semibold">Gudang</th>
                      <th className="px-3 py-2 font-semibold text-right">Harga Jual</th>
                      <th className="px-3 py-2 font-semibold text-right">Stok Awal</th>
                      <th className="px-3 py-2 font-semibold min-w-[220px]">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Tidak ada baris pada filter ini.</td></tr>
                    )}
                    {pageRows.map((r) => {
                      const badge = ACTION_BADGE[r.action];
                      return (
                        <tr key={r.rowNumber} className="border-t border-slate-100 dark:border-slate-800 align-top">
                          <td className="px-3 py-2 text-slate-400">{r.rowNumber}</td>
                          <td className="px-3 py-2"><Badge className={`${badge.className} text-[10px]`}>{badge.label}</Badge></td>
                          <td className="px-3 py-2 font-mono">
                            {r.sku}
                            {r.skuGenerated && <span className="block text-[10px] text-slate-400 font-sans">otomatis</span>}
                          </td>
                          <td className="px-3 py-2 font-medium">{r.data.name || r.existing?.name || <span className="text-slate-300">-</span>}</td>
                          <td className="px-3 py-2">{r.warehouse || <span className="text-slate-300">-</span>}</td>
                          <td className="px-3 py-2 text-right">{r.data.sell_price !== undefined ? `Rp ${formatNumber(r.data.sell_price)}` : <span className="text-slate-300">-</span>}</td>
                          <td className="px-3 py-2 text-right">{r.action === 'insert' ? formatNumber(r.data.stock || 0) : <span className="text-slate-300">-</span>}</td>
                          <td className="px-3 py-2 space-y-0.5">
                            {r.errors.map((m) => <p key={m} className="text-red-600 dark:text-red-400 flex gap-1"><XCircle className="w-3 h-3 shrink-0 mt-0.5" />{m}</p>)}
                            {r.warnings.map((m) => <p key={m} className="text-amber-600 dark:text-amber-400 flex gap-1"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{m}</p>)}
                            {r.action === 'skip' && r.errors.length === 0 && <p className="text-slate-400">Sudah ada di sistem, tidak diubah</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Halaman {page} dari {totalPages}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
            </div>

            {/* Foto (opsional) */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2"><ImagePlus className="w-4 h-4 text-blue-600" /> Foto Produk <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">Opsional</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Pilih banyak foto sekaligus. Nama file = SKU atau Barcode (contoh: <span className="font-mono">SKU-SEM-001.jpg</span>). Maks 2MB per foto.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {photoFiles.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoFiles([])} className="text-slate-500"><X className="w-4 h-4 mr-1" /> Hapus</Button>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosSelected} id="product-import-photos" />
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                    <ImagePlus className="w-4 h-4 mr-1.5" /> Pilih Foto
                  </Button>
                </div>
              </div>
              {photoFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded-md font-medium">{photoMatch.matched.length} foto cocok</span>
                  {photoMatch.unmatched.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-1 rounded-md font-medium" title={photoMatch.unmatched.map((f) => f.name).join(', ')}>
                      {photoMatch.unmatched.length} tidak cocok dengan SKU/Barcode
                    </span>
                  )}
                  {photoMatch.tooLarge.length > 0 && (
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded-md font-medium" title={photoMatch.tooLarge.map((f) => f.name).join(', ')}>
                      {photoMatch.tooLarge.length} lebih dari 2MB (dilewati)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Ganti File
              </Button>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                {(summary.error > 0 || summary.warning > 0) && (
                  <Button type="button" variant="outline" onClick={handleDownloadReport}>
                    <Download className="w-4 h-4 mr-2" /> Laporan Baris Bermasalah
                  </Button>
                )}
                <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!canImport} onClick={runImport}>
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Mulai Impor ({formatNumber(summary.insert + summary.update)} produk)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PROCESSING ================= */}
        {step === 'processing' && (
          <div className="py-10 flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold">{progress.phase === 'photo' ? 'Mengupload foto produk...' : 'Menyimpan data produk...'}</p>
              <p className="text-xs text-slate-500 mt-1">Jangan tutup atau refresh halaman ini sampai proses selesai.</p>
            </div>
            <div className="w-full max-w-md">
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {formatNumber(progress.done)} / {formatNumber(progress.total)} {progress.phase === 'photo' ? 'foto' : 'baris'}
              </p>
            </div>
          </div>
        )}

        {/* ================= STEP 4: DONE ================= */}
        {step === 'done' && result && (
          <div className="space-y-4 mt-2">
            <div className={`rounded-xl p-4 flex items-start gap-3 ${result.fatalError ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'}`}>
              {result.fatalError
                ? <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                : <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              <div className="text-sm">
                <p className="font-semibold">{result.fatalError ? 'Impor berhenti sebagian' : 'Impor selesai'}</p>
                {result.fatalError && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {result.fatalError} — {formatNumber(result.failedRows.length)} baris belum tersimpan. Data yang sudah masuk tetap aman; upload ulang file dengan mode Lewati untuk melanjutkan.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SummaryCard label="Ditambahkan" value={result.inserted} tone="emerald" />
              <SummaryCard label="Diupdate" value={result.updated} tone="blue" />
              <SummaryCard label="Dilewati" value={result.skipped} tone="slate" />
              <SummaryCard label="Gagal / Error" value={result.failedRows.length + summary.error} tone="red" />
            </div>

            {(photoMatch.matched.length > 0) && (
              <div className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
                <p className="font-semibold text-sm flex items-center gap-2"><ImagePlus className="w-4 h-4 text-blue-600" /> Foto</p>
                <p>{formatNumber(result.photosUploaded)} foto berhasil diupload.</p>
                {result.photosSkippedQuota > 0 && <p className="text-amber-600">{formatNumber(result.photosSkippedQuota)} produk tidak diberi foto karena kuota foto paket habis.</p>}
                {result.photosFailed.length > 0 && <p className="text-red-600">Gagal: {result.photosFailed.join(', ')}</p>}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t">
              {(result.failedRows.length > 0 || summary.error > 0 || summary.warning > 0) && (
                <Button type="button" variant="outline" onClick={handleDownloadReport}>
                  <Download className="w-4 h-4 mr-2" /> Download Laporan
                </Button>
              )}
              <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>Selesai</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${active ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-blue-600' : 'border-slate-300'}`}>
          {active && <span className="w-2 h-2 rounded-full bg-blue-600" />}
        </span>
        <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
    </button>
  );
}

const TONES = {
  emerald: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  blue: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  amber: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  red: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  slate: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
};

function SummaryCard({ label, value, tone = 'slate', active = false, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left rounded-xl border p-3 transition-all ${TONES[tone]} ${active ? 'ring-2 ring-blue-500' : ''} ${onClick ? 'hover:shadow-sm' : ''}`}
    >
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-0.5">{formatNumber(value || 0)}</p>
    </Comp>
  );
}
