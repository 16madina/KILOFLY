-- Create reservation messages table for chat
CREATE TABLE public.reservation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservation_messages ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can view messages for their reservations
CREATE POLICY "Users can view messages for their reservations"
ON public.reservation_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reservations
    WHERE reservations.id = reservation_messages.reservation_id
    AND (reservations.buyer_id = auth.uid() OR reservations.seller_id = auth.uid())
  )
);

-- Buyers and sellers can send messages for their reservations
CREATE POLICY "Users can send messages for their reservations"
ON public.reservation_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.reservations
    WHERE reservations.id = reservation_messages.reservation_id
    AND (reservations.buyer_id = auth.uid() OR reservations.seller_id = auth.uid())
  )
);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON public.reservation_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.reservations
    WHERE reservations.id = reservation_messages.reservation_id
    AND (reservations.buyer_id = auth.uid() OR reservations.seller_id = auth.uid())
  )
);

-- Create function to notify on new message
CREATE OR REPLACE FUNCTION public.notify_reservation_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  reservation_info TEXT;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (the other party in the reservation)
  SELECT CASE
    WHEN buyer_id = NEW.sender_id THEN seller_id
    ELSE buyer_id
  END INTO recipient_id
  FROM reservations
  WHERE id = NEW.reservation_id;
  
  -- Get reservation info
  SELECT requested_kg || ' kg' INTO reservation_info
  FROM reservations
  WHERE id = NEW.reservation_id;
  
  -- Send notification to recipient
  PERFORM send_notification(
    recipient_id,
    'Nouveau message 💬',
    sender_name || ' vous a envoyé un message concernant la réservation de ' || reservation_info,
    'message'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new messages
CREATE TRIGGER notify_on_reservation_message
AFTER INSERT ON public.reservation_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_reservation_message();

-- Enable realtime for reservation messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_messages;