-- Add currency columns to listings and profiles tables
ALTER TABLE listings 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'XOF'));

ALTER TABLE profiles 
ADD COLUMN preferred_currency TEXT NOT NULL DEFAULT 'EUR' CHECK (preferred_currency IN ('EUR', 'USD', 'XOF'));

-- Add comment to explain currency codes
COMMENT ON COLUMN listings.currency IS 'Currency code: EUR (Euro), USD (US Dollar), XOF (West African CFA Franc)';
COMMENT ON COLUMN profiles.preferred_currency IS 'User preferred display currency: EUR, USD, or XOF';

-- Create a table to cache exchange rates (updated daily)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read exchange rates
CREATE POLICY "Anyone can view exchange rates"
ON exchange_rates
FOR SELECT
USING (true);

-- Only admins can update exchange rates (via edge function)
CREATE POLICY "Service role can manage exchange rates"
ON exchange_rates
FOR ALL
USING (auth.role() = 'service_role');

-- Insert initial exchange rates (approximate values, will be updated by API)
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
('EUR', 'USD', 1.08),
('EUR', 'XOF', 656),
('USD', 'EUR', 0.93),
('USD', 'XOF', 607),
('XOF', 'EUR', 0.0015),
('XOF', 'USD', 0.0016),
('EUR', 'EUR', 1),
('USD', 'USD', 1),
('XOF', 'XOF', 1)
ON CONFLICT (base_currency, target_currency) DO NOTHING;