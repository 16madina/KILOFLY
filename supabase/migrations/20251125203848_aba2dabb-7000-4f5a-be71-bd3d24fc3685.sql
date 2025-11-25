-- Create reservations table for luggage booking requests
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_kg NUMERIC NOT NULL CHECK (requested_kg > 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  item_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own reservations
CREATE POLICY "Buyers can view their own reservations"
ON public.reservations
FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view reservations for their listings
CREATE POLICY "Sellers can view reservations for their listings"
ON public.reservations
FOR SELECT
USING (auth.uid() = seller_id);

-- Buyers can create reservations
CREATE POLICY "Buyers can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update reservation status
CREATE POLICY "Sellers can update reservation status"
ON public.reservations
FOR UPDATE
USING (auth.uid() = seller_id);

-- Buyers can cancel their own reservations
CREATE POLICY "Buyers can cancel their own reservations"
ON public.reservations
FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify seller of new reservation
CREATE OR REPLACE FUNCTION public.notify_seller_new_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer_name TEXT;
  listing_route TEXT;
BEGIN
  -- Get buyer name
  SELECT full_name INTO buyer_name
  FROM profiles
  WHERE id = NEW.buyer_id;
  
  -- Get listing route
  SELECT departure || ' → ' || arrival INTO listing_route
  FROM listings
  WHERE id = NEW.listing_id;
  
  -- Send notification to seller
  PERFORM send_notification(
    NEW.seller_id,
    'Nouvelle demande de réservation',
    buyer_name || ' souhaite réserver ' || NEW.requested_kg || ' kg sur votre trajet ' || listing_route,
    'reservation'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new reservations
CREATE TRIGGER notify_seller_on_new_reservation
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_new_reservation();

-- Create function to notify buyer of reservation status change
CREATE OR REPLACE FUNCTION public.notify_buyer_reservation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_name TEXT;
  listing_route TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get seller name
  SELECT full_name INTO seller_name
  FROM profiles
  WHERE id = NEW.seller_id;
  
  -- Get listing route
  SELECT departure || ' → ' || arrival INTO listing_route
  FROM listings
  WHERE id = NEW.listing_id;
  
  -- Set notification based on status
  IF NEW.status = 'approved' THEN
    notification_title := 'Réservation approuvée';
    notification_message := seller_name || ' a approuvé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Réservation refusée';
    notification_message := seller_name || ' a refusé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Send notification to buyer
  PERFORM send_notification(
    NEW.buyer_id,
    notification_title,
    notification_message,
    'reservation'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for reservation status updates
CREATE TRIGGER notify_buyer_on_status_change
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_reservation_status();

-- Enable realtime for reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;