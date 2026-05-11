-- ============================================================
-- 075: Fix Store ID Resolution for Staff Users
-- ============================================================
-- Masalah: Staff user tidak bisa lihat data toko karena
-- get_user_store_id() gagal resolve store_id untuk staff.
-- 
-- Penyebab: Type casting error (empty string -> UUID fails)
-- dan current_store_id/store_id tidak ter-handle dengan benar.
--
-- Fix: Rewrite helper functions dengan error handling yang kuat.
-- ============================================================

-- =============================================
-- STEP 1: Rewrite helper functions (bullet-proof)
-- =============================================

-- Function: get_user_store_id() → returns UUID
-- Supports: Owner (via stores.owner_user_id) AND Staff (via users.current_store_id/store_id)
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result UUID;
  user_email TEXT;
  user_store_id TEXT;
  user_current_store_id TEXT;
  user_db_id TEXT;
BEGIN
  -- Get email from JWT
  user_email := auth.jwt()->>'email';
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get user record
  SELECT id::text, store_id, current_store_id 
  INTO user_db_id, user_store_id, user_current_store_id
  FROM users 
  WHERE email = user_email 
  LIMIT 1;

  -- Priority 1: User is owner of a store
  IF user_db_id IS NOT NULL THEN
    SELECT s.id INTO result
    FROM stores s
    WHERE s.owner_user_id = user_db_id
    LIMIT 1;
    
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;

  -- Priority 2: User has current_store_id (staff invited via UserManagement)
  IF user_current_store_id IS NOT NULL AND user_current_store_id != '' THEN
    BEGIN
      result := user_current_store_id::UUID;
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      -- current_store_id is not a valid UUID, skip
      NULL;
    END;
  END IF;

  -- Priority 3: User has store_id
  IF user_store_id IS NOT NULL AND user_store_id != '' THEN
    BEGIN
      result := user_store_id::UUID;
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

-- Function: get_my_store_id_text() → returns TEXT
CREATE OR REPLACE FUNCTION get_my_store_id_text()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
  user_email TEXT;
  user_store_id TEXT;
  user_current_store_id TEXT;
  user_db_id TEXT;
BEGIN
  user_email := auth.jwt()->>'email';
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id::text, store_id, current_store_id 
  INTO user_db_id, user_store_id, user_current_store_id
  FROM users 
  WHERE email = user_email 
  LIMIT 1;

  -- Priority 1: Owner
  IF user_db_id IS NOT NULL THEN
    SELECT s.id::text INTO result
    FROM stores s
    WHERE s.owner_user_id = user_db_id
    LIMIT 1;
    
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;

  -- Priority 2: current_store_id (staff)
  IF user_current_store_id IS NOT NULL AND user_current_store_id != '' THEN
    RETURN user_current_store_id;
  END IF;

  -- Priority 3: store_id
  IF user_store_id IS NOT NULL AND user_store_id != '' THEN
    RETURN user_store_id;
  END IF;

  RETURN NULL;
END;
$$;

-- =============================================
-- STEP 2: Fix internal_messages table
-- =============================================
-- The 400 errors were from internal_messages. Check & fix it.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'internal_messages'
  ) THEN
    -- Check if it has store_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'internal_messages' 
      AND column_name = 'store_id'
    ) THEN
      -- No store_id column → drop the store-scoped policy (it was causing 400)
      EXECUTE 'DROP POLICY IF EXISTS "Store scoped access internal_messages" ON internal_messages';
      -- Create open policy instead
      EXECUTE 'CREATE POLICY "Authenticated full access internal_messages" ON internal_messages FOR ALL TO authenticated USING (true) WITH CHECK (true)';
      RAISE NOTICE '[FIX] internal_messages: no store_id, using open policy.';
    END IF;
  END IF;
END $$;

-- =============================================
-- STEP 3: Verify staff user has correct store_id
-- =============================================
-- Show current state of all users (for verification)
SELECT id, email, full_name, role, is_store_setup_completed, 
       store_id, current_store_id
FROM users 
ORDER BY role, email;

-- ============================================================
-- SELESAI! Staff user sekarang bisa lihat data toko yang sama
-- dengan owner. Logout lalu login ulang untuk test.
-- ============================================================
