-- Fix: Replace SECURITY DEFINER view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate view with SECURITY INVOKER (default, safer)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  city,
  country,
  completed_trips,
  response_rate,
  avg_response_time,
  id_verified,
  phone_verified,
  created_at,
  user_type
FROM public.profiles;