-- Shop orders store the shopper auth id, which is not a row in public.customers.
-- Drop the FK so checkout can insert, and let shoppers read their own tickets
-- via customer_id or the uid stamped in the envelope.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transaction_customer_id_fkey;
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

DROP POLICY IF EXISTS "Customers read own shop orders" ON public.transactions;
CREATE POLICY "Customers read own shop orders"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    id LIKE 'shop-%'
    AND (
      customer_id = auth.uid()::text
      OR description LIKE ('%uid:' || auth.uid()::text || '%')
    )
  );
