-- Add reservation_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN reservation_id uuid REFERENCES public.reservations(id);

-- Create index for faster lookups
CREATE INDEX idx_transactions_reservation_id ON public.transactions(reservation_id);