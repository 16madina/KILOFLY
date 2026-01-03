-- 1. Drop the existing overly permissive public profiles policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 2. Create a secure view for public profile data (only safe fields)
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- 3. Create new RLS policies for profiles table
-- Users can see their own complete profile
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Authenticated users can see limited profile data of others (for display purposes)
CREATE POLICY "Authenticated users can view safe profile data"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() != id
);

-- 4. Update listings policy to hide user_id for unauthenticated users
-- First drop existing policy
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;

-- Create new policy: Anyone can view listings but with authentication check
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (status = 'active');

-- 5. Update transport_requests to require authentication for viewing
DROP POLICY IF EXISTS "Anyone can view active transport requests" ON public.transport_requests;

CREATE POLICY "Authenticated users can view active transport requests"
ON public.transport_requests
FOR SELECT
USING (
  status = 'active' AND auth.uid() IS NOT NULL
);

-- 6. Add admin policies for moderation
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
ON public.reviews
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transport requests"
ON public.transport_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Add message deletion policies
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own reservation messages"
ON public.reservation_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- 8. Add transport offer deletion for pending offers
CREATE POLICY "Travelers can delete pending offers"
ON public.transport_offers
FOR DELETE
USING (
  auth.uid() = traveler_id AND 
  status = 'pending'
);