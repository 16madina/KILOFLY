-- Add allowed_items and prohibited_items columns to listings table
ALTER TABLE public.listings
ADD COLUMN allowed_items TEXT[] DEFAULT '{}',
ADD COLUMN prohibited_items TEXT[] DEFAULT '{}';