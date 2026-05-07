-- ============================================================
-- BAGIAN 1: FIX RLS — Buka akses untuk semua user yang login
-- ============================================================

-- USERS TABLE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert" ON users;
CREATE POLICY "Users can insert" ON users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can insert users" ON users;
CREATE POLICY "Anon can insert users" ON users FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can read users" ON users;
CREATE POLICY "Anon can read users" ON users FOR SELECT TO anon USING (true);

-- STORES TABLE
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated full access stores" ON stores;
CREATE POLICY "Authenticated full access stores" ON stores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ALL OTHER TABLES — blanket open policy for authenticated users
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('users', 'stores')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_%I" ON %I', tbl.tablename, tbl.tablename);
    EXECUTE format(
      'CREATE POLICY "auth_full_%I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl.tablename, tbl.tablename
    );
  END LOOP;
END $$;

-- ============================================================
-- BAGIAN 2: TRANSFER DATA TOKO ke tradixasystems@gmail.com
-- ============================================================

-- Transfer kepemilikan toko dari ferdiarmond ke tradixasystems
UPDATE stores SET 
  owner_user_id = (SELECT id FROM users WHERE email = 'tradixasystems@gmail.com' LIMIT 1)::uuid,
  owner_email = 'tradixasystems@gmail.com'
WHERE owner_user_id = (SELECT id FROM users WHERE email = 'ferdiarmond@gmail.com' LIMIT 1)::uuid;

-- Hubungkan user tradixasystems ke toko yang sudah ada
UPDATE users SET 
  current_store_id = (SELECT id FROM stores LIMIT 1)::uuid,
  is_store_setup_completed = true
WHERE email = 'tradixasystems@gmail.com';
