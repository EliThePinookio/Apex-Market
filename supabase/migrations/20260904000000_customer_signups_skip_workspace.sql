-- Shopper sign-ups must not mint a store workspace.
-- Office access is reserved for the registered owner email / existing business.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_biz_id UUID;
  user_full_name TEXT;
  user_biz_name TEXT;
  account_kind TEXT;
BEGIN
  account_kind := COALESCE(new.raw_user_meta_data->>'account_kind', 'customer');
  IF account_kind = 'customer' THEN
    RETURN new;
  END IF;

  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Store Owner');
  user_biz_name := COALESCE(new.raw_user_meta_data->>'business_name', 'BEANNEL');

  INSERT INTO public.businesses (name, owner_name, owner_id)
  VALUES (user_biz_name, user_full_name, new.id)
  RETURNING id INTO new_biz_id;

  INSERT INTO public.profiles (id, email, full_name, business_id, role)
  VALUES (new.id, new.email, user_full_name, new_biz_id, 'owner')
  ON CONFLICT (id) DO UPDATE
  SET business_id = EXCLUDED.business_id,
      full_name = EXCLUDED.full_name;

  INSERT INTO public.categories (id, business_id, name, color)
  VALUES ('cat-general-' || new_biz_id, new_biz_id, 'General', '#10b981')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
