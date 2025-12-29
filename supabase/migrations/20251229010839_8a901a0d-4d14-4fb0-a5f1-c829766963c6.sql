-- Create function to notify travelers when a new transport request matches their listings
CREATE OR REPLACE FUNCTION public.notify_travelers_matching_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  listing_record RECORD;
BEGIN
  -- Only process for new active transport requests
  IF NEW.status = 'active' THEN
    -- Find all active listings that match the transport request route
    FOR listing_record IN
      SELECT l.id, l.user_id, p.full_name as requester_name
      FROM listings l
      JOIN profiles p ON p.id = NEW.user_id
      WHERE l.status = 'active'
        AND l.departure = NEW.departure
        AND l.arrival = NEW.arrival
        AND l.user_id != NEW.user_id
        -- Check if listing dates overlap with request dates
        AND l.departure_date >= NEW.departure_date_start
        AND (NEW.departure_date_end IS NULL OR l.departure_date <= NEW.departure_date_end)
    LOOP
      -- Send notification to each traveler with matching listing
      PERFORM send_notification(
        listing_record.user_id,
        '📦 Nouvelle demande de transport',
        listing_record.requester_name || ' recherche ' || NEW.requested_kg || ' kg sur votre trajet ' || NEW.departure || ' → ' || NEW.arrival,
        'info'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to notify travelers on new transport requests
DROP TRIGGER IF EXISTS notify_travelers_on_new_request ON transport_requests;
CREATE TRIGGER notify_travelers_on_new_request
  AFTER INSERT ON transport_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_travelers_matching_request();