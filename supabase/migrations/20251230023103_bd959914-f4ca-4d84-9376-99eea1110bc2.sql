-- Create table for storing electronic signatures
CREATE TABLE public.legal_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('sender', 'transporter')),
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  conditions_accepted JSONB NOT NULL DEFAULT '{}',
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signatures
CREATE POLICY "Users can view their own signatures"
ON public.legal_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own signatures
CREATE POLICY "Users can create their own signatures"
ON public.legal_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all signatures
CREATE POLICY "Admins can view all signatures"
ON public.legal_signatures
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_legal_signatures_user_id ON public.legal_signatures(user_id);
CREATE INDEX idx_legal_signatures_reservation_id ON public.legal_signatures(reservation_id);