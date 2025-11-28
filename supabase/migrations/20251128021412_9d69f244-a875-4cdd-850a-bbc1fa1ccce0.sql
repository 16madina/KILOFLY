-- Add Stripe-related fields to transactions table if they don't exist
DO $$ 
BEGIN
  -- Add stripe_payment_intent_id if it doesn't exist (already exists based on types)
  -- Add stripe_transfer_id for tracking transfers to sellers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'stripe_transfer_id') THEN
    ALTER TABLE transactions ADD COLUMN stripe_transfer_id TEXT;
  END IF;
  
  -- Add payment_status to track payment lifecycle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'payment_status') THEN
    ALTER TABLE transactions ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add index for faster payment intent lookups
CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent ON transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);