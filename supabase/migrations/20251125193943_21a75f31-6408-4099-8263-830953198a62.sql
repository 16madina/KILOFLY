-- Create privacy settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'verified_only', 'private')),
  listing_visibility TEXT NOT NULL DEFAULT 'public' CHECK (listing_visibility IN ('public', 'verified_only', 'private')),
  allow_data_sharing BOOLEAN NOT NULL DEFAULT false,
  cookie_essential BOOLEAN NOT NULL DEFAULT true,
  cookie_analytics BOOLEAN NOT NULL DEFAULT false,
  cookie_marketing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own privacy settings
CREATE POLICY "Users can view their own privacy settings"
ON public.privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert their own privacy settings"
ON public.privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update their own privacy settings"
ON public.privacy_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();