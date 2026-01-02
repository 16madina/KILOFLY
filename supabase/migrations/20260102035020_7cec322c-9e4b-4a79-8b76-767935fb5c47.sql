-- Create a function to calculate real available kg for a listing
-- This subtracts all approved/paid reservations from the original available_kg
CREATE OR REPLACE FUNCTION public.get_available_kg(listing_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  original_kg NUMERIC;
  reserved_kg NUMERIC;
BEGIN
  -- Get original available kg from listing
  SELECT available_kg INTO original_kg
  FROM listings
  WHERE id = listing_id_param;
  
  IF original_kg IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total reserved kg from approved/in_progress/delivered reservations
  -- Exclude: pending, rejected, cancelled
  SELECT COALESCE(SUM(requested_kg), 0) INTO reserved_kg
  FROM reservations
  WHERE listing_id = listing_id_param
    AND status IN ('approved', 'in_progress', 'delivered', 'picked_up');
  
  -- Return available kg (never negative)
  RETURN GREATEST(0, original_kg - reserved_kg);
END;
$$;

-- Create a view for listings with real-time available kg
CREATE OR REPLACE VIEW public.listings_with_available_kg AS
SELECT 
  l.*,
  public.get_available_kg(l.id) as real_available_kg
FROM listings l;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_available_kg(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_kg(UUID) TO anon;