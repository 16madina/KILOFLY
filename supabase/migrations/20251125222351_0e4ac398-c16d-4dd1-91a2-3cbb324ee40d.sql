-- Add user_type field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_type TEXT DEFAULT 'traveler' CHECK (user_type IN ('traveler', 'shipper'));