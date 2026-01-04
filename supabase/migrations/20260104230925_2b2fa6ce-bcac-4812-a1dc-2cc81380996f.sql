-- Add pickup info columns to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS pickup_notes TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.reservations.pickup_address IS 'Adresse ou point de récupération du colis';
COMMENT ON COLUMN public.reservations.pickup_notes IS 'Instructions supplémentaires pour la récupération';
COMMENT ON COLUMN public.reservations.recipient_phone IS 'Téléphone du destinataire pour contact';