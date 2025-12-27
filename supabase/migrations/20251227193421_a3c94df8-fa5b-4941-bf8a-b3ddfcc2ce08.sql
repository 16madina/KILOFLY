-- Add delivery_option column to listings table
ALTER TABLE public.listings 
ADD COLUMN delivery_option text NOT NULL DEFAULT 'pickup';

-- Add comment for documentation
COMMENT ON COLUMN public.listings.delivery_option IS 'Options: pickup, delivery_free, delivery_paid, handover, airport';