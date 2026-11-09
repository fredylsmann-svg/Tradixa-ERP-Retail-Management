-- ============================================================
-- 130: CHAT PUSH NOTIFICATION (COOLDOWN 30s), ENTERPRISE PUSH FIX,
--      RLS STORE-SCOPE ALIGNMENT & SCALABILITY INDEXES
-- ============================================================
-- Isi migration ini (100% non-destruktif & aman dijalankan):
--   1. Perbaiki register_push_token agar otomatis mengisi store_id
--      dari users.current_store_id bila kosong.
--   2. Perbaiki trigger_push_on_db_change (095) agar paket 'enterprise'
--      juga menerima Push Notification (sebelumnya hanya 'premium')
--      + tambahkan Push Notification untuk Chat (internal_messages)
--      dengan Cooldown 30 detik (hemat egress & anti-spam).
--   3. Samakan policy RLS untuk automation_rules & fund_transfers
--      ke rumus Store-Scope (seperti tabel products).
--   4. Kunci kolom sensitif users (role, current_store_id, modules,
--      authorities, limit) agar staf tidak bisa meng-upgrade role
--      sendiri lewat Postman/Console.
--   5. Cabut akses anonim (anon) dari 11 fungsi RPC Laporan (112-122).
--   6. Tambahkan index performa untuk skala ribuan user.
--
-- Rollback: supabase/rollbacks/130_rollback_chat_push_and_enterprise_hardening.sql
-- ============================================================

-- 1. PERBAIKI register_push_token AGAR SELALU MENYIMPAN store_id
CREATE OR REPLACE FUNCTION public.register_push_token(
    p_fcm_token TEXT,
    p_store_id UUID,
    p_device_name VARCHAR
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_store_text TEXT;
    v_final_store_id UUID;
BEGIN
    SELECT id, COALESCE(NULLIF(current_store_id, ''), NULLIF(store_id, ''))
      INTO v_user_id, v_user_store_text
      FROM public.users
     WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not found in public.users';
    END IF;

    v_final_store_id := p_store_id;
    IF v_final_store_id IS NULL AND v_user_store_text IS NOT NULL THEN
        BEGIN
            v_final_store_id := v_user_store_text::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_final_store_id := NULL;
        END;
    END IF;

    INSERT INTO public.user_push_subscriptions (user_id, store_id, device_name, fcm_token, updated_at)
    VALUES (v_user_id, v_final_store_id, p_device_name, p_fcm_token, now())
    ON CONFLICT (fcm_token)
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        store_id = COALESCE(EXCLUDED.store_id, public.user_push_subscriptions.store_id),
        device_name = EXCLUDED.device_name,
        updated_at = now();
END;
$$;


-- 2. UPDATE TRIGGER PUSH NOTIFICATION (SUPPORT ENTERPRISE + CHAT COOLDOWN 30 DETIK)
CREATE OR REPLACE FUNCTION public.trigger_push_on_db_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  railway_payload JSONB;
  store_id_val UUID;
  title_val TEXT;
  body_val TEXT;
  store_plan TEXT;
  v_sender_name TEXT;
  v_recent_unread_exists BOOLEAN;
  backend_url TEXT := 'https://tradixa-erp-retail-management-production.up.railway.app/webhook/notifications';
BEGIN
  -- Resolve store_id based on table
  IF TG_TABLE_NAME IN ('products', 'purchase_orders', 'purchase_requisitions', 'internal_messages') THEN
    IF NEW.store_id IS NULL OR NEW.store_id::TEXT = '' THEN
      RETURN NEW;
    END IF;
    store_id_val := NEW.store_id::UUID;
  ELSE
    RETURN NEW;
  END IF;

  -- Izinkan paket 'premium' DAN 'enterprise'
  SELECT plan INTO store_plan FROM public.stores WHERE id = store_id_val;
  IF store_plan IS NULL OR store_plan NOT IN ('premium', 'enterprise') THEN
    RETURN NEW;
  END IF;

  -- =========================================================================
  -- CASE A: Products Table (Low Stock Alert)
  -- =========================================================================
  IF TG_TABLE_NAME = 'products' THEN
    IF (OLD.stock > NEW.reorder_level OR OLD.stock IS NULL) AND NEW.stock <= NEW.reorder_level AND NEW.stock >= 0 THEN
      title_val := '⚠️ Peringatan Stok Menipis!';
      body_val := 'Produk "' || NEW.name || '" tersisa ' || NEW.stock || ' ' || COALESCE(NEW.unit, 'pcs') || ' (Batas minimal: ' || NEW.reorder_level || ').';

      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );

      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;

  -- =========================================================================
  -- CASE B: Purchase Orders Table (Supplier Status Update)
  -- =========================================================================
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('Approved', 'Cancelled', 'Negotiation') THEN
      IF NEW.status = 'Approved' THEN
        title_val := '✅ Purchase Order Disetujui';
        body_val := 'PO #' || NEW.po_number || ' telah disetujui dan ditandatangani oleh supplier (' || NEW.supplier_name || ').';
      ELSIF NEW.status = 'Cancelled' THEN
        title_val := '❌ Purchase Order Dibatalkan';
        body_val := 'PO #' || NEW.po_number || ' telah dibatalkan/ditolak. Alasan: ' || COALESCE(NEW.cancellation_reason, 'Tidak ada alasan.') || '.';
      ELSIF NEW.status = 'Negotiation' THEN
        title_val := '💬 Negosiasi Purchase Order';
        body_val := 'Supplier (' || NEW.supplier_name || ') mengajukan negosiasi harga untuk PO #' || NEW.po_number || '.';
      END IF;

      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );

      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;

  -- =========================================================================
  -- CASE C: Purchase Requisitions Table (PR Submitted / Status Change)
  -- =========================================================================
  ELSIF TG_TABLE_NAME = 'purchase_requisitions' THEN
    IF (TG_OP = 'INSERT' AND NEW.status IN ('Diajukan', 'Menunggu Level 2')) OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('Diajukan', 'Menunggu Level 2', 'Approved', 'Rejected')) THEN

      IF NEW.status = 'Diajukan' THEN
        title_val := '📋 Pengajuan PR Baru';
        body_val := 'PR #' || NEW.pr_number || ' diajukan oleh ' || COALESCE(NEW.requester_name, 'Staf') || ' dan menunggu persetujuan Level 1.';
      ELSIF NEW.status = 'Menunggu Level 2' THEN
        title_val := '⏳ PR Menunggu Approval Level 2';
        body_val := 'PR #' || NEW.pr_number || ' telah disetujui Level 1 dan kini membutuhkan persetujuan Level 2 (Manajer).';
      ELSIF NEW.status = 'Approved' THEN
        title_val := '✅ Purchase Requisition Disetujui';
        body_val := 'PR #' || NEW.pr_number || ' telah disetujui sepenuhnya dan siap diproses menjadi PO.';
      ELSIF NEW.status = 'Rejected' THEN
        title_val := '❌ Purchase Requisition Ditolak';
        body_val := 'PR #' || NEW.pr_number || ' telah ditolak. Alasan: ' || COALESCE(NEW.rejection_reason, 'Tidak disebutkan') || '.';
      END IF;

      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );

      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;

  -- =========================================================================
  -- CASE D: Internal Messages (Chat Antar Karyawan — Cooldown 30 Detik)
  -- =========================================================================
  ELSIF TG_TABLE_NAME = 'internal_messages' AND TG_OP = 'INSERT' THEN
    IF NEW.receiver_id IS NOT NULL AND NEW.sender_id IS DISTINCT FROM NEW.receiver_id THEN
      -- Cooldown 30 detik: jika dalam 30 detik terakhir sudah ada chat belum dibaca
      -- dari pengirim yang sama ke penerima ini, jangan tembak push lagi (hemat egress & anti-spam)
      SELECT EXISTS (
        SELECT 1
          FROM public.internal_messages
         WHERE store_id = NEW.store_id
           AND sender_id = NEW.sender_id
           AND receiver_id = NEW.receiver_id
           AND id <> NEW.id
           AND is_read = false
           AND created_at >= (now() - INTERVAL '30 seconds')
      ) INTO v_recent_unread_exists;

      IF NOT v_recent_unread_exists THEN
        SELECT COALESCE(NULLIF(full_name, ''), email, 'Rekan Kerja')
          INTO v_sender_name
          FROM public.users
         WHERE id = NEW.sender_id
         LIMIT 1;

        -- Kirim ke Go Backend di Railway (asynchronous via pg_net, 0ms delay ke chat)
        railway_payload := jsonb_build_object(
          'type', 'INSERT',
          'table', 'internal_messages',
          'record', jsonb_build_object(
            'store_id', store_id_val::TEXT,
            'receiver_id', NEW.receiver_id::TEXT,
            'created_by_id', NEW.receiver_id::TEXT,
            'sender_name', COALESCE(v_sender_name, 'Rekan Kerja'),
            'message', left(COALESCE(NEW.message, ''), 80)
          )
        );
        PERFORM net.http_post(
          url := backend_url,
          headers := '{"Content-Type": "application/json"}'::JSONB,
          body := railway_payload
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger push notification for table %: %', TG_TABLE_NAME, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_internal_message_push ON public.internal_messages;
CREATE TRIGGER on_internal_message_push
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_db_change();


-- 3. SAMAKAN POLICY RLS automation_rules & fund_transfers KE STORE-SCOPE
DROP POLICY IF EXISTS "Fallback auth automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Fallback anon automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Store scope automation_rules" ON public.automation_rules;

CREATE POLICY "Store scope automation_rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM public.users
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM public.users
      WHERE email = auth.jwt()->>'email'
    )
  );

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.fund_transfers;
DROP POLICY IF EXISTS "Store scope fund_transfers" ON public.fund_transfers;

CREATE POLICY "Store scope fund_transfers" ON public.fund_transfers
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM public.users
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM public.users
      WHERE email = auth.jwt()->>'email'
    )
  );


-- 4. PROTEKSI KOLOM SENSITIF TABEL USERS (ANTI PRIVILEGE ESCALATION)
-- Staf biasa tetap bisa meng-update profilnya sendiri (nama, foto, HP, fcm_token),
-- tetapi TIDAK BISA mengubah role menjadi 'owner', menaikkan limit, atau
-- memindahkan current_store_id ke toko orang lain lewat Postman/Console.
CREATE OR REPLACE FUNCTION public.protect_users_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
BEGIN
  -- Jika dijalankan oleh fungsi server internal (SECURITY DEFINER / service_role / postgres)
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR COALESCE(auth.jwt()->>'role', '') = 'service_role'
     OR v_caller_email = '' THEN
    RETURN NEW;
  END IF;

  -- Jika tidak ada kolom sensitif yang berubah, langsung izinkan
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.current_store_id IS NOT DISTINCT FROM OLD.current_store_id
     AND NEW.modules IS NOT DISTINCT FROM OLD.modules
     AND NEW.authorities IS NOT DISTINCT FROM OLD.authorities
     AND NEW.approval_limit IS NOT DISTINCT FROM OLD.approval_limit
     AND NEW.max_discount_limit IS NOT DISTINCT FROM OLD.max_discount_limit THEN
    RETURN NEW;
  END IF;

  -- Developer / Super Admin bypass
  IF v_caller_email IN (
    'dev@tradixa.com',
    'ferdiarmond@gmail.com',
    'admin@tradixa.com',
    'tradixasystems@gmail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- Owner yang baru menyelesaikan Store Setup untuk pertama kali (mengisi current_store_id miliknya sendiri)
  IF lower(OLD.email) = v_caller_email
     AND OLD.role = 'owner'
     AND NEW.role = 'owner'
     AND EXISTS (
       SELECT 1 FROM public.stores s
       WHERE s.id::TEXT = COALESCE(NEW.current_store_id, '')
         AND (s.owner_user_id::TEXT = OLD.id::TEXT OR lower(COALESCE(s.owner_email, '')) = v_caller_email)
     ) THEN
    RETURN NEW;
  END IF;

  -- Owner dari toko tempat user tersebut bernaung boleh mengubah role/modul/limit karyawannya
  IF EXISTS (
    SELECT 1
      FROM public.users caller
      JOIN public.stores s ON s.id::TEXT = caller.current_store_id::TEXT
     WHERE lower(caller.email) = v_caller_email
       AND caller.current_store_id = OLD.current_store_id
       AND (caller.role = 'owner' OR s.owner_user_id::TEXT = caller.id::TEXT OR lower(COALESCE(s.owner_email, '')) = v_caller_email)
  ) AND NEW.current_store_id IS NOT DISTINCT FROM OLD.current_store_id THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Akses ditolak: Hanya pemilik toko (Owner) yang dapat mengubah role, modul, limit otoritas, atau toko aktif.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_sensitive_columns ON public.users;
CREATE TRIGGER trg_protect_users_sensitive_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_users_sensitive_columns();


-- 5. CABUT AKSES ANON DARI 11 FUNGSI RPC LAPORAN (112-122) — AMAN JIKA ADA FUNGSI YANG BELUM DIBUAT
DO $$
DECLARE
  fn_sig TEXT;
  fn_list TEXT[] := ARRAY[
    'public.get_dashboard_summary(text, text, text)',
    'public.get_financial_statements(text, date, date, text)',
    'public.get_sales_report(text, date, date, text, text)',
    'public.get_revenue_reports(text, int, text)',
    'public.get_sales_performance(text, date, text)',
    'public.get_stock_report(text)',
    'public.get_inventory_reports(text, text)',
    'public.get_general_reports(text, text, date, date, text)',
    'public.get_warehouse_dashboard(text, text)',
    'public.get_cash_register(text, int, int, text, text, text)',
    'public.get_store_categories(text)'
  ];
BEGIN
  FOREACH fn_sig IN ARRAY fn_list LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn_sig);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Fungsi % belum ada, dilewati.', fn_sig;
    END;
  END LOOP;
END $$;


-- 6. INDEX SKALABILITAS UNTUK RIBUAN USER & VOLUME TRANSAKSI TINGGI
CREATE INDEX IF NOT EXISTS idx_users_current_store_id ON public.users (current_store_id);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS idx_stores_owner_email_lower ON public.stores (lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_stores_owner_user_id ON public.stores (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_sales_tx_store_created ON public.sales_transactions (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mov_store_created ON public.stock_movements (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_store_created ON public.journal_entries (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_store_created ON public.expenses (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_store_created ON public.bank_transactions (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_msg_unread_cooldown ON public.internal_messages (store_id, sender_id, receiver_id, is_read, created_at DESC);
