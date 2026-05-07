# TRADIXA ERP - End-to-End Master Blueprint

Dokumen ini adalah panduan teknis dan operasional untuk sistem Tradixa ERP. Dokumen ini digunakan sebagai referensi utama bagi AI Assistant untuk memberikan bantuan yang akurat kepada pengguna.

---

## 1. Overview Sistem
Tradixa adalah sistem ERP (Enterprise Resource Planning) berbasis SaaS (Multi-tenant) yang dirancang untuk retail, grosir, dan manajemen agen finansial.
- **Teknologi**: React (Vite), Tailwind CSS, Lucide Icons.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Arsitektur**: Multi-tenant (Store-based isolation). Setiap data (produk, transaksi, user) wajib memiliki `store_id`.

---

## 2. Modul Utama & Alur Kerja (End-to-End)

### A. Manajemen Inventori & Pengadaan (Procurement)
Alur lengkap masuk barang ke gudang:
1.  **Purchase Requisition (PR)**: Permintaan barang internal untuk persetujuan budget.
2.  **Purchase Order (PO)**: Pesanan resmi ke Supplier. Mendukung tanda tangan digital publik untuk validitas vendor.
3.  **Goods Receipt (GRN)**: Penerimaan fisik barang di gudang. Di tahap ini, sistem mencatat barang sudah sampai namun belum masuk ke stok aktif (masih status 'Received').
4.  **Inventory GRN**: Proses verifikasi dan penempatan barang ke rak/lokasi spesifik. Di tahap ini, stok di tabel `inventory_batches` bertambah dan status barang menjadi 'In Stock'.
5.  **Payable Invoice**: Pencatatan tagihan (A/P) berdasarkan data GRN yang valid. Hal ini otomatis memicu jurnal hutang di modul **Financials**.
6.  **Supplier Return**: Modul untuk mengembalikan barang yang rusak atau tidak sesuai pesanan ke supplier, yang akan mengurangi saldo hutang (Payables).
7.  **Payment**: Proses pelunasan hutang ke supplier melalui modul **Payments**. Status PO akan berubah menjadi 'Closed' setelah lunas.
8.  **Stock Opname**: Penyesuaian rutin stok fisik vs sistem untuk akurasi inventori.

### B. Penjualan & Kasir (Sales / POS)
Alur keluar barang dan pendapatan:
1.  **Sales Transaction**: Modul POS (Point of Sale) untuk transaksi langsung.
    - Mengurangi stok secara real-time.
    - Mendukung pembayaran Tunai, Bank, dan **QRIS (Mayar Integration)**.
2.  **Sales Invoices**: Dokumen tagihan resmi untuk pelanggan.
3.  **Receivables**: Manajemen piutang pelanggan. Mendukung pembuatan link pembayaran digital via Mayar.

### C. Keuangan & Akuntansi (Financials)
Tradixa menggunakan sistem pencatatan ganda (Double-entry bookkeeping):
1.  **Chart of Accounts (COA)**: Daftar akun akuntansi (Aset, Kewajiban, Modal, Pendapatan, Biaya).
2.  **Journal Entries**: Setiap transaksi (Sales, Purchase, Expense) otomatis menciptakan jurnal.
3.  **Bank Reconciliation**: Mencocokkan saldo Bank di sistem dengan mutasi asli.
4.  **Financial Statements**: Laporan Laba Rugi, Neraca, dan Arus Kas.

### D. Sistem Agen Finansial (Financial Agent)
Modul khusus untuk mengelola jaringan agen:
1.  **Agent Workflow**: Alur kerja pendaftaran dan aktivitas agen.
2.  **Agent Transactions**: Transaksi jasa keuangan oleh agen (Transfer, PPOB, dll).
3.  **Fee Sharing**: Perhitungan otomatis bagi hasil/fee untuk agen dan sistem.
4.  **Saldo & Kas Agen**: Manajemen deposit dan limit transaksi agen.

### E. Marketing & CRM
1.  **Customer Segmentation**: Mengelompokkan pelanggan berdasarkan perilaku belanja (RFM Analysis).
2.  **Marketing Automation**: Mengirim kampanye otomatis (Email/WhatsApp) berdasarkan segmentasi.
3.  **Loyalty Program**: Poin belanja dan penukaran reward bagi pelanggan setia.

---

## 3. Integrasi Pihak Ketiga

### 1. Mayar Payment Gateway (Multi-Tenant)
- **Keamanan**: Setiap toko WAJIB menggunakan API Key Mayar milik mereka sendiri (Read & Write).
- **Isolasi**: Tidak ada fallback ke API Key global. Jika toko belum setting API Key, fitur QRIS dinonaktifkan.
- **Alur**: Edge Function `mayar-create-link` mengambil API Key dari tabel `stores` -> Generate Link -> User Bayar -> Saldo masuk ke Wallet Toko tersebut.

---

## 4. Keamanan & Hak Akses (RBAC)
1.  **Role Owner**: Akses penuh ke seluruh fitur dan pengaturan toko.
2.  **Role Staff**: Akses terbatas sesuai modul yang diizinkan oleh Owner.
3.  **Audit Log**: Setiap aktivitas penting (Hapus data, Update stok, Simpan API Key) dicatat di `system_audit_logs`.

---

## 5. Troubleshooting Umum
- **Link Mayar 404**: Pastikan API Key di Company Settings sudah benar (bukan Sandbox) dan sudah di-deploy.
- **Stok Tidak Update**: Cek apakah transaksi sudah berstatus 'Paid' atau 'Completed'.
- **Gagal Login**: Pastikan email sudah terdaftar dan melakukan verifikasi di database `users`.

---
*Blueprint ini diperbarui pada: 8 Mei 2026*
