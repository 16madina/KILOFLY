-- Create function to notify buyer on tracking updates
CREATE OR REPLACE FUNCTION public.notify_buyer_tracking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_id_val UUID;
  seller_name TEXT;
  listing_route TEXT;
  status_label TEXT;
  notification_icon TEXT;
BEGIN
  -- Get buyer_id from reservation
  SELECT r.buyer_id INTO buyer_id_val
  FROM reservations r
  WHERE r.id = NEW.reservation_id;
  
  -- Get seller name and route info
  SELECT p.full_name, l.departure || ' → ' || l.arrival
  INTO seller_name, listing_route
  FROM reservations r
  JOIN profiles p ON p.id = r.seller_id
  JOIN listings l ON l.id = r.listing_id
  WHERE r.id = NEW.reservation_id;
  
  -- Map status to French label and icon
  CASE NEW.status
    WHEN 'pending' THEN 
      status_label := 'En attente de confirmation';
      notification_icon := 'info';
    WHEN 'approved' THEN 
      status_label := 'Réservation confirmée';
      notification_icon := 'success';
    WHEN 'rejected' THEN 
      status_label := 'Réservation refusée';
      notification_icon := 'warning';
    WHEN 'picked_up' THEN 
      status_label := 'Colis récupéré';
      notification_icon := 'info';
    WHEN 'at_departure' THEN 
      status_label := 'À l''aéroport de départ';
      notification_icon := 'info';
    WHEN 'in_flight' THEN 
      status_label := 'En vol';
      notification_icon := 'info';
    WHEN 'landed' THEN 
      status_label := 'Arrivé à destination';
      notification_icon := 'info';
    WHEN 'customs' THEN 
      status_label := 'En douane';
      notification_icon := 'info';
    WHEN 'out_for_delivery' THEN 
      status_label := 'En cours de livraison';
      notification_icon := 'info';
    WHEN 'delivered' THEN 
      status_label := 'Livré !';
      notification_icon := 'success';
    WHEN 'in_progress' THEN 
      status_label := 'En transit';
      notification_icon := 'info';
    ELSE 
      status_label := NEW.status;
      notification_icon := 'info';
  END CASE;
  
  -- Send notification to buyer
  PERFORM send_notification(
    buyer_id_val,
    '📦 ' || status_label,
    COALESCE(NEW.description, 'Votre colis sur le trajet ' || listing_route || ' a été mis à jour par ' || seller_name),
    notification_icon
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for tracking updates
DROP TRIGGER IF EXISTS on_tracking_event_created ON public.tracking_events;
CREATE TRIGGER on_tracking_event_created
  AFTER INSERT ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_buyer_tracking_update();