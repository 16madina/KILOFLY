-- Add archived_at column to reservations table for archiving messages
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS archived_by_buyer_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_by_seller_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for archived queries
CREATE INDEX IF NOT EXISTS idx_reservations_archived ON public.reservations (archived_by_buyer_at, archived_by_seller_at);