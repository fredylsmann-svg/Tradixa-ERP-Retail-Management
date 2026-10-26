-- ============================================================
-- 126: BULK IMPORT PRODUCTS (Impor Massal Product Master dari Excel)
-- ============================================================
-- Fungsi BARU, tidak mengubah tabel / trigger / fungsi yang sudah ada.
--
-- Prinsip:
-- - SECURITY INVOKER  -> RLS products & stock_movements (077) tetap berlaku,
--   user hanya bisa impor ke toko yang sedang aktif.
-- - Trigger kuota (124) tetap berjalan per baris sebagai lapisan terakhir.
--   Fungsi ini melakukan pre-check kuota agar pesan error jelas & batch
--   tidak gagal di tengah jalan.
-- - Satu panggilan = satu transaksi (maks 500 baris). Jika ada error,
--   seluruh batch dibatalkan (tidak ada data setengah jadi).
-- - Logika disamakan dengan ProductForm.jsx:
--     * cogs_per_unit = buy_price / conversion_rate
--     * status dari stock vs reorder_level
--     * uom_prices[0] = satuan dasar (sell_unit, 1, sell_price)
--     * stok awal > 0 -> stock_movements 'in' / 'INITIAL_STOCK'
-- - Kunci pencocokan produk = store_id + sku + warehouse_name
--   (sama seperti WarehouseTransfer.jsx).
-- - Mode 'skip'  : produk yang sudah ada dilewati (tidak diubah).
--   Mode 'update': data master produk lama ditimpa dengan data Excel,
--                  STOK TIDAK PERNAH DIUBAH (tetap via Stock In/Out/Opname).
--
-- Format p_rows (JSON array):
--   [{ "idx": 1, "sku": "SKU-SEM-ABC123", "warehouse_name": "Gudang Pusat",
--      "data": { ...hanya kolom yang diisi di Excel... } }, ...]
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.import_products_bulk(text, jsonb, text);
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_products_bulk(
  p_store_id TEXT,
  p_rows JSONB,
  p_mode TEXT DEFAULT 'skip'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_is_dev BOOLEAN := false;
  v_limit NUMERIC;
  v_current NUMERIC;
  v_new_products INT := 0;
  v_new_stock_rows INT := 0;

  v_item JSONB;
  d JSONB;
  p RECORD;
  v_found BOOLEAN;
  v_idx INT;
  v_sku TEXT;
  v_wh TEXT;
  v_id UUID;

  v_name TEXT;
  v_barcode TEXT;
  v_category TEXT;
  v_location TEXT;
  v_buy_unit TEXT;
  v_sell_unit TEXT;
  v_conv NUMERIC;
  v_buy NUMERIC;
  v_sell NUMERIC;
  v_stock NUMERIC;
  v_reorder NUMERIC;
  v_tracking TEXT;
  v_track_exp BOOLEAN;
  v_shelf INT;
  v_issue TEXT;
  v_image TEXT;
  v_extras JSONB;
  v_uom JSONB;
  v_status TEXT;
  v_cogs NUMERIC;

  v_ts TEXT;
  v_today TEXT;
  v_inserted INT := 0;
  v_updated INT := 0;
  v_skipped INT := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- ----------------------------------------------------------
  -- 0. Validasi input dasar
  -- ----------------------------------------------------------
  IF p_store_id IS NULL OR p_store_id = '' THEN
    RAISE EXCEPTION 'Toko tidak valid.';
  END IF;

  IF p_mode IS NULL OR p_mode NOT IN ('skip', 'update') THEN
    RAISE EXCEPTION 'Mode impor tidak dikenal: %', COALESCE(p_mode, 'NULL');
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Format data impor tidak valid.';
  END IF;

  IF jsonb_array_length(p_rows) = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'updated', 0, 'skipped', 0, 'results', '[]'::jsonb);
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Maksimal 500 baris per batch impor.';
  END IF;

  -- ----------------------------------------------------------
  -- 1. User harus login & sedang aktif di toko ini (selaras RLS 077)
  -- ----------------------------------------------------------
  v_email := auth.jwt()->>'email';
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak valid. Silakan login ulang.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE email = v_email AND current_store_id::TEXT = p_store_id
  ) THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses impor ke toko ini.';
  END IF;

  -- Daftar bypass identik dengan check_entity_limit() (migration 124)
  v_is_dev := v_email IN (
    'dev@tradixa.com',
    'ferdiarmond@gmail.com',
    'admin@tradixa.com',
    'tradixasystems@gmail.com'
  );

  -- ----------------------------------------------------------
  -- 2. Pre-check kuota paket (pakai get_store_limit dari 124 jika ada)
  -- ----------------------------------------------------------
  IF NOT v_is_dev AND to_regprocedure('public.get_store_limit(text,text)') IS NOT NULL THEN

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE x.stock > 0)
    INTO v_new_products, v_new_stock_rows
    FROM (
      SELECT DISTINCT ON (r->>'sku', COALESCE(r->>'warehouse_name', ''))
        r->>'sku' AS sku,
        COALESCE(r->>'warehouse_name', '') AS wh,
        COALESCE(NULLIF(r->'data'->>'stock', '')::NUMERIC, 0) AS stock
      FROM jsonb_array_elements(p_rows) r
    ) x
    WHERE NOT EXISTS (
      SELECT 1 FROM products pr
      WHERE pr.store_id = p_store_id
        AND pr.sku = x.sku
        AND COALESCE(pr.warehouse_name, '') = x.wh
    );

    -- Kuota produk
    IF v_new_products > 0 THEN
      EXECUTE 'SELECT public.get_store_limit($1, $2)' INTO v_limit USING p_store_id, 'products';
      IF v_limit = 0 THEN
        RAISE EXCEPTION 'Penambahan produk tidak tersedia untuk paket Anda. Silakan upgrade paket.';
      ELSIF v_limit <> -1 THEN
        SELECT COUNT(*) INTO v_current FROM products WHERE store_id = p_store_id;
        IF v_current + v_new_products > v_limit THEN
          RAISE EXCEPTION 'Kuota produk tidak cukup: terpakai %, akan ditambah %, batas paket %. Silakan upgrade paket atau kurangi jumlah baris.',
            v_current, v_new_products, v_limit;
        END IF;
      END IF;
    END IF;

    -- Kuota pencatatan stok masuk (ledger INITIAL_STOCK)
    IF v_new_stock_rows > 0 THEN
      EXECUTE 'SELECT public.get_store_limit($1, $2)' INTO v_limit USING p_store_id, 'stock_movements_in';
      IF v_limit = 0 THEN
        RAISE EXCEPTION 'Pencatatan stok masuk tidak tersedia untuk paket Anda. Kosongkan kolom Stok Awal atau upgrade paket.';
      ELSIF v_limit <> -1 THEN
        SELECT COUNT(*) INTO v_current FROM stock_movements
        WHERE store_id = p_store_id AND movement_type = 'in';
        IF v_current + v_new_stock_rows > v_limit THEN
          RAISE EXCEPTION 'Kuota pencatatan stok masuk tidak cukup: terpakai %, dibutuhkan % untuk stok awal, batas paket %. Kosongkan kolom Stok Awal pada sebagian produk atau upgrade paket.',
            v_current, v_new_stock_rows, v_limit;
        END IF;
      END IF;
    END IF;
  END IF;

  -- ----------------------------------------------------------
  -- 3. Timestamp (format sama dengan ProductForm: DD/MM/YYYY HH:MM WIB)
  -- ----------------------------------------------------------
  v_ts := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' WIB';
  v_today := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');

  -- ----------------------------------------------------------
  -- 4. Proses tiap baris
  -- ----------------------------------------------------------
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_idx := COALESCE(NULLIF(v_item->>'idx', '')::INT, -1);
    v_sku := NULLIF(trim(COALESCE(v_item->>'sku', '')), '');
    v_wh  := trim(COALESCE(v_item->>'warehouse_name', ''));
    d     := COALESCE(v_item->'data', '{}'::jsonb);

    IF v_sku IS NULL THEN
      RAISE EXCEPTION 'SKU kosong pada baris %.', v_idx;
    END IF;

    SELECT * INTO p FROM products
    WHERE store_id = p_store_id
      AND sku = v_sku
      AND COALESCE(warehouse_name, '') = v_wh
    ORDER BY created_at ASC
    LIMIT 1;
    v_found := FOUND;

    -- Mode LEWATI: produk lama tidak disentuh
    IF v_found AND p_mode = 'skip' THEN
      v_skipped := v_skipped + 1;
      v_results := v_results || jsonb_build_object('idx', v_idx, 'id', p.id, 'action', 'skipped');
      CONTINUE;
    END IF;

    IF v_found THEN
      -- MODE UPDATE: kolom kosong di Excel = pakai nilai lama
      v_name      := COALESCE(NULLIF(d->>'name', ''), p.name);
      v_barcode   := COALESCE(d->>'barcode', p.barcode, '');
      v_category  := COALESCE(NULLIF(d->>'category', ''), NULLIF(p.category, ''), 'Sembako');
      v_location  := COALESCE(d->>'location_name', p.location_name, '');
      v_buy_unit  := COALESCE(NULLIF(d->>'buy_unit', ''), NULLIF(p.buy_unit, ''), 'Dus');
      v_sell_unit := COALESCE(NULLIF(d->>'sell_unit', ''), NULLIF(p.sell_unit, ''), 'Pcs');
      v_conv      := COALESCE(NULLIF(d->>'conversion_rate', '')::NUMERIC, p.conversion_rate, 1);
      v_buy       := COALESCE(NULLIF(d->>'buy_price', '')::NUMERIC, p.buy_price, 0);
      v_sell      := COALESCE(NULLIF(d->>'sell_price', '')::NUMERIC, p.sell_price, 0);
      v_stock     := COALESCE(p.stock, 0); -- STOK TIDAK DIUBAH lewat impor
      v_reorder   := COALESCE(NULLIF(d->>'reorder_level', '')::NUMERIC, p.reorder_level, 10);
      v_tracking  := COALESCE(NULLIF(d->>'tracking_type', ''), NULLIF(p.tracking_type, ''), 'None');
      v_track_exp := COALESCE(NULLIF(d->>'track_expiry', '')::BOOLEAN, p.track_expiry, false);
      v_shelf     := COALESCE(NULLIF(d->>'default_shelf_life', '')::INT, p.default_shelf_life, 365);
      v_issue     := COALESCE(NULLIF(d->>'issue_method', ''), NULLIF(p.issue_method, ''), 'FIFO');
      v_image     := COALESCE(NULLIF(d->>'image_url', ''), p.image_url, '');
      v_extras    := CASE
                       WHEN d ? 'uom_extra' AND jsonb_typeof(d->'uom_extra') = 'array' THEN d->'uom_extra'
                       WHEN jsonb_typeof(p.uom_prices) = 'array' AND jsonb_array_length(p.uom_prices) > 1 THEN p.uom_prices - 0
                       ELSE '[]'::jsonb
                     END;
    ELSE
      -- PRODUK BARU: kolom kosong = default ProductForm
      v_name      := NULLIF(trim(COALESCE(d->>'name', '')), '');
      v_barcode   := COALESCE(d->>'barcode', '');
      v_category  := COALESCE(NULLIF(d->>'category', ''), 'Sembako');
      v_location  := COALESCE(d->>'location_name', '');
      v_buy_unit  := COALESCE(NULLIF(d->>'buy_unit', ''), 'Dus');
      v_sell_unit := COALESCE(NULLIF(d->>'sell_unit', ''), 'Pcs');
      v_conv      := COALESCE(NULLIF(d->>'conversion_rate', '')::NUMERIC, 24);
      v_buy       := COALESCE(NULLIF(d->>'buy_price', '')::NUMERIC, 0);
      v_sell      := COALESCE(NULLIF(d->>'sell_price', '')::NUMERIC, 0);
      v_stock     := COALESCE(NULLIF(d->>'stock', '')::NUMERIC, 0);
      v_reorder   := COALESCE(NULLIF(d->>'reorder_level', '')::NUMERIC, 10);
      v_tracking  := COALESCE(NULLIF(d->>'tracking_type', ''), 'None');
      v_track_exp := COALESCE(NULLIF(d->>'track_expiry', '')::BOOLEAN, false);
      v_shelf     := COALESCE(NULLIF(d->>'default_shelf_life', '')::INT, 365);
      v_issue     := COALESCE(NULLIF(d->>'issue_method', ''), 'FIFO');
      v_image     := COALESCE(d->>'image_url', '');
      v_extras    := CASE
                       WHEN d ? 'uom_extra' AND jsonb_typeof(d->'uom_extra') = 'array' THEN d->'uom_extra'
                       ELSE '[]'::jsonb
                     END;

      IF v_name IS NULL THEN
        RAISE EXCEPTION 'Nama produk wajib diisi (baris %).', v_idx;
      END IF;
    END IF;

    IF v_conv IS NULL OR v_conv <= 0 THEN
      RAISE EXCEPTION 'Konversi harus lebih dari 0 (baris %).', v_idx;
    END IF;
    IF v_buy < 0 OR v_sell < 0 OR v_stock < 0 OR v_reorder < 0 THEN
      RAISE EXCEPTION 'Harga / stok tidak boleh minus (baris %).', v_idx;
    END IF;

    -- Rumus identik ProductForm.jsx
    v_cogs := v_buy / v_conv;
    v_uom := jsonb_build_array(
               jsonb_build_object('unit', v_sell_unit, 'qty_per_base', 1, 'sell_price', v_sell)
             ) || v_extras;
    v_status := CASE
                  WHEN v_stock <= 0 THEN 'Out of Stock'
                  WHEN v_stock <= v_reorder THEN 'Low Stock'
                  ELSE 'In Stock'
                END;

    IF v_found THEN
      -- UPDATE data master (kolom stock & sku & warehouse_name tidak disentuh)
      UPDATE products SET
        name               = v_name,
        barcode            = v_barcode,
        category           = v_category,
        location_name      = v_location,
        buy_unit           = v_buy_unit,
        sell_unit          = v_sell_unit,
        conversion_rate    = v_conv,
        buy_price          = v_buy,
        sell_price         = v_sell,
        cogs_per_unit      = v_cogs,
        reorder_level      = v_reorder,
        tracking_type      = v_tracking,
        track_expiry       = v_track_exp,
        default_shelf_life = v_shelf,
        issue_method       = v_issue,
        image_url          = v_image,
        uom_prices         = v_uom,
        status             = v_status,
        timestamp_wib      = v_ts,
        updated_date       = v_today
      WHERE id = p.id;

      v_updated := v_updated + 1;
      v_results := v_results || jsonb_build_object('idx', v_idx, 'id', p.id, 'action', 'updated');
    ELSE
      INSERT INTO products (
        store_id, barcode, sku, name, category, warehouse_name, location_name,
        buy_unit, sell_unit, conversion_rate, buy_price, sell_price, cogs_per_unit,
        stock, reorder_level, tracking_type, track_expiry, default_shelf_life,
        issue_method, image_url, uom_prices, status, timestamp_wib,
        created_date, updated_date
      ) VALUES (
        p_store_id, v_barcode, v_sku, v_name, v_category, v_wh, v_location,
        v_buy_unit, v_sell_unit, v_conv, v_buy, v_sell, v_cogs,
        v_stock, v_reorder, v_tracking, v_track_exp, v_shelf,
        v_issue, v_image, v_uom, v_status, v_ts,
        v_today, v_today
      )
      RETURNING id INTO v_id;

      -- Ledger stok awal (identik ProductForm.jsx)
      IF v_stock > 0 THEN
        INSERT INTO stock_movements (
          store_id, reference, product_id, product_name, movement_type,
          stock_type, quantity, notes, timestamp_wib, created_date, updated_date
        ) VALUES (
          p_store_id, 'INIT-' || v_sku, v_id::TEXT, v_name, 'in',
          'INITIAL_STOCK', v_stock, 'Stok Awal (Impor Excel Product Master)', v_ts, v_today, v_today
        );
      END IF;

      v_inserted := v_inserted + 1;
      v_results := v_results || jsonb_build_object('idx', v_idx, 'id', v_id, 'action', 'inserted');
    END IF;
  END LOOP;

  -- ----------------------------------------------------------
  -- 5. Audit log ringkasan (gagal mencatat log TIDAK membatalkan impor)
  -- ----------------------------------------------------------
  BEGIN
    INSERT INTO system_audit_logs (
      store_id, user_id, user_name, user_email, entity_name, entity_id,
      action_type, description, new_data
    )
    SELECT
      p_store_id::UUID,
      COALESCE(u.id::TEXT, 'system'),
      COALESCE(u.full_name, v_email),
      v_email,
      'Product',
      NULL,
      'import',
      format('Impor Excel Product Master (mode %s): %s ditambah, %s diupdate, %s dilewati',
             p_mode, v_inserted, v_updated, v_skipped),
      jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'skipped', v_skipped, 'mode', p_mode)
    FROM (SELECT 1) one
    LEFT JOIN users u ON u.email = v_email AND u.current_store_id::TEXT = p_store_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log impor gagal dicatat: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'results', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_products_bulk(TEXT, JSONB, TEXT) TO authenticated;
