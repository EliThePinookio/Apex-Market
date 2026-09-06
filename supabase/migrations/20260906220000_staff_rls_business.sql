-- Staff tables: FOR ALL requires store staff AND matching business_id.
-- Same gate as products/transactions. Skip tables that do not exist.

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

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    old_pol := 'Users can access their business ' || replace(tbl, '_', ' ');
    new_pol := 'Staff manage ' || tbl;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_pol, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', new_pol, tbl);

    EXECUTE format(
      $p$
      CREATE POLICY %I ON public.%I
        FOR ALL
        TO authenticated
        USING (
          public.is_store_staff()
          AND business_id::text = public.get_user_business_id()
        )
        WITH CHECK (
          public.is_store_staff()
          AND business_id::text = public.get_user_business_id()
        )
      $p$,
      new_pol,
      tbl
    );
  END LOOP;

  IF to_regclass('public.sale_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can access sale items for their business" ON public.sale_items';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage sale_items" ON public.sale_items';
    EXECUTE $p$
      CREATE POLICY "Staff manage sale_items"
        ON public.sale_items FOR ALL
        TO authenticated
        USING (
          public.is_store_staff()
          AND EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_items.sale_id
              AND s.business_id::text = public.get_user_business_id()
          )
        )
        WITH CHECK (
          public.is_store_staff()
          AND EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_items.sale_id
              AND s.business_id::text = public.get_user_business_id()
          )
        )
    $p$;
  END IF;

  IF to_regclass('public.purchase_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can access purchase items for their business" ON public.purchase_items';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage purchase_items" ON public.purchase_items';
    EXECUTE $p$
      CREATE POLICY "Staff manage purchase_items"
        ON public.purchase_items FOR ALL
        TO authenticated
        USING (
          public.is_store_staff()
          AND EXISTS (
            SELECT 1 FROM public.purchases p
            WHERE p.id = purchase_items.purchase_id
              AND p.business_id::text = public.get_user_business_id()
          )
        )
        WITH CHECK (
          public.is_store_staff()
          AND EXISTS (
            SELECT 1 FROM public.purchases p
            WHERE p.id = purchase_items.purchase_id
              AND p.business_id::text = public.get_user_business_id()
          )
        )
    $p$;
  END IF;
END
$lock$;
