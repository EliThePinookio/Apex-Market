-- Harden BEANNEL against the live schema (skip tables that were never created).

CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT business_id::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_store_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager', 'cashier')
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_privs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id cannot change.';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role cannot be changed from the app.';
  END IF;
  IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    RAISE EXCEPTION 'Workspace cannot be reassigned from the app.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privs ON public.profiles;
CREATE TRIGGER trg_protect_profile_privs
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privs();

DROP POLICY IF EXISTS "Users can access their business products" ON public.products;
DROP POLICY IF EXISTS "Public read shop listings" ON public.products;
DROP POLICY IF EXISTS "Staff manage products" ON public.products;

CREATE POLICY "Public read shop listings"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (id LIKE 'list-%' OR id LIKE 'info-%');

CREATE POLICY "Staff manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    public.is_store_staff()
    AND (
      business_id::text = public.get_user_business_id()
      OR id LIKE 'list-%'
      OR id LIKE 'info-%'
    )
  )
  WITH CHECK (
    public.is_store_staff()
    AND (
      business_id::text = public.get_user_business_id()
      OR ((id LIKE 'list-%' OR id LIKE 'info-%') AND business_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can access their business transactions" ON public.transactions;
DROP POLICY IF EXISTS "Staff manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Customers read own shop orders" ON public.transactions;

CREATE POLICY "Staff manage transactions"
  ON public.transactions FOR ALL
  TO authenticated
  USING (
    public.is_store_staff()
    AND (business_id::text = public.get_user_business_id() OR id LIKE 'shop-%')
  )
  WITH CHECK (
    public.is_store_staff()
    AND (business_id::text = public.get_user_business_id() OR (id LIKE 'shop-%' AND business_id IS NULL))
  );

CREATE POLICY "Customers read own shop orders"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (id LIKE 'shop-%' AND customer_id = auth.uid()::text);

DO $lock$
DECLARE
  tbl text;
  old_pol text;
  new_pol text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories',
    'suppliers',
    'customers',
    'sales',
    'purchases',
    'expenses',
    'owner_capital',
    'stock_movements',
    'audit_logs'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;
    old_pol := 'Users can access their business ' || replace(tbl, '_', ' ');
    new_pol := 'Staff manage ' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_pol, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', new_pol, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (business_id::text = public.get_user_business_id()) WITH CHECK (business_id::text = public.get_user_business_id())',
      new_pol,
      tbl
    );
  END LOOP;

  IF to_regclass('public.sale_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can access sale items for their business" ON public.sale_items';
    EXECUTE $p$
      CREATE POLICY "Users can access sale items for their business"
        ON public.sale_items FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_items.sale_id
              AND s.business_id::text = public.get_user_business_id()
          )
        )
    $p$;
  END IF;

  IF to_regclass('public.purchase_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can access purchase items for their business" ON public.purchase_items';
    EXECUTE $p$
      CREATE POLICY "Users can access purchase items for their business"
        ON public.purchase_items FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.purchases p
            WHERE p.id = purchase_items.purchase_id
              AND p.business_id::text = public.get_user_business_id()
          )
        )
    $p$;
  END IF;
END
$lock$;

CREATE OR REPLACE FUNCTION public.place_shop_order(
  p_name text,
  p_phone text,
  p_address text,
  p_payment text,
  p_business_id text,
  p_items jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  listing_id text;
  qty int;
  rec record;
  line jsonb;
  lines jsonb := '[]'::jsonb;
  total numeric := 0;
  order_id text;
  phone_digits text;
  item_count int;
  clean_name text;
  clean_addr text;
  envelope text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to check out.';
  END IF;

  clean_name := left(trim(both from regexp_replace(coalesce(p_name, ''), '[|<>]', ' ', 'g')), 80);
  IF length(clean_name) < 2 THEN
    RAISE EXCEPTION 'Please leave your name.';
  END IF;

  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(phone_digits) < 9 OR length(phone_digits) > 15 THEN
    RAISE EXCEPTION 'Please leave a working phone number.';
  END IF;

  clean_addr := left(trim(both from regexp_replace(coalesce(p_address, ''), '[|<>]', ' ', 'g')), 200);

  IF p_payment NOT IN ('mobile_money', 'cash', 'other') THEN
    RAISE EXCEPTION 'Choose a payment method.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Your bag is empty.';
  END IF;
  item_count := jsonb_array_length(p_items);
  IF item_count < 1 OR item_count > 30 THEN
    RAISE EXCEPTION 'Your bag is too large.';
  END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    listing_id := line->>'listingId';
    qty := coalesce(nullif(line->>'qty', '')::int, 0);
    IF listing_id IS NULL OR listing_id NOT LIKE 'list-%' THEN
      RAISE EXCEPTION 'A piece is no longer on the floor.';
    END IF;
    IF qty < 1 OR qty > 20 THEN
      RAISE EXCEPTION 'Quantity is not allowed.';
    END IF;

    SELECT id, name, sell_price, stock_quantity
      INTO rec
      FROM public.products
     WHERE id = listing_id
     FOR UPDATE;

    IF NOT FOUND OR rec.sell_price <= 0 THEN
      RAISE EXCEPTION 'A piece is no longer on the floor.';
    END IF;
    IF rec.stock_quantity < qty THEN
      RAISE EXCEPTION '% only has % left.', rec.name, rec.stock_quantity;
    END IF;

    UPDATE public.products
       SET stock_quantity = stock_quantity - qty,
           updated_at = now()
     WHERE id = listing_id;

    total := total + rec.sell_price * qty;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'productId', rec.id,
      'productName', rec.name,
      'quantity', qty,
      'unitBuyPrice', 0,
      'unitSellPrice', rec.sell_price,
      'totalSellPrice', rec.sell_price * qty,
      'totalBuyPrice', 0
    ));
  END LOOP;

  order_id := 'shop-' || replace(gen_random_uuid()::text, '-', '');
  envelope := concat_ws(
    '|',
    'SHOP',
    left(regexp_replace(coalesce(p_business_id, ''), '[|]', '', 'g'), 64),
    clean_name,
    phone_digits,
    p_payment,
    clean_addr,
    'uid:' || uid::text,
    'st:placed',
    '',
    'at:' || now()::text
  );

  INSERT INTO public.transactions (
    id, business_id, type, amount, cogs, gross_profit, net_profit,
    date, description, payment_method, customer_name, customer_id,
    reference_no, items, created_at
  ) VALUES (
    order_id,
    NULL,
    'sale',
    total,
    0, 0, 0,
    now(),
    envelope,
    p_payment,
    clean_name,
    uid::text,
    'SHOP-' || uid::text,
    lines,
    now()
  );

  RETURN order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_shop_order(text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_shop_order(text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO anon, authenticated;
