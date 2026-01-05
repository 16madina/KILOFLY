-- Function to upsert push tokens (works around type generation delay)
CREATE OR REPLACE FUNCTION public.upsert_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_platform TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_tokens (user_id, token, platform)
  VALUES (p_user_id, p_token, p_platform)
  ON CONFLICT (user_id, token) 
  DO UPDATE SET platform = EXCLUDED.platform, updated_at = now();
END;
$$;