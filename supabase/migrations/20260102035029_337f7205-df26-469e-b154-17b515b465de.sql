-- Drop the security definer view and replace with a regular view
DROP VIEW IF EXISTS public.listings_with_available_kg;

-- Create a simple view without SECURITY DEFINER (views are SECURITY INVOKER by default)
CREATE VIEW public.listings_with_available_kg 
WITH (security_invoker = true) AS
SELECT 
  l.*,
  public.get_available_kg(l.id) as real_available_kg
FROM listings l;