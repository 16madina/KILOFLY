
-- Add foreign key constraint on listings.user_id to profiles.id
-- First, ensure no orphan listings exist (they don't based on our query)
-- Then add the constraint with ON DELETE CASCADE to automatically clean up

-- Note: listings already has a FK to profiles (listings_user_id_fkey)
-- Let's verify and recreate it with proper settings if needed

-- Drop existing constraint if it exists and recreate with CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'listings_user_id_fkey' 
    AND table_name = 'listings'
  ) THEN
    ALTER TABLE public.listings DROP CONSTRAINT listings_user_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint with CASCADE
ALTER TABLE public.listings 
ADD CONSTRAINT listings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also ensure reservations reference valid listings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservations_listing_id_fkey' 
    AND table_name = 'reservations'
  ) THEN
    ALTER TABLE public.reservations DROP CONSTRAINT reservations_listing_id_fkey;
  END IF;
END $$;

ALTER TABLE public.reservations 
ADD CONSTRAINT reservations_listing_id_fkey 
FOREIGN KEY (listing_id) REFERENCES public.listings(id) 
ON DELETE CASCADE;

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT listings_user_id_fkey ON public.listings IS 
  'Ensures every listing has a valid profile. Deleting a profile will delete all their listings.';

COMMENT ON CONSTRAINT reservations_listing_id_fkey ON public.reservations IS 
  'Ensures every reservation has a valid listing. Deleting a listing will delete all its reservations.';
