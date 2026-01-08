-- Update the preferred_currency constraint to allow all display currencies
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_currency_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_currency_check 
  CHECK (preferred_currency IN ('EUR', 'USD', 'XOF', 'CAD', 'GBP', 'GNF', 'MAD', 'NGN', 'XAF', 'CDF', 'DZD', 'CHF'));