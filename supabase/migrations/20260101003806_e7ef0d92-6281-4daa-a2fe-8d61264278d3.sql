-- Create unique partial index to prevent duplicate signatures for the same reservation/user/type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_signatures_unique_per_reservation
ON public.legal_signatures (reservation_id, user_id, signature_type)
WHERE reservation_id IS NOT NULL;