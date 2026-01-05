-- Add delivery_method column to reservations table
ALTER TABLE public.reservations 
ADD COLUMN delivery_method text DEFAULT 'handover';

-- Add check constraint to ensure valid values
ALTER TABLE public.reservations 
ADD CONSTRAINT reservations_delivery_method_check 
CHECK (delivery_method IN ('handover', 'shipping'));