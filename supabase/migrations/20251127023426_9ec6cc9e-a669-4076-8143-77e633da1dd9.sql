-- Fix remaining notification types in other triggers
-- The notifications table only accepts: 'info', 'success', 'warning', 'error'

-- Fix notify_route_alert_matches function
DROP FUNCTION IF EXISTS public.notify_route_alert_matches() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_route_alert_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_record RECORD;
BEGIN
  -- Only process for new active listings
  IF NEW.status = 'active' THEN
    -- Find all active route alerts matching this listing
    FOR alert_record IN
      SELECT ra.user_id, ra.departure, ra.arrival, p.full_name
      FROM route_alerts ra
      JOIN profiles p ON p.id = NEW.user_id
      WHERE ra.active = true
        AND ra.departure = NEW.departure
        AND ra.arrival = NEW.arrival
        AND ra.user_id != NEW.user_id
    LOOP
      -- Send notification to each user with matching alert (using 'info' type)
      PERFORM send_notification(
        alert_record.user_id,
        'Nouvelle annonce disponible',
        'Une nouvelle annonce correspond à votre alerte: ' || NEW.departure || ' → ' || NEW.arrival || ' par ' || alert_record.full_name,
        'info'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER notify_route_alert_on_new_listing
AFTER INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_route_alert_matches();

-- Fix notify_reservation_message function
DROP FUNCTION IF EXISTS public.notify_reservation_message() CASCADE;

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
  
  -- Send notification to recipient (using 'info' type)
  PERFORM send_notification(
    recipient_id,
    'Nouveau message 💬',
    sender_name || ' vous a envoyé un message concernant la réservation de ' || reservation_info,
    'info'
  );
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER notify_on_reservation_message
AFTER INSERT ON public.reservation_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_reservation_message();

-- Fix notify_buyer_reservation_status function for all status changes
DROP FUNCTION IF EXISTS public.notify_buyer_reservation_status() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_buyer_reservation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_name TEXT;
  buyer_name TEXT;
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
  
  -- Get buyer name
  SELECT full_name INTO buyer_name
  FROM profiles
  WHERE id = NEW.buyer_id;
  
  -- Get listing route
  SELECT departure || ' → ' || arrival INTO listing_route
  FROM listings
  WHERE id = NEW.listing_id;
  
  -- Set notification based on status for buyer
  IF NEW.status = 'approved' THEN
    notification_title := 'Réservation approuvée ✓';
    notification_message := seller_name || ' a approuvé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route || '. Le voyage peut commencer !';
    notification_type := 'success';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      notification_type
    );
    
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Réservation refusée';
    notification_message := seller_name || ' a refusé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route || '.';
    notification_type := 'warning';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      notification_type
    );
    
  ELSIF NEW.status = 'in_progress' THEN
    notification_title := 'Colis en transit 📦';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg est maintenant en transit avec ' || seller_name || ' sur le trajet ' || listing_route || '.';
    notification_type := 'info';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      notification_type
    );
    
    -- Also notify seller
    PERFORM send_notification(
      NEW.seller_id,
      'Transport en cours 🚀',
      'Le transport du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) est maintenant marqué comme en cours.',
      'info'
    );
    
  ELSIF NEW.status = 'delivered' THEN
    notification_title := 'Colis livré ! 🎉';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg a été livré avec succès par ' || seller_name || '. Merci d''avoir utilisé KiloFly !';
    notification_type := 'success';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      notification_type
    );
    
    -- Also notify seller
    PERFORM send_notification(
      NEW.seller_id,
      'Livraison confirmée ✓',
      'La livraison du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) a été confirmée. Transaction terminée !',
      'success'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER notify_buyer_on_status_change
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_reservation_status();