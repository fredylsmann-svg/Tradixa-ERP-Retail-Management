/**
 * TRADIXA — Product Bulk Import Utilities
 * ------------------------------------------------------------
 * Template Excel, parsing, dan validasi untuk Impor Massal Product Master.
 *
 * Aturan disamakan dengan ProductForm.jsx:
 * - Default: Kategori Sembako, Dus → Pcs, Konversi 24, Min. Stok 10, FIFO, 365 hari
 * - Format SKU otomatis: SKU-<3 huruf kategori>-<6 karakter acak>
 * - Gudang = product_locations type 'store', Rak = type 'rack'
 * - Kunci pencocokan produk = SKU + Gudang (sama seperti WarehouseTransfer)
 *
 * File ini TIDAK menulis ke database. Penyimpanan dilakukan oleh RPC
 * `import_products_bulk` (migration 126).
 */
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export const IMPORT_BATCH_SIZE = 250;
export const MAX_IMPORT_ROWS = 10000;
export const MAX_UOM_EXTRA = 3; // Satuan 2..4

const DEFAULTS = {
  category: 'Sembako',
  buy_unit: 'Dus',
  sell_unit: 'Pcs',
  conversion_rate: 24,
  reorder_level: 10,
};

const TRACKING_VALUES = {
  none: 'None', standard: 'None', tanpa: 'None', 'tanpa pelacakan': 'None', '-': 'None',
  batch: 'Batch', 'per batch': 'Batch',
  serial: 'Serial', imei: 'Serial', sn: 'Serial', 'imei/sn': 'Serial',
};
const ISSUE_METHODS = ['FIFO', 'FEFO', 'LIFO'];

// ------------------------------------------------------------
// Definisi kolom template
// ------------------------------------------------------------
const baseColumns = [
  { key: 'sku', header: 'SKU', aliases: ['kode barang', 'kode produk', 'kode', 'sku (kode barang)'], width: 18,
    note: 'Opsional. Kosongkan untuk dibuat otomatis. Dipakai untuk mencocokkan produk yang sudah ada.', example: 'SKU-SEM-001' },
  { key: 'barcode', header: 'Barcode', aliases: ['kode barcode', 'ean', 'barcode / barcode scanner'], width: 16,
    note: 'Opsional. Format sel sebagai Text agar angka panjang tidak berubah.', example: '8991234567890' },
  { key: 'name', header: 'Nama Produk*', aliases: ['nama produk', 'nama', 'nama barang', 'product name'], width: 28,
    note: 'WAJIB untuk produk baru.', example: 'Indomie Goreng' },
  { key: 'category', header: 'Kategori', aliases: ['category'], width: 14,
    note: 'Opsional. Default: Sembako. Boleh kategori baru.', example: 'Sembako' },
  { key: 'warehouse_name', header: 'Gudang', aliases: ['gudang utama', 'warehouse'], width: 18,
    note: 'Opsional. Harus sama dengan nama Gudang di menu Product Locations (lihat sheet Referensi).', example: 'Gudang Pusat' },
  { key: 'location_name', header: 'Rak', aliases: ['rak penyimpanan', 'lokasi rak'], width: 14,
    note: 'Opsional. Harus sama dengan nama Rak di menu Product Locations.', example: 'Rak A1' },
  { key: 'buy_unit', header: 'Satuan Beli', aliases: ['satuan kulakan', 'satuan kulakan (beli)'], width: 12,
    note: 'Opsional. Default: Dus.', example: 'Dus' },
  { key: 'sell_unit', header: 'Satuan Jual', aliases: ['satuan eceran', 'satuan jual (eceran)', 'satuan'], width: 12,
    note: 'Opsional. Default: Pcs. Ini satuan dasar stok.', example: 'Pcs' },
  { key: 'conversion_rate', header: 'Konversi', aliases: ['isi', 'isi per satuan beli'], width: 10, numeric: true,
    note: 'Opsional. 1 Satuan Beli = X Satuan Jual. Default: 24.', example: 40 },
  { key: 'buy_price', header: 'Harga Beli', aliases: ['harga modal', 'harga kulakan'], width: 14, numeric: true,
    note: 'Harga per Satuan Beli. Angka saja, tanpa Rp.', example: 110000 },
  { key: 'sell_price', header: 'Harga Jual', aliases: ['harga eceran'], width: 14, numeric: true,
    note: 'Harga per Satuan Jual. Angka saja, tanpa Rp.', example: 3500 },
  { key: 'stock', header: 'Stok Awal', aliases: ['stok', 'stock', 'qty', 'stok barang aktif'], width: 10, numeric: true,
    note: 'Opsional. Dalam Satuan Jual. Hanya untuk produk BARU (tercatat di kartu stok sebagai Stok Awal).', example: 200 },
  { key: 'reorder_level', header: 'Min. Stok', aliases: ['min stok', 'minimal stok', 'reorder level', 'peringatan stok', 'peringatan sisa stok menipis'], width: 10, numeric: true,
    note: 'Opsional. Batas peringatan stok menipis. Default: 10.', example: 20 },
];

const uomColumns = [];
for (let n = 2; n <= MAX_UOM_EXTRA + 1; n++) {
  uomColumns.push(
    { key: `uom${n}_unit`, header: `Satuan ${n}`, aliases: [], width: 10,
      note: `Opsional. Satuan grosir ke-${n - 1} (misal Pack, Dus).`, example: n === 2 ? 'Pack' : n === 3 ? 'Dus' : '' },
    { key: `uom${n}_qty`, header: `Isi Satuan ${n}`, aliases: [], width: 12, numeric: true,
      note: `Isi Satuan ${n} dalam Satuan Jual.`, example: n === 2 ? 5 : n === 3 ? 40 : '' },
    { key: `uom${n}_price`, header: `Harga Satuan ${n}`, aliases: [], width: 14, numeric: true,
      note: `Harga jual per Satuan ${n}.`, example: n === 2 ? 17000 : n === 3 ? 132000 : '' },
  );
}

const trackingColumns = [
  { key: 'tracking_type', header: 'Tracking', aliases: ['metode pelacakan', 'pelacakan', 'metode pelacakan stok'], width: 10,
    note: 'Opsional. None / Batch / Serial. Batch & Serial hanya untuk paket Pro (berbayar), Premium, Enterprise.', example: 'None' },
  { key: 'track_expiry', header: 'Lacak Expired', aliases: ['lacak kadaluarsa', 'track expiry'], width: 12,
    note: 'Opsional. Ya / Tidak.', example: 'Tidak' },
  { key: 'default_shelf_life', header: 'Umur Simpan (Hari)', aliases: ['umur simpan', 'shelf life', 'umur simpan default (hari)'], width: 16, numeric: true,
    note: 'Opsional. Default: 365.', example: 365 },
  { key: 'issue_method', header: 'Metode Keluar', aliases: ['metode pengeluaran', 'issue method'], width: 12,
    note: 'Opsional. FIFO / FEFO / LIFO. Default: FIFO.', example: 'FIFO' },
  { key: 'image_url', header: 'URL Foto', aliases: ['foto', 'image url', 'link foto', 'foto produk'], width: 30,
    note: 'Opsional. Link foto online (https://...). Foto dari komputer bisa diupload di langkah berikutnya.', example: '' },
];

export const IMPORT_COLUMNS = [...baseColumns, ...uomColumns, ...trackingColumns];

const normalizeHeader = (h) =>
  String(h ?? '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();

const HEADER_LOOKUP = (() => {
  const map = {};
  IMPORT_COLUMNS.forEach((c) => {
    map[normalizeHeader(c.header)] = c.key;
    map[normalizeHeader(c.key)] = c.key;
    c.aliases.forEach((a) => { map[normalizeHeader(a)] = c.key; });
  });
  return map;
})();

// ------------------------------------------------------------
// Helpers parsing nilai
// ------------------------------------------------------------
const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

const toText = (v) => (isBlank(v) ? '' : String(v).trim());

/**
 * Parse angka dengan format Indonesia / internasional.
 * Return: { provided:false } | { provided:true, valid:true, value } | { provided:true, valid:false }
 */
export function parseNumber(v) {
  if (isBlank(v)) return { provided: false };
  if (typeof v === 'number') return Number.isFinite(v) ? { provided: true, valid: true, value: v } : { provided: true, valid: false };

  let s = String(v).trim().replace(/^rp\.?/i, '').replace(/\s/g, '');
  if (s === '' || s === '-') return { provided: false };

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Yang terakhir muncul = pemisah desimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasDot) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  } else if (hasComma) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(s)) return { provided: true, valid: false };
  return { provided: true, valid: true, value: Number(s) };
}

function parseBoolean(v) {
  if (isBlank(v)) return { provided: false };
  if (typeof v === 'boolean') return { provided: true, valid: true, value: v };
  const s = String(v).trim().toLowerCase();
  if (['ya', 'y', 'yes', 'true', '1', 'wajib'].includes(s)) return { provided: true, valid: true, value: true };
  if (['tidak', 'tdk', 't', 'no', 'n', 'false', '0'].includes(s)) return { provided: true, valid: true, value: false };
  return { provided: true, valid: false };
}

export function generateSku(category) {
  const prefix = String(category || DEFAULTS.category).substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, '0');
  return `SKU-${prefix}-${random}`;
}

export const makeProductKey = (sku, warehouse) => `${sku}||${warehouse || ''}`;

// ------------------------------------------------------------
// Template Excel
// ------------------------------------------------------------
export function downloadImportTemplate({ warehouses = [], racks = [], categories = [], units = [] } = {}) {
  const wb = XLSX.utils.book_new();
  const headers = IMPORT_COLUMNS.map((c) => c.header);
  const cols = IMPORT_COLUMNS.map((c) => ({ wch: Math.max(c.width, c.header.length + 2) }));

  // 1. Sheet utama (kosong, hanya header)
  const wsData = XLSX.utils.aoa_to_sheet([headers]);
  wsData['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsData, 'Data Produk');

  // 2. Sheet contoh
  const exampleWh = warehouses[0] || '';
  const exampleRack = racks[0] || '';
  const ex1 = IMPORT_COLUMNS.map((c) => {
    if (c.key === 'warehouse_name') return exampleWh;
    if (c.key === 'location_name') return exampleRack;
    return c.example ?? '';
  });
  const ex2 = IMPORT_COLUMNS.map((c) => ({
    sku: '', barcode: '', name: 'Aqua 600ml', category: 'Minuman', warehouse_name: exampleWh, location_name: '',
    buy_unit: 'Dus', sell_unit: 'Pcs', conversion_rate: 24, buy_price: 72000, sell_price: 4000, stock: 48, reorder_level: 12,
    tracking_type: 'None', track_expiry: 'Tidak', default_shelf_life: 365, issue_method: 'FIFO',
  }[c.key] ?? ''));
  const ex3 = IMPORT_COLUMNS.map((c) => ({
    sku: 'SKU-PAK-001', name: 'Kaos Polos Hitam', category: 'Pakaian', warehouse_name: exampleWh,
    buy_unit: 'Pcs', sell_unit: 'Pcs', conversion_rate: 1, buy_price: 35000, sell_price: 65000, stock: 0, reorder_level: 5,
  }[c.key] ?? ''));
  const wsExample = XLSX.utils.aoa_to_sheet([headers, ex1, ex2, ex3]);
  wsExample['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsExample, 'Contoh');

  // 3. Sheet petunjuk
  const guide = [
    ['PETUNJUK IMPOR PRODUK — TRADIXA'],
    [''],
    ['1. Isi data produk di sheet "Data Produk" mulai baris ke-2. Jangan ubah judul kolom di baris pertama.'],
    ['2. Lihat sheet "Contoh" untuk contoh pengisian. Sheet Contoh TIDAK ikut diimpor.'],
    ['3. Satu baris = satu produk per gudang. SKU yang sama di gudang berbeda dianggap baris terpisah.'],
    ['4. Kolom kosong akan memakai nilai default (sama seperti form Tambah Produk).'],
    ['5. Mode "Lewati": produk dengan SKU + Gudang yang sudah ada tidak diubah.'],
    ['   Mode "Update": data master produk yang sudah ada ditimpa. STOK TIDAK DIUBAH (gunakan Stock In / Opname).'],
    ['6. Jumlah produk mengikuti kuota paket langganan Anda.'],
    ['7. Foto: upload banyak foto sekaligus di langkah Preview. Nama file = SKU atau Barcode (contoh: SKU-SEM-001.jpg).'],
    [''],
    ['Kolom', 'Keterangan', 'Contoh'],
    ...IMPORT_COLUMNS.map((c) => [c.header, c.note, c.example ?? '']),
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 100 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

  // 4. Sheet referensi data toko
  const maxLen = Math.max(warehouses.length, racks.length, categories.length, units.length, 3, 3);
  const refRows = [['Gudang', 'Rak', 'Kategori', 'Satuan', 'Tracking', 'Metode Keluar']];
  const trackingRef = ['None', 'Batch', 'Serial'];
  for (let i = 0; i < maxLen; i++) {
    refRows.push([
      warehouses[i] || '', racks[i] || '', categories[i] || '', units[i] || '',
      trackingRef[i] || '', ISSUE_METHODS[i] || '',
    ]);
  }
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi');

  XLSX.writeFile(wb, 'Template_Impor_Produk_Tradixa.xlsx');
}

// ------------------------------------------------------------
// Parsing file
// ------------------------------------------------------------
const NON_DATA_SHEETS = ['contoh', 'petunjuk', 'referensi'];

export async function parseImportFile(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === 'data produk') ||
    wb.SheetNames.find((n) => !NON_DATA_SHEETS.includes(normalizeHeader(n))) ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) {
    return { sheetName, rows: [], unknownHeaders: [], hasNameColumn: false };
  }

  const startRow = XLSX.utils.decode_range(ws['!ref']).s.r; // 0-based
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true });
  if (aoa.length === 0) return { sheetName, rows: [], unknownHeaders: [], hasNameColumn: false };

  const headerRow = aoa[0];
  const colMap = []; // index -> key
  const unknownHeaders = [];
  headerRow.forEach((h, i) => {
    const key = HEADER_LOOKUP[normalizeHeader(h)];
    if (key) colMap[i] = key;
    else if (!isBlank(h)) unknownHeaders.push(String(h));
  });

  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i];
    if (!line || line.every(isBlank)) continue;
    const raw = {};
    colMap.forEach((key, idx) => {
      if (key) raw[key] = line[idx];
    });
    rows.push({ rowNumber: startRow + i + 1, raw });
  }

  return {
    sheetName,
    rows,
    unknownHeaders,
    hasNameColumn: colMap.includes('name'),
  };
}

// ------------------------------------------------------------
// Data referensi dari database (read-only)
// ------------------------------------------------------------
export async function fetchExistingProducts(storeId) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, warehouse_name, name, barcode, image_url')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ------------------------------------------------------------
// Validasi
// ------------------------------------------------------------
/**
 * @param {Array} parsedRows - hasil parseImportFile().rows
 * @param {Object} ctx
 *   mode: 'skip' | 'update'
 *   existingProducts: array dari fetchExistingProducts()
 *   warehouses: string[] (product_locations type 'store')
 *   racks: string[] (product_locations type 'rack')
 *   canUseTracking: boolean (aturan sama dengan ProductForm)
 */
export function validateImportRows(parsedRows, ctx) {
  const { mode, existingProducts = [], warehouses = [], racks = [], canUseTracking = false } = ctx;

  // Index produk existing (oldest first, sama dengan RPC)
  const existingByKey = new Map();
  const existingByName = new Map();
  const existingByBarcode = new Map();
  existingProducts.forEach((p) => {
    const key = makeProductKey(p.sku || '', p.warehouse_name || '');
    if (!existingByKey.has(key)) existingByKey.set(key, p);
    if (p.name) {
      const n = p.name.trim().toLowerCase();
      if (!existingByName.has(n)) existingByName.set(n, p);
    }
    if (p.barcode) {
      const b = String(p.barcode).trim();
      if (!existingByBarcode.has(b)) existingByBarcode.set(b, p);
    }
  });

  const whLookup = new Map(warehouses.map((w) => [w.trim().toLowerCase(), w]));
  const rackLookup = new Map(racks.map((r) => [r.trim().toLowerCase(), r]));

  const usedKeys = new Map(); // key -> rowNumber
  const usedBarcodes = new Map(); // barcode -> rowNumber
  const allSkus = new Set(existingProducts.map((p) => p.sku).filter(Boolean));

  return parsedRows.map(({ rowNumber, raw }) => {
    const errors = [];
    const warnings = [];
    const data = {};

    // --- Teks ---
    const name = toText(raw.name);
    const barcode = toText(raw.barcode);
    const category = toText(raw.category);
    const buyUnit = toText(raw.buy_unit);
    const sellUnit = toText(raw.sell_unit);
    if (name) data.name = name;
    if (barcode) data.barcode = barcode;
    if (category) data.category = category;
    if (buyUnit) data.buy_unit = buyUnit;
    if (sellUnit) data.sell_unit = sellUnit;

    // --- Gudang & Rak (harus terdaftar, sama seperti dropdown di form) ---
    let warehouse = '';
    const whText = toText(raw.warehouse_name);
    if (whText) {
      const canonical = whLookup.get(whText.toLowerCase());
      if (canonical) warehouse = canonical;
      else errors.push(`Gudang "${whText}" belum terdaftar di Product Locations`);
    }
    const rackText = toText(raw.location_name);
    if (rackText) {
      const canonical = rackLookup.get(rackText.toLowerCase());
      if (canonical) data.location_name = canonical;
      else errors.push(`Rak "${rackText}" belum terdaftar di Product Locations`);
    }

    // --- Angka ---
    const numericFields = [
      ['conversion_rate', 'Konversi'],
      ['buy_price', 'Harga Beli'],
      ['sell_price', 'Harga Jual'],
      ['stock', 'Stok Awal'],
      ['reorder_level', 'Min. Stok'],
    ];
    numericFields.forEach(([key, label]) => {
      const r = parseNumber(raw[key]);
      if (!r.provided) return;
      if (!r.valid) errors.push(`${label} bukan angka yang valid ("${raw[key]}")`);
      else if (r.value < 0) errors.push(`${label} tidak boleh minus`);
      else data[key] = r.value;
    });
    if (data.conversion_rate !== undefined && data.conversion_rate <= 0) {
      errors.push('Konversi harus lebih dari 0');
      delete data.conversion_rate;
    }

    // --- Multi-UoM (Satuan 2..4) ---
    const uomExtra = [];
    let uomTouched = false;
    for (let n = 2; n <= MAX_UOM_EXTRA + 1; n++) {
      const unit = toText(raw[`uom${n}_unit`]);
      const qty = parseNumber(raw[`uom${n}_qty`]);
      const price = parseNumber(raw[`uom${n}_price`]);
      if (!unit && !qty.provided && !price.provided) continue;
      uomTouched = true;
      if (!unit) { errors.push(`Satuan ${n} wajib diisi jika Isi/Harga Satuan ${n} diisi`); continue; }
      if (!qty.provided || !qty.valid || qty.value <= 0) { errors.push(`Isi Satuan ${n} harus angka lebih dari 0`); continue; }
      if (price.provided && (!price.valid || price.value < 0)) { errors.push(`Harga Satuan ${n} tidak valid`); continue; }
      uomExtra.push({ unit, qty_per_base: qty.value, sell_price: price.provided ? price.value : 0 });
    }
    if (uomTouched) data.uom_extra = uomExtra;

    // --- Tracking (aturan paket sama dengan ProductForm) ---
    const trackText = toText(raw.tracking_type);
    if (trackText) {
      const t = TRACKING_VALUES[trackText.toLowerCase()];
      if (!t) errors.push(`Tracking "${trackText}" tidak dikenal (gunakan None / Batch / Serial)`);
      else if (t !== 'None' && !canUseTracking) {
        warnings.push('Tracking Batch/Serial terkunci untuk paket Anda, diganti menjadi None');
        data.tracking_type = 'None';
      } else data.tracking_type = t;
    }
    const exp = parseBoolean(raw.track_expiry);
    if (exp.provided) {
      if (!exp.valid) errors.push(`Lacak Expired "${raw.track_expiry}" tidak dikenal (gunakan Ya / Tidak)`);
      else data.track_expiry = exp.value;
    }
    const shelf = parseNumber(raw.default_shelf_life);
    if (shelf.provided) {
      if (!shelf.valid || shelf.value <= 0) errors.push('Umur Simpan harus angka lebih dari 0');
      else data.default_shelf_life = Math.round(shelf.value);
    }
    const issueText = toText(raw.issue_method).toUpperCase();
    if (issueText) {
      if (!ISSUE_METHODS.includes(issueText)) errors.push(`Metode Keluar "${raw.issue_method}" tidak dikenal (gunakan FIFO / FEFO / LIFO)`);
      else data.issue_method = issueText;
    }

    // --- URL Foto ---
    const url = toText(raw.image_url);
    if (url) {
      if (/^https?:\/\//i.test(url)) data.image_url = url;
      else warnings.push('URL Foto diabaikan (harus diawali http:// atau https://)');
    }

    // --- SKU & status terhadap sistem ---
    let sku = toText(raw.sku);
    let skuGenerated = false;
    if (!sku) {
      do { sku = generateSku(category || DEFAULTS.category); } while (allSkus.has(sku));
      skuGenerated = true;
    }
    allSkus.add(sku);

    const key = makeProductKey(sku, warehouse);
    const existing = existingByKey.get(key) || null;
    const status = existing ? 'exists' : 'new';
    let action = status === 'new' ? 'insert' : mode === 'update' ? 'update' : 'skip';

    if (usedKeys.has(key)) {
      errors.push(`Duplikat SKU + Gudang dengan baris ${usedKeys.get(key)}`);
    } else {
      usedKeys.set(key, rowNumber);
    }

    if (status === 'new' && !name) errors.push('Nama Produk wajib diisi untuk produk baru');

    // --- Peringatan (tidak memblokir) ---
    if (action === 'update' && data.stock !== undefined) {
      warnings.push('Stok Awal diabaikan untuk produk yang sudah ada (gunakan Stock In / Opname)');
    }
    if (action === 'insert') {
      const conv = data.conversion_rate ?? DEFAULTS.conversion_rate;
      const buy = data.buy_price ?? 0;
      const sell = data.sell_price ?? 0;
      const bu = data.buy_unit ?? DEFAULTS.buy_unit;
      if (!sell) warnings.push('Harga Jual masih 0');
      else if (buy > 0 && conv > 0 && sell < buy / conv) warnings.push('Harga Jual di bawah HPP (margin minus)');
      if (bu === 'Pcs' && conv > 1) warnings.push('Satuan Beli "Pcs" tetapi Konversi lebih dari 1, HPP bisa tidak akurat');
      if (data.conversion_rate === undefined) warnings.push('Konversi kosong, memakai default 24');
    }
    if (name && action !== 'skip') {
      const sameName = existingByName.get(name.toLowerCase());
      if (sameName && sameName.sku !== sku) warnings.push(`Nama sudah terdaftar dengan SKU ${sameName.sku || '-'}`);
    }
    if (barcode) {
      if (usedBarcodes.has(barcode) && usedBarcodes.get(barcode).sku !== sku) {
        warnings.push(`Barcode sama dengan baris ${usedBarcodes.get(barcode).rowNumber}`);
      } else if (!usedBarcodes.has(barcode)) {
        usedBarcodes.set(barcode, { rowNumber, sku });
      }
      const sameBarcode = existingByBarcode.get(barcode);
      if (sameBarcode && sameBarcode.sku !== sku && action !== 'skip') {
        warnings.push(`Barcode sudah dipakai produk SKU ${sameBarcode.sku || '-'}`);
      }
    }

    if (errors.length > 0) action = 'error';

    return {
      rowNumber,
      raw,
      sku,
      skuGenerated,
      warehouse,
      data,
      status,
      action,
      existing,
      errors,
      warnings,
    };
  });
}

/**
 * Hitung kebutuhan kuota dari baris valid (dipakai untuk pre-check di UI).
 */
export function summarizeRows(rows) {
  const s = { total: rows.length, insert: 0, update: 0, skip: 0, error: 0, warning: 0, newWithStock: 0 };
  rows.forEach((r) => {
    s[r.action] += 1;
    if (r.warnings.length > 0 && r.action !== 'error') s.warning += 1;
    if (r.action === 'insert' && (r.data.stock || 0) > 0) s.newWithStock += 1;
  });
  return s;
}

/**
 * Payload untuk RPC import_products_bulk.
 */
export function toRpcPayload(row) {
  return {
    idx: row.rowNumber,
    sku: row.sku,
    warehouse_name: row.warehouse,
    data: row.data,
  };
}

// ------------------------------------------------------------
// Laporan baris bermasalah (bisa diperbaiki lalu diupload ulang)
// ------------------------------------------------------------
export function downloadIssueReport(rows, filename = 'Laporan_Impor_Produk.xlsx') {
  const headers = ['Baris Excel', 'Status', 'Keterangan', ...IMPORT_COLUMNS.map((c) => c.header)];
  const aoa = [headers];
  rows.forEach((r) => {
    aoa.push([
      r.rowNumber,
      r.reportStatus || (r.action === 'error' ? 'Error' : 'Peringatan'),
      [...(r.errors || []), ...(r.warnings || [])].join('; '),
      ...IMPORT_COLUMNS.map((c) => (c.key === 'sku' && r.skuGenerated ? '' : r.raw?.[c.key] ?? '')),
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 60 }, ...IMPORT_COLUMNS.map((c) => ({ wch: c.width }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Produk');
  XLSX.writeFile(wb, filename);
}
