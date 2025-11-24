-- Allow admins to update profiles for identity verification
CREATE POLICY "Admins can update all profiles for verification"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));