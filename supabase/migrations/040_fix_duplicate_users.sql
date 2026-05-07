-- 1. Hapus semua duplikat kecuali satu per email
DELETE FROM users
WHERE id NOT IN (
    SELECT MIN(id)
    FROM users
    GROUP BY email
);

-- 2. Tambahkan constraint UNIQUE agar tidak bisa ada duplikat lagi
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
