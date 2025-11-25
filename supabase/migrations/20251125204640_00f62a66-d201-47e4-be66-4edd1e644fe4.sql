-- Update RLS policy to allow sellers to mark reservations as in_progress or delivered
DROP POLICY IF EXISTS "Sellers can update reservation status" ON public.reservations;

CREATE POLICY "Sellers can update reservation status"
ON public.reservations
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (
  auth.uid() = seller_id AND
  (
    -- Can approve or reject from pending
    (status IN ('approved', 'rejected') AND (SELECT status FROM public.reservations WHERE id = reservations.id) = 'pending') OR
    -- Can mark as in_progress from approved
    (status = 'in_progress' AND (SELECT status FROM public.reservations WHERE id = reservations.id) = 'approved') OR
    -- Can mark as delivered from in_progress
    (status = 'delivered' AND (SELECT status FROM public.reservations WHERE id = reservations.id) = 'in_progress')
  )
);