-- Add reservation_id column to transport_offers to link accepted offers to reservations
ALTER TABLE public.transport_offers 
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transport_offers_reservation_id ON public.transport_offers(reservation_id);

-- Add transport_offer_id to reservations to enable reverse lookup
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS transport_offer_id UUID REFERENCES public.transport_offers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reservations_transport_offer_id ON public.reservations(transport_offer_id);

-- Create function to automatically create a reservation when an offer is accepted
CREATE OR REPLACE FUNCTION public.create_reservation_from_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_listing RECORD;
  v_reservation_id UUID;
  v_total_price NUMERIC;
  v_traveler_name TEXT;
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Get the transport request details
    SELECT * INTO v_request
    FROM transport_requests
    WHERE id = NEW.request_id;
    
    -- Get traveler name
    SELECT full_name INTO v_traveler_name
    FROM profiles WHERE id = NEW.traveler_id;
    
    -- Check if there's a linked listing
    IF NEW.listing_id IS NOT NULL THEN
      -- Get listing details
      SELECT * INTO v_listing
      FROM listings
      WHERE id = NEW.listing_id AND status = 'active';
      
      IF v_listing.id IS NOT NULL THEN
        -- Calculate total price
        v_total_price := COALESCE(NEW.proposed_price, v_listing.price_per_kg * v_request.requested_kg);
        
        -- Create the reservation
        INSERT INTO reservations (
          listing_id,
          buyer_id,
          seller_id,
          requested_kg,
          total_price,
          item_description,
          status,
          transport_offer_id
        ) VALUES (
          v_listing.id,
          v_request.user_id, -- The requester becomes the buyer
          NEW.traveler_id,   -- The traveler becomes the seller
          v_request.requested_kg,
          v_total_price,
          COALESCE(v_request.description, 'Colis suite à demande de transport'),
          'approved', -- Pre-approved since the offer was accepted
          NEW.id
        )
        RETURNING id INTO v_reservation_id;
        
        -- Link the offer to the reservation
        UPDATE transport_offers 
        SET reservation_id = v_reservation_id
        WHERE id = NEW.id;
        
        -- Send notification to traveler about reservation creation
        PERFORM send_notification(
          NEW.traveler_id,
          '✅ Réservation créée',
          'Votre offre a été acceptée ! Une réservation de ' || v_request.requested_kg || ' kg a été créée. L''expéditeur doit maintenant procéder au paiement.',
          'success'
        );
        
        -- Send notification to requester about next steps
        PERFORM send_notification(
          v_request.user_id,
          '🎉 Offre acceptée',
          'Vous avez accepté l''offre de ' || v_traveler_name || '. Procédez au paiement pour confirmer votre réservation.',
          'info'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic reservation creation
DROP TRIGGER IF EXISTS on_transport_offer_accepted ON public.transport_offers;
CREATE TRIGGER on_transport_offer_accepted
AFTER UPDATE ON public.transport_offers
FOR EACH ROW
EXECUTE FUNCTION public.create_reservation_from_offer();