-- Menambahkan kolom created_by_id ke tabel purchase_requisitions
ALTER TABLE public.purchase_requisitions 
ADD COLUMN IF NOT EXISTS created_by_id UUID;

-- Menambahkan kolom created_by_id ke tabel purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS created_by_id UUID;

-- Memberikan komentar penjelasan
COMMENT ON COLUMN public.purchase_requisitions.created_by_id IS 'Menyimpan ID user (UUID) yang membuat dokumen PR ini, digunakan untuk mengirim notifikasi push approval.';
COMMENT ON COLUMN public.purchase_orders.created_by_id IS 'Menyimpan ID user (UUID) yang membuat dokumen PO ini, digunakan untuk mengirim notifikasi push approval.';
