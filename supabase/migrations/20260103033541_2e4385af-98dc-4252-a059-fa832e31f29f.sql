
-- Allow anyone (including unauthenticated users) to view basic public profile data
CREATE POLICY "Anyone can view basic profile data"
ON public.profiles
FOR SELECT
USING (true);
