-- ============================================================
-- 124: ENFORCE PLAN LIMITS via TRIGGERS (Backend Security)
-- ============================================================
-- Migrasi ini menambahkan lapisan keamanan di level database
-- untuk mencegah manipulasi kuota via API/Postman.
-- TIDAK mengubah bisnis logic, hanya menambah proteksi.
-- ============================================================

-- Create a helper function to get the numeric limit for a specific entity based on store's plan
CREATE OR REPLACE FUNCTION get_store_limit(p_store_id TEXT, p_entity_name TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_plan TEXT;
    v_has_used_trial BOOLEAN;
    v_is_trial BOOLEAN;
BEGIN
    -- Prevent crash on empty store_id (legacy data)
    IF p_store_id IS NULL OR p_store_id = '' THEN
        RETURN -1;
    END IF;

    SELECT COALESCE(plan, 'free'), COALESCE(has_used_trial, false) 
    INTO v_plan, v_has_used_trial 
    FROM stores WHERE id = p_store_id::uuid;

    -- If store not found, default to free
    IF NOT FOUND THEN
        v_plan := 'free';
        v_has_used_trial := false;
    END IF;

    v_is_trial := (v_plan = 'pro' AND v_has_used_trial = true);

    -- Enterprise gets unlimited for everything
    IF v_plan = 'enterprise' THEN
        RETURN -1; -- -1 means Infinity/Unlimited
    END IF;

    -- Premium: only products are limited (10000), everything else unlimited
    IF v_plan = 'premium' THEN
        CASE p_entity_name
            WHEN 'products' THEN RETURN 10000;
            ELSE RETURN -1;
        END CASE;
    END IF;

    -- Pro Paid: only products are limited (1000), everything else unlimited
    IF v_plan = 'pro' AND NOT v_is_trial THEN
        CASE p_entity_name
            WHEN 'products' THEN RETURN 1000;
            ELSE RETURN -1;
        END CASE;
    END IF;

    -- ============================================================
    -- Free Plan AND Pro Trial have identical limits
    -- Sesuai planConfig.js: free.limits + pro.trialLimits
    -- ============================================================
    CASE p_entity_name
        -- DATA & RESOURCE
        WHEN 'products' THEN RETURN 25;
        WHEN 'customers' THEN RETURN 25;
        WHEN 'suppliers' THEN RETURN 25;
        WHEN 'employees' THEN RETURN 5;

        -- SALES (per bulan)
        WHEN 'sales_transactions' THEN RETURN 50;

        -- FINANCE
        WHEN 'payables' THEN RETURN 5;
        WHEN 'receivables' THEN RETURN 5;
        WHEN 'bank_transactions' THEN RETURN 5;
        WHEN 'expenses' THEN RETURN 5;
        WHEN 'bank_statement_history' THEN RETURN 50;

        -- INVENTORY MOVEMENTS
        WHEN 'stock_movements_in' THEN RETURN 5;
        WHEN 'stock_movements_out' THEN RETURN 5;

        -- LOGISTICS
        WHEN 'outbound_deliveries' THEN RETURN 5;
        
        -- PROCUREMENT (Free = 0/Locked, Trial = 5)
        WHEN 'purchase_requisitions' THEN 
            IF v_is_trial THEN RETURN 5; ELSE RETURN 0; END IF;
        WHEN 'purchase_orders' THEN 
            IF v_is_trial THEN RETURN 5; ELSE RETURN 0; END IF;
        WHEN 'goods_receipts' THEN 
            IF v_is_trial THEN RETURN 5; ELSE RETURN 0; END IF;
        WHEN 'inventory_grns' THEN 
            IF v_is_trial THEN RETURN 5; ELSE RETURN 0; END IF;
        WHEN 'supplier_returns' THEN 
            IF v_is_trial THEN RETURN 5; ELSE RETURN 0; END IF;
            
        ELSE RETURN -1;
    END CASE;
    
    RETURN -1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- The generic trigger function to check limits before INSERT
CREATE OR REPLACE FUNCTION check_entity_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_limit NUMERIC;
    v_current_count NUMERIC;
    v_entity_name TEXT;
    v_user_email TEXT;
    v_store_id_text TEXT;
BEGIN
    -- 0. Safely convert store_id to TEXT (handles both UUID and TEXT columns)
    v_store_id_text := NEW.store_id::TEXT;

    -- Skip if store_id is empty (legacy/incomplete data)
    IF v_store_id_text IS NULL OR v_store_id_text = '' THEN
        RETURN NEW;
    END IF;

    -- 1. Dev/Admin Bypass — these emails are never limited
    BEGIN
        v_user_email := auth.jwt()->>'email';
    EXCEPTION WHEN OTHERS THEN
        v_user_email := NULL;
    END;
    
    IF v_user_email IS NOT NULL AND v_user_email IN (
        'dev@tradixa.com', 
        'ferdiarmond@gmail.com', 
        'admin@tradixa.com', 
        'tradixasystems@gmail.com'
    ) THEN
        RETURN NEW;
    END IF;

    -- 2. Determine entity name based on table name
    v_entity_name := TG_TABLE_NAME;
    
    -- Special handling for stock_movements (in vs out)
    IF v_entity_name = 'stock_movements' THEN
        IF NEW.movement_type = 'in' THEN
            v_entity_name := 'stock_movements_in';
        ELSE
            v_entity_name := 'stock_movements_out';
        END IF;
    END IF;

    -- 3. Get limit for this entity + plan combination
    v_limit := get_store_limit(v_store_id_text, v_entity_name);

    -- If unlimited (-1), allow immediately
    IF v_limit = -1 THEN
        RETURN NEW;
    END IF;

    -- If locked (0), block immediately
    IF v_limit = 0 THEN
        RAISE EXCEPTION 'Fitur ini tidak tersedia untuk paket langganan Anda. Silakan upgrade paket.';
    END IF;

    -- 4. Count current usage
    IF TG_TABLE_NAME = 'sales_transactions' THEN
        -- Sales: count this month only
        SELECT COUNT(*) INTO v_current_count 
        FROM sales_transactions 
        WHERE store_id = NEW.store_id 
          AND date_trunc('month', created_at) = date_trunc('month', NOW());
    ELSIF TG_TABLE_NAME = 'stock_movements' THEN
        -- Stock movements: count by movement_type
        SELECT COUNT(*) INTO v_current_count
        FROM stock_movements
        WHERE store_id = NEW.store_id
          AND movement_type = NEW.movement_type;
    ELSE
        -- All other tables: total count
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE store_id = $1', TG_TABLE_NAME)
        INTO v_current_count
        USING NEW.store_id;
    END IF;

    -- 5. Enforce limit
    IF v_current_count >= v_limit THEN
        RAISE EXCEPTION 'Batas maksimal % data telah tercapai untuk paket Anda. Silakan upgrade.', v_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- Attach BEFORE INSERT triggers to all quota-limited tables
-- ============================================================
DO $$
DECLARE
    t TEXT;
    tables_to_limit TEXT[] := ARRAY[
        'products', 'customers', 'suppliers', 'payables', 'receivables',
        'bank_transactions', 'expenses', 'employees', 'stock_movements',
        'bank_statement_history', 'sales_transactions', 'outbound_deliveries',
        'purchase_requisitions', 'purchase_orders', 'goods_receipts',
        'inventory_grns', 'supplier_returns'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_limit LOOP
        -- Drop existing trigger if any (idempotent)
        EXECUTE format('DROP TRIGGER IF EXISTS trg_check_limit_%I ON %I', t, t);
        
        -- Create BEFORE INSERT trigger
        EXECUTE format(
            'CREATE TRIGGER trg_check_limit_%I 
             BEFORE INSERT ON %I 
             FOR EACH ROW 
             EXECUTE FUNCTION check_entity_limit()', 
            t, t
        );
    END LOOP;
END $$;
