-- =============================================================================
-- APEX OS — additive, reversible schema extensions
-- Does NOT drop tables, rewrite rows, or reset production data.
-- Safe to apply on the existing Apex-Market / Beannel production schema.
-- Reverse: drop the new table + columns listed in the footer.
-- =============================================================================

-- Display lock flag (PIN itself remains client-only; never store PIN hashes here)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_pin_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS brand_slug TEXT NOT NULL DEFAULT 'apex';

-- Discount captured on the unified ledger row (mirrors sales.discount)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

-- Optional cache of advisor answers grounded in a trusted snapshot
CREATE TABLE IF NOT EXISTS public.advisor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'general',
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    trusted_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_sessions_business
  ON public.advisor_sessions (business_id, created_at DESC);

ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their business advisor sessions" ON public.advisor_sessions;
CREATE POLICY "Users can access their business advisor sessions"
    ON public.advisor_sessions FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Reverse:
--   DROP TABLE IF EXISTS public.advisor_sessions;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS discount_amount;
--   ALTER TABLE public.businesses DROP COLUMN IF EXISTS brand_slug;
--   ALTER TABLE public.businesses DROP COLUMN IF EXISTS is_pin_locked;
