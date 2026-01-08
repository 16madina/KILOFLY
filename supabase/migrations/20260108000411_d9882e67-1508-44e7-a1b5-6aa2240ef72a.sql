-- Add reference columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transport_request_id UUID REFERENCES public.transport_requests(id) ON DELETE SET NULL;

-- Update send_notification function to accept optional reference IDs
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_reservation_id UUID DEFAULT NULL,
  p_transport_request_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, conversation_id, reservation_id, transport_request_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_conversation_id, p_reservation_id, p_transport_request_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Update trigger to pass reference IDs to the edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB;
BEGIN
  -- Build data payload with all available reference IDs
  v_data := jsonb_build_object(
    'type', NEW.type,
    'notification_id', NEW.id::text
  );
  
  IF NEW.conversation_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('conversation_id', NEW.conversation_id::text);
  END IF;
  
  IF NEW.reservation_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('reservation_id', NEW.reservation_id::text);
  END IF;
  
  IF NEW.transport_request_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('transport_request_id', NEW.transport_request_id::text);
  END IF;

  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'data', v_data
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Update notification triggers to pass reference IDs

-- Update message notification for conversations
CREATE OR REPLACE FUNCTION public.notify_conversation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (the other party in the conversation)
  SELECT CASE
    WHEN buyer_id = NEW.sender_id THEN seller_id
    ELSE buyer_id
  END INTO recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Send notification to recipient with conversation_id
  PERFORM send_notification(
    recipient_id,
    'Nouveau message 💬',
    sender_name || ' vous a envoyé un message',
    'info',
    NEW.conversation_id,  -- conversation_id
    NULL,                 -- reservation_id
    NULL                  -- transport_request_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update reservation message notification
CREATE OR REPLACE FUNCTION public.notify_reservation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  reservation_info TEXT;
  v_reservation_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Get reservation details
  SELECT 
    r.id,
    r.requested_kg || ' kg ' || l.departure || ' → ' || l.arrival,
    CASE
      WHEN r.buyer_id = NEW.sender_id THEN r.seller_id
      ELSE r.buyer_id
    END
  INTO v_reservation_id, reservation_info, recipient_id
  FROM reservations r
  JOIN listings l ON r.listing_id = l.id
  WHERE r.id = NEW.reservation_id;
  
  -- Send notification to recipient with reservation_id
  PERFORM send_notification(
    recipient_id,
    'Nouveau message 💬',
    sender_name || ' vous a envoyé un message concernant la réservation de ' || reservation_info,
    'message',
    NULL,              -- conversation_id
    v_reservation_id,  -- reservation_id
    NULL               -- transport_request_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update new reservation notification
CREATE OR REPLACE FUNCTION public.notify_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Send notification to seller with reservation_id
  PERFORM send_notification(
    NEW.seller_id,
    'Nouvelle demande de réservation',
    buyer_name || ' souhaite réserver ' || NEW.requested_kg || ' kg sur votre trajet ' || listing_route,
    'reservation',
    NULL,      -- conversation_id
    NEW.id,    -- reservation_id
    NULL       -- transport_request_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update reservation status notification
CREATE OR REPLACE FUNCTION public.notify_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_name TEXT;
  buyer_name TEXT;
  listing_route TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only run on status changes
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
  
  IF NEW.status = 'approved' THEN
    notification_title := 'Réservation approuvée ✓';
    notification_message := seller_name || ' a approuvé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route || '. Le voyage peut commencer !';
    
    PERFORM send_notification(NEW.buyer_id, notification_title, notification_message, 'reservation', NULL, NEW.id, NULL);
    
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Réservation refusée';
    notification_message := seller_name || ' a refusé votre réservation de ' || NEW.requested_kg || ' kg sur le trajet ' || listing_route || '.';
    
    PERFORM send_notification(NEW.buyer_id, notification_title, notification_message, 'reservation', NULL, NEW.id, NULL);
    
  ELSIF NEW.status = 'in_progress' THEN
    notification_title := 'Colis en transit 📦';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg est maintenant en transit avec ' || seller_name || ' sur le trajet ' || listing_route || '.';
    
    PERFORM send_notification(NEW.buyer_id, notification_title, notification_message, 'reservation', NULL, NEW.id, NULL);
    PERFORM send_notification(NEW.seller_id, 'Transport en cours 🚀', 'Le transport du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) est maintenant marqué comme en cours.', 'reservation', NULL, NEW.id, NULL);
    
  ELSIF NEW.status = 'delivered' THEN
    notification_title := 'Colis livré ! 🎉';
    notification_message := 'Votre colis de ' || NEW.requested_kg || ' kg a été livré avec succès par ' || seller_name || '. Merci d''avoir utilisé KiloFly !';
    
    PERFORM send_notification(NEW.buyer_id, notification_title, notification_message, 'reservation', NULL, NEW.id, NULL);
    PERFORM send_notification(NEW.seller_id, 'Livraison confirmée ✓', 'La livraison du colis de ' || buyer_name || ' (' || NEW.requested_kg || ' kg) a été confirmée. Transaction terminée !', 'reservation', NULL, NEW.id, NULL);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update transport offer notification
CREATE OR REPLACE FUNCTION public.notify_new_transport_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  traveler_name TEXT;
  request_route TEXT;
  request_owner_id UUID;
BEGIN
  -- Get traveler name
  SELECT full_name INTO traveler_name
  FROM profiles
  WHERE id = NEW.traveler_id;
  
  -- Get request info
  SELECT departure || ' → ' || arrival, user_id 
  INTO request_route, request_owner_id
  FROM transport_requests 
  WHERE id = NEW.request_id;
  
  -- Send notification with transport_request_id
  PERFORM send_notification(
    request_owner_id,
    '🚀 Nouvelle proposition de transport',
    traveler_name || ' peut transporter votre colis sur le trajet ' || request_route,
    'success',
    NULL,           -- conversation_id
    NULL,           -- reservation_id
    NEW.request_id  -- transport_request_id
  );
  
  RETURN NEW;
END;
$function$;