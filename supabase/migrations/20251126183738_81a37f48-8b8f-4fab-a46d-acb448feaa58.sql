-- Table pour stocker le feedback admin sur les décisions IA
CREATE TABLE IF NOT EXISTS public.ai_verification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  ai_decision TEXT NOT NULL, -- 'ai_approved' or 'ai_flagged'
  ai_confidence DECIMAL NOT NULL,
  ai_notes TEXT,
  admin_decision TEXT NOT NULL, -- 'manual_approved' or 'manual_rejected'
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes analytics
CREATE INDEX idx_ai_feedback_ai_decision ON public.ai_verification_feedback(ai_decision);
CREATE INDEX idx_ai_feedback_admin_decision ON public.ai_verification_feedback(admin_decision);
CREATE INDEX idx_ai_feedback_created_at ON public.ai_verification_feedback(created_at);

-- RLS policies
ALTER TABLE public.ai_verification_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all feedback"
  ON public.ai_verification_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert feedback"
  ON public.ai_verification_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );