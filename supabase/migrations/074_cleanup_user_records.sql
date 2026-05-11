-- ============================================================
-- 074: Cleanup — Fix user records after RLS incident
-- ============================================================
-- Saat RLS rusak, AuthContext mungkin membuat record duplikat
-- atau mengubah is_store_setup_completed ke false.
-- Script ini memperbaiki semua itu.
-- ============================================================

-- STEP 1: Lihat semua user yang ada (untuk verifikasi)
-- SELECT id, email, full_name, role, is_store_setup_completed, store_id, current_store_id 
-- FROM users ORDER BY email;

-- STEP 2: Hapus user DUPLIKAT (keep yang paling lama berdasarkan created_at)
-- Jika ada 2 record dengan email sama, hapus yang baru (yang dibuat saat RLS rusak)
DELETE FROM users 
WHERE id IN (
  SELECT id FROM (
    SELECT id, email, 
      ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC NULLS LAST) as rn
    FROM users
  ) sub 
  WHERE rn > 1
);

-- STEP 3: Untuk semua OWNER yang sudah punya toko, 
-- pastikan is_store_setup_completed = true
UPDATE users 
SET is_store_setup_completed = true
WHERE id::text IN (
  SELECT owner_user_id FROM stores
)
AND (is_store_setup_completed IS NULL OR is_store_setup_completed = false);

-- STEP 4: Untuk semua STAFF yang punya current_store_id,
-- pastikan is_store_setup_completed = true
UPDATE users
SET is_store_setup_completed = true
WHERE current_store_id IS NOT NULL
AND (is_store_setup_completed IS NULL OR is_store_setup_completed = false);

-- STEP 5: Untuk staff yang punya store_id tapi bukan current_store_id
UPDATE users
SET is_store_setup_completed = true
WHERE store_id IS NOT NULL
AND (is_store_setup_completed IS NULL OR is_store_setup_completed = false);

-- STEP 6: Verifikasi hasil
SELECT id, email, full_name, role, is_store_setup_completed, store_id, current_store_id 
FROM users ORDER BY email;
