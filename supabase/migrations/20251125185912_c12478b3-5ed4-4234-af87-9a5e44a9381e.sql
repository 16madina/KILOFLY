-- Create banned_users table to track banned users
CREATE TABLE public.banned_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unbanned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view banned users
CREATE POLICY "Admins can view banned users"
ON public.banned_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can ban users
CREATE POLICY "Admins can ban users"
ON public.banned_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = banned_by);

-- Only admins can unban users (update)
CREATE POLICY "Admins can unban users"
ON public.banned_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_banned_users_user_id ON public.banned_users(user_id);
CREATE INDEX idx_banned_users_is_active ON public.banned_users(is_active);
CREATE INDEX idx_banned_users_banned_at ON public.banned_users(banned_at DESC);