-- Add policy for users to view their own transport requests (any status)
CREATE POLICY "Users can view their own transport requests" 
ON public.transport_requests 
FOR SELECT 
USING (auth.uid() = user_id);