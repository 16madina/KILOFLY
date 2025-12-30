-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Sellers can update reservation status" ON public.reservations;

-- Create a corrected policy without the buggy subquery
CREATE POLICY "Sellers can update reservation status" 
ON public.reservations 
FOR UPDATE 
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);