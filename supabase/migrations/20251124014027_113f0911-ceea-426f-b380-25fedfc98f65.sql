-- Add INSERT policy to user_roles table to allow default role creation
CREATE POLICY "Users can create their own user role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'user'::app_role
);