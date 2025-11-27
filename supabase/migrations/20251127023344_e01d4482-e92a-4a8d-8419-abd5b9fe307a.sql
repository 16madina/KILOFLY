-- Fix notification types in reservation triggers
-- The notifications table only accepts: 'info', 'success', 'warning', 'error'

-- Drop existing functions
DROP FUNCTION IF EXISTS public.notify_seller_new_reservation() CASCADE;
DROP FUNCTION IF EXISTS public.notify_buyer_reservation_status() CASCADE;

-- Recreate function to notify seller of new reservation with correct type
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
  
  -- Send notification to seller with 'info' type
  PERFORM send_notification(
    NEW.seller_id,
    'Nouvelle demande de réservation',
    buyer_name || ' souhaite réserver ' || NEW.requested_kg || ' kg sur votre trajet ' || listing_route,
    'info'
  );
  
  RETURN NEW;
END;
$$;

-- Recreate function to notify buyer of reservation status change with correct types
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
  notification_type TEXT;
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
    notification_type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Réservation refusée';
    notification_message := seller_name || ' a refusé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route;
    notification_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Send notification to buyer
  PERFORM send_notification(
    NEW.buyer_id,
    notification_title,
    notification_message,
    notification_type
  );
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER notify_seller_on_new_reservation
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_new_reservation();

CREATE TRIGGER notify_buyer_on_status_change
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_reservation_status();