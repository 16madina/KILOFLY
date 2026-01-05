-- Create a function to archive expired listings (departure_date + 3 days passed)
CREATE OR REPLACE FUNCTION public.archive_expired_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update status to 'archived' for listings where departure_date is more than 3 days ago
  UPDATE public.listings
  SET status = 'archived', updated_at = now()
  WHERE status = 'active'
    AND departure_date < (CURRENT_DATE - INTERVAL '3 days');
END;
$$;

-- Create a cron job to run daily at midnight (requires pg_cron extension)
-- Note: This will only work if pg_cron is enabled on the database
-- The function can also be called manually or via an edge function

-- Create an index for faster queries on status and departure_date
CREATE INDEX IF NOT EXISTS idx_listings_status_departure 
ON public.listings(status, departure_date)
WHERE status = 'active';