-- Add fields to track AI verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create index for filtering by verification method
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON public.profiles(verification_method);

COMMENT ON COLUMN public.profiles.verification_method IS 'Verification status: pending, ai_approved, ai_flagged, manual_approved, manual_rejected';
COMMENT ON COLUMN public.profiles.ai_confidence_score IS 'AI confidence score from 0.00 to 1.00';
COMMENT ON COLUMN public.profiles.verification_notes IS 'Notes from AI or admin about the verification';