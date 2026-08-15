-- ==============================================================================
-- BEANNEL BUSINESS ERP - AUTHORITATIVE SUPABASE POSTGRESQL RELATIONAL SCHEMA
-- Production Migration: Tables, Indexes, Constraints, RLS, Realtime & Auth Triggers
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BUSINESSES TABLE (Multi-Tenant Accounts)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'BEANNEL',
    owner_name TEXT NOT NULL DEFAULT 'Store Owner',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    tax_rate NUMERIC NOT NULL DEFAULT 0,
    low_stock_alert_enabled BOOLEAN NOT NULL DEFAULT true,
    allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
    receipt_header_msg TEXT DEFAULT 'Thank you for shopping with us!',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFILES / USERS TABLE (Roles & Permissions)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE (Purchasing & Supply Chain)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRODUCTS TABLE (Inventory Catalogue)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    buy_price NUMERIC NOT NULL DEFAULT 0 CHECK (buy_price >= 0),
    sell_price NUMERIC NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_threshold INTEGER NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'pcs',
    barcode TEXT DEFAULT '',
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CUSTOMERS TABLE (CRM & Debt Ledger)
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
    order_count INTEGER NOT NULL DEFAULT 0,
    debt_balance NUMERIC NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'VIP')),
    last_visit TEXT DEFAULT 'Just now',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SALES TABLE (Parent Sale Records)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reference_no TEXT DEFAULT '',
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
    cogs NUMERIC NOT NULL DEFAULT 0 CHECK (cogs >= 0),
    gross_profit NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial', 'refunded')),
    customer_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SALE ITEMS TABLE (Child Line Items with Cost & Selling Prices)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    line_total NUMERIC NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    line_cogs NUMERIC NOT NULL DEFAULT 0 CHECK (line_cogs >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PURCHASES TABLE (Stock Refills & Supplier Orders)
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reference_no TEXT DEFAULT '',
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax NUMERIC NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial')),
    payment_method TEXT DEFAULT 'cash',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PURCHASE ITEMS TABLE (Child Items for Stock Purchases)
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id TEXT NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_cost NUMERIC NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    line_total NUMERIC NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. EXPENSES TABLE (Operating Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'General Expense',
    amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
    description TEXT NOT NULL DEFAULT '',
    payment_method TEXT DEFAULT 'cash',
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_no TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. OWNER CAPITAL TABLE (Capital Contributions vs Drawings)
CREATE TABLE IF NOT EXISTS public.owner_capital (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'contribution' CHECK (type IN ('contribution', 'drawing')),
    amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
    description TEXT NOT NULL DEFAULT 'Capital Injection',
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method TEXT DEFAULT 'transfer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TRANSACTIONS TABLE (Unified Financial Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sale', 'expense', 'capital', 'stock_refill', 'adjustment', 'owner_draw')),
    amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
    cogs NUMERIC DEFAULT 0,
    gross_profit NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT '',
    payment_method TEXT DEFAULT 'cash',
    reference_no TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    customer_id TEXT DEFAULT '',
    related_sale_id TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
    related_purchase_id TEXT REFERENCES public.purchases(id) ON DELETE SET NULL,
    related_expense_id TEXT REFERENCES public.expenses(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. STOCK MOVEMENTS TABLE (Audit Trail of Stock Quantity Adjustments)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'damage', 'sale', 'purchase', 'return')),
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0,
    reference_id TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_business ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_updated ON public.products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_updated ON public.customers(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON public.purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_capital_business ON public.owner_capital(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON public.stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON public.audit_logs(business_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to safely get current authenticated user's business ID
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Businesses Policies
DROP POLICY IF EXISTS "Users can access their business" ON public.businesses;
CREATE POLICY "Users can access their business"
    ON public.businesses FOR ALL
    USING (id = public.get_user_business_id() OR owner_id = auth.uid())
    WITH CHECK (id = public.get_user_business_id() OR owner_id = auth.uid());

-- Categories Policies
DROP POLICY IF EXISTS "Users can access their business categories" ON public.categories;
CREATE POLICY "Users can access their business categories"
    ON public.categories FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Suppliers Policies
DROP POLICY IF EXISTS "Users can access their business suppliers" ON public.suppliers;
CREATE POLICY "Users can access their business suppliers"
    ON public.suppliers FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Products Policies
DROP POLICY IF EXISTS "Users can access their business products" ON public.products;
CREATE POLICY "Users can access their business products"
    ON public.products FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Customers Policies
DROP POLICY IF EXISTS "Users can access their business customers" ON public.customers;
CREATE POLICY "Users can access their business customers"
    ON public.customers FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Sales Policies
DROP POLICY IF EXISTS "Users can access their business sales" ON public.sales;
CREATE POLICY "Users can access their business sales"
    ON public.sales FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Sale Items Policies
DROP POLICY IF EXISTS "Users can access sale items for their business" ON public.sale_items;
CREATE POLICY "Users can access sale items for their business"
    ON public.sale_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = sale_items.sale_id
        AND (s.business_id = public.get_user_business_id() OR s.business_id IS NULL)
      )
    );

-- Purchases Policies
DROP POLICY IF EXISTS "Users can access their business purchases" ON public.purchases;
CREATE POLICY "Users can access their business purchases"
    ON public.purchases FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Purchase Items Policies
DROP POLICY IF EXISTS "Users can access purchase items for their business" ON public.purchase_items;
CREATE POLICY "Users can access purchase items for their business"
    ON public.purchase_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.id = purchase_items.purchase_id
        AND (p.business_id = public.get_user_business_id() OR p.business_id IS NULL)
      )
    );

-- Expenses Policies
DROP POLICY IF EXISTS "Users can access their business expenses" ON public.expenses;
CREATE POLICY "Users can access their business expenses"
    ON public.expenses FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Owner Capital Policies
DROP POLICY IF EXISTS "Users can access their business owner capital" ON public.owner_capital;
CREATE POLICY "Users can access their business owner capital"
    ON public.owner_capital FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can access their business transactions" ON public.transactions;
CREATE POLICY "Users can access their business transactions"
    ON public.transactions FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Stock Movements Policies
DROP POLICY IF EXISTS "Users can access their business stock movements" ON public.stock_movements;
CREATE POLICY "Users can access their business stock movements"
    ON public.stock_movements FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Users can access their business audit logs" ON public.audit_logs;
CREATE POLICY "Users can access their business audit logs"
    ON public.audit_logs FOR ALL
    USING (business_id = public.get_user_business_id() OR business_id IS NULL)
    WITH CHECK (business_id = public.get_user_business_id() OR business_id IS NULL);

-- ==============================================================================
-- AUTOMATIC USER REGISTRATION TRIGGER (auth.users -> profiles + businesses)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_biz_id UUID;
  user_full_name TEXT;
  user_biz_name TEXT;
BEGIN
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Store Owner');
  user_biz_name := COALESCE(new.raw_user_meta_data->>'business_name', 'BEANNEL');

  -- Create a new business for this owner
  INSERT INTO public.businesses (name, owner_name, owner_id)
  VALUES (user_biz_name, user_full_name, new.id)
  RETURNING id INTO new_biz_id;

  -- Create user profile
  INSERT INTO public.profiles (id, email, full_name, business_id, role)
  VALUES (new.id, new.email, user_full_name, new_biz_id, 'owner')
  ON CONFLICT (id) DO UPDATE
  SET business_id = EXCLUDED.business_id,
      full_name = EXCLUDED.full_name;

  -- Seed initial default category 'General'
  INSERT INTO public.categories (id, business_id, name, color)
  VALUES ('cat-general', new_biz_id, 'General', '#10b981')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- REALTIME PUBLICATION CONFIGURATION
-- ==============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
