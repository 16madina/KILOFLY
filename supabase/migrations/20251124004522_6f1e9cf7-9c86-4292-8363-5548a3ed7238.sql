-- Add new fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN country TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN id_document_url TEXT,
  ADD COLUMN id_verified BOOLEAN DEFAULT false,
  ADD COLUMN id_submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN terms_accepted BOOLEAN DEFAULT false,
  ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Make full_name and phone required
ALTER TABLE public.profiles 
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN avatar_url SET NOT NULL,
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN terms_accepted SET NOT NULL;

-- Create storage buckets for avatars and ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('id-documents', 'id-documents', false);

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for ID documents bucket
CREATE POLICY "Users can view their own ID documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own ID documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'id-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own ID documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'id-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policy to view all ID documents
CREATE POLICY "Admins can view all ID documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-documents' AND
    public.has_role(auth.uid(), 'admin')
  );

-- Update the handle_new_user function to create default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    avatar_url, 
    phone, 
    country, 
    city, 
    terms_accepted,
    terms_accepted_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'country', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
    CASE 
      WHEN COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false) 
      THEN now() 
      ELSE NULL 
    END
  );
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;