-- Update reservations table to add new statuses
ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'in_progress', 'delivered'));

-- Update notification function for all status changes
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
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      'reservation'
    );
    
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Réservation refusée';
    notification_message := seller_name || ' a refusé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route || '.';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      'reservation'
    );
    
  ELSIF NEW.status = 'in_progress' THEN
    notification_title := 'Colis en transit 📦';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg est maintenant en transit avec ' || seller_name || ' sur le trajet ' || listing_route || '.';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      'reservation'
    );
    
    -- Also notify seller
    PERFORM send_notification(
      NEW.seller_id,
      'Transport en cours 🚀',
      'Le transport du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) est maintenant marqué comme en cours.',
      'reservation'
    );
    
  ELSIF NEW.status = 'delivered' THEN
    notification_title := 'Colis livré ! 🎉';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg a été livré avec succès par ' || seller_name || '. Merci d''avoir utilisé KiloFly !';
    
    -- Send notification to buyer
    PERFORM send_notification(
      NEW.buyer_id,
      notification_title,
      notification_message,
      'reservation'
    );
    
    -- Also notify seller
    PERFORM send_notification(
      NEW.seller_id,
      'Livraison confirmée ✓',
      'La livraison du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) a été confirmée. Transaction terminée !',
      'reservation'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;