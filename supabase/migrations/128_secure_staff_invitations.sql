-- ============================================================
-- 128: SECURE STAFF INVITATIONS (token-based)
-- ============================================================
-- Masalah lama:
--   Link undangan karyawan berisi store_id, role, modules, limit
--   langsung di URL (/register?store_id=..&role=..). Siapa pun bisa
--   mengedit URL -> jadi admin, menaikkan limit approval, atau
--   bergabung ke toko lain.
--
-- Solusi:
--   - Detail undangan disimpan di tabel store_invitations.
--   - Link hanya berisi token acak: /register?token=xxxx
--   - Token sekali pakai, kedaluwarsa 7 hari.
--   - Semua akses lewat RPC SECURITY DEFINER (tabel tidak bisa
--     dibaca/ditulis langsung dari client).
--
-- File ini ADDITIVE: tidak mengubah tabel/policy yang sudah ada.
-- Rollback: supabase/rollbacks/128_rollback_secure_staff_invitations.sql
-- ============================================================

-- 1. TABEL ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_invitations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token              TEXT NOT NULL UNIQUE,
  store_id           TEXT NOT NULL,
  invited_by_email   TEXT NOT NULL,
  full_name          TEXT NOT NULL DEFAULT '',
  phone              TEXT NOT NULL DEFAULT '',
  position           TEXT NOT NULL DEFAULT '',
  role               TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  modules            JSONB NOT NULL DEFAULT '[]'::jsonb,
  authorities        JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_limit     NUMERIC NOT NULL DEFAULT 0,
  max_discount_limit NUMERIC NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_by_email  TEXT,
  accepted_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_invitations_store ON public.store_invitations (store_id);

-- RLS aktif TANPA policy = tidak bisa diakses langsung oleh anon/authenticated.
ALTER TABLE public.store_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_invitations FROM anon, authenticated;


-- 2. RPC: BUAT UNDANGAN (owner/admin toko) --------------------
CREATE OR REPLACE FUNCTION public.create_store_invitation(
  p_store_id           TEXT,
  p_full_name          TEXT,
  p_position           TEXT,
  p_role               TEXT DEFAULT 'staff',
  p_phone              TEXT DEFAULT '',
  p_modules            JSONB DEFAULT '[]'::jsonb,
  p_authorities        JSONB DEFAULT '[]'::jsonb,
  p_approval_limit     NUMERIC DEFAULT 0,
  p_max_discount_limit NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email   TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
  v_caller  public.users%ROWTYPE;
  v_store   public.stores%ROWTYPE;
  v_allowed BOOLEAN := false;
  v_token   TEXT;
  v_inv     public.store_invitations%ROWTYPE;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Anda harus login untuk membuat undangan.';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id::text = p_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Toko tidak ditemukan.';
  END IF;

  SELECT * INTO v_caller FROM public.users WHERE lower(email) = v_email LIMIT 1;

  -- Owner toko (berdasarkan owner_user_id / owner_email) ATAU owner/admin di toko ini
  v_allowed :=
    (v_caller.id IS NOT NULL AND COALESCE(v_store.owner_user_id::text, '') = v_caller.id::text)
    OR lower(COALESCE(v_store.owner_email, '')) = v_email
    OR (v_caller.id IS NOT NULL
        AND COALESCE(v_caller.current_store_id, '') = p_store_id
        AND v_caller.role IN ('owner', 'admin'));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Anda tidak memiliki hak untuk mengundang karyawan ke toko ini.';
  END IF;

  IF COALESCE(p_role, 'staff') NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Role undangan tidak valid.';
  END IF;

  IF length(trim(COALESCE(p_full_name, ''))) = 0 OR length(p_full_name) > 120 THEN
    RAISE EXCEPTION 'Nama karyawan wajib diisi (maks 120 karakter).';
  END IF;

  IF length(trim(COALESCE(p_position, ''))) = 0 OR length(p_position) > 120 THEN
    RAISE EXCEPTION 'Jabatan wajib diisi (maks 120 karakter).';
  END IF;

  IF jsonb_typeof(COALESCE(p_modules, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(COALESCE(p_authorities, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Format modul/otoritas tidak valid.';
  END IF;

  -- Token acak 64 hex (2x UUID v4, sumber random kriptografis)
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.store_invitations (
    token, store_id, invited_by_email, full_name, phone, position, role,
    modules, authorities, approval_limit, max_discount_limit
  ) VALUES (
    v_token, p_store_id, v_email, trim(p_full_name), COALESCE(p_phone, ''), trim(p_position),
    COALESCE(p_role, 'staff'),
    COALESCE(p_modules, '[]'::jsonb), COALESCE(p_authorities, '[]'::jsonb),
    GREATEST(COALESCE(p_approval_limit, 0), 0), GREATEST(COALESCE(p_max_discount_limit, 0), 0)
  )
  RETURNING * INTO v_inv;

  RETURN jsonb_build_object(
    'id', v_inv.id,
    'token', v_inv.token,
    'expires_at', v_inv.expires_at
  );
END;
$$;


-- 3. RPC: LIHAT INFO UNDANGAN (publik, untuk halaman /register) --
CREATE OR REPLACE FUNCTION public.get_store_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv        public.store_invitations%ROWTYPE;
  v_store_name TEXT;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_inv FROM public.store_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_inv.status = 'accepted' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  ELSIF v_inv.status = 'revoked' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  ELSIF v_inv.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  SELECT store_name INTO v_store_name FROM public.stores WHERE id::text = v_inv.store_id;

  RETURN jsonb_build_object(
    'valid', true,
    'store_name', COALESCE(v_store_name, ''),
    'full_name', v_inv.full_name,
    'position', v_inv.position,
    'role', v_inv.role,
    'expires_at', v_inv.expires_at
  );
END;
$$;


-- 4. RPC: TERIMA UNDANGAN (setelah sign up / login) -----------
-- Email diambil dari JWT (tidak bisa dipalsukan dari client).
-- Idempotent: aman dipanggil 2x (StaffRegister + AuthContext).
CREATE OR REPLACE FUNCTION public.accept_store_invitation(p_token TEXT)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email     TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
  v_meta_name TEXT := COALESCE(auth.jwt()->'user_metadata'->>'full_name', '');
  v_inv       public.store_invitations%ROWTYPE;
  v_user      public.users%ROWTYPE;
  v_today     TEXT := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Anda harus login untuk menerima undangan.';
  END IF;

  -- Cegah race condition untuk email yang sama
  PERFORM pg_advisory_xact_lock(hashtext('store_invite:' || v_email));

  SELECT * INTO v_inv FROM public.store_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Undangan tidak ditemukan.';
  END IF;

  -- Sudah diterima: OK jika oleh email yang sama (idempotent)
  IF v_inv.status = 'accepted' THEN
    IF lower(COALESCE(v_inv.accepted_by_email, '')) = v_email THEN
      SELECT * INTO v_user FROM public.users WHERE lower(email) = v_email LIMIT 1;
      RETURN v_user;
    END IF;
    RAISE EXCEPTION 'Undangan ini sudah digunakan.';
  END IF;

  IF v_inv.status = 'revoked' THEN
    RAISE EXCEPTION 'Undangan ini sudah dibatalkan.';
  END IF;

  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'Undangan sudah kedaluwarsa. Minta undangan baru ke admin toko.';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE lower(email) = v_email LIMIT 1;

  IF FOUND THEN
    -- Jangan pernah "menurunkan" owner toko menjadi staff
    IF EXISTS (
      SELECT 1 FROM public.stores s
      WHERE COALESCE(s.owner_user_id::text, '') = v_user.id::text
         OR lower(COALESCE(s.owner_email, '')) = v_email
    ) THEN
      RAISE EXCEPTION 'Email ini terdaftar sebagai owner toko. Gunakan email lain untuk akun karyawan.';
    END IF;

    -- Jangan pindahkan karyawan dari toko lain secara diam-diam
    IF COALESCE(v_user.current_store_id, '') <> ''
       AND v_user.current_store_id <> v_inv.store_id THEN
      RAISE EXCEPTION 'Email ini sudah terhubung dengan toko lain. Gunakan email lain.';
    END IF;

    UPDATE public.users SET
      full_name                = COALESCE(NULLIF(full_name, ''), NULLIF(v_meta_name, ''), v_inv.full_name),
      role                     = v_inv.role,
      position                 = v_inv.position,
      phone                    = COALESCE(NULLIF(phone, ''), v_inv.phone),
      modules                  = v_inv.modules,
      authorities              = v_inv.authorities,
      approval_limit           = v_inv.approval_limit,
      max_discount_limit       = v_inv.max_discount_limit,
      current_store_id         = v_inv.store_id,
      is_store_setup_completed = true,
      updated_date             = v_today
    WHERE id = v_user.id
    RETURNING * INTO v_user;
  ELSE
    INSERT INTO public.users (
      email, full_name, role, position, phone, modules, authorities,
      approval_limit, max_discount_limit, current_store_id,
      is_store_setup_completed, created_date, updated_date
    ) VALUES (
      v_email, COALESCE(NULLIF(v_meta_name, ''), v_inv.full_name), v_inv.role, v_inv.position,
      v_inv.phone, v_inv.modules, v_inv.authorities,
      v_inv.approval_limit, v_inv.max_discount_limit, v_inv.store_id,
      true, v_today, v_today
    )
    RETURNING * INTO v_user;
  END IF;

  UPDATE public.store_invitations
     SET status = 'accepted', accepted_by_email = v_email, accepted_at = now()
   WHERE id = v_inv.id;

  RETURN v_user;
END;
$$;


-- 5. RPC: CEK EMAIL SUDAH TERDAFTAR (pengganti SELECT anon ke tabel users)
CREATE OR REPLACE FUNCTION public.is_email_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE lower(email) = lower(trim(COALESCE(p_email, '')))
  );
$$;


-- 6. HAK AKSES FUNGSI -----------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_store_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, NUMERIC, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_store_invitation(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_store_invitation(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_email_registered(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_store_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_store_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_invitation(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_registered(TEXT) TO anon, authenticated;

-- ============================================================
-- VERIFIKASI (jalankan terpisah):
--   SELECT proname FROM pg_proc WHERE proname IN
--     ('create_store_invitation','get_store_invitation','accept_store_invitation','is_email_registered');
-- ============================================================
