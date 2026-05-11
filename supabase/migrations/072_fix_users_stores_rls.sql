-- ============================================================
-- 072: Fix RLS Policies for Users & Stores tables
-- ============================================================
-- Fixes:
-- 1. Staff registration fails (INSERT blocked by RLS)
-- 2. Owner can't see staff in UserManagement (SELECT too restrictive)
-- 3. Staff invite page can't read store name (SELECT blocked)
-- 
-- Root cause: users table policies were too strict.
-- Staff invite flow happens BEFORE auth signup, so needs anon access.
-- Owner needs to see all users from their store.
-- ============================================================

-- =============================================
-- FIX 1: USERS TABLE — Allow same-store access
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert" ON users;
DROP POLICY IF EXISTS "Anon can insert users" ON users;
DROP POLICY IF EXISTS "Anon can read users" ON users;
DROP POLICY IF EXISTS "Authenticated full access users" ON users;
DROP POLICY IF EXISTS "Users can read same store" ON users;

-- SELECT: Authenticated users can read:
-- 1. Their own record (by email)
-- 2. Other users from the same store (for UserManagement, chat, etc.)
CREATE POLICY "Users can read same store" ON users
  FOR SELECT TO authenticated
  USING (
    email = auth.jwt()->>'email'
    OR
    current_store_id IN (
      SELECT current_store_id FROM users WHERE email = auth.jwt()->>'email'
      UNION
      SELECT id::text FROM stores WHERE owner_user_id IN (
        SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
      )
    )
    OR
    store_id IN (
      SELECT store_id FROM users WHERE email = auth.jwt()->>'email'
      UNION
      SELECT id::text FROM stores WHERE owner_user_id IN (
        SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
      )
    )
  );

-- UPDATE: Users can only update their own record
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

-- INSERT: Allow both authenticated and anon to insert
-- (Staff invite creates user record BEFORE auth.signUp)
CREATE POLICY "Users can insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert users" ON users
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon SELECT: needed for staff invite flow
-- (checks if email already exists, loads store name)
CREATE POLICY "Anon can read users" ON users
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- FIX 2: STORES TABLE — Allow staff to read their store
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access stores" ON stores;
DROP POLICY IF EXISTS "Owner can manage store" ON stores;
DROP POLICY IF EXISTS "Staff can read store" ON stores;
DROP POLICY IF EXISTS "Anon read stores" ON stores;

-- Owner: full CRUD on their own store
CREATE POLICY "Owner can manage store" ON stores
  FOR ALL TO authenticated
  USING (
    owner_user_id IN (
      SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    owner_user_id IN (
      SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
    )
  );

-- Staff: can READ the store they belong to
CREATE POLICY "Staff can read store" ON stores
  FOR SELECT TO authenticated
  USING (
    id::text IN (
      SELECT current_store_id FROM users WHERE email = auth.jwt()->>'email' AND current_store_id IS NOT NULL
      UNION
      SELECT store_id FROM users WHERE email = auth.jwt()->>'email' AND store_id IS NOT NULL
    )
  );

-- Anon: read for public pages + staff invite flow
CREATE POLICY "Anon read stores" ON stores
  FOR SELECT TO anon
  USING (true);

-- ============================================================
-- DONE! Users & Stores policies fixed.
-- Staff can now register, and owners can see their staff.
-- ============================================================
