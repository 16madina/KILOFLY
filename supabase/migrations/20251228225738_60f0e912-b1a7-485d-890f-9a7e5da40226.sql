-- Create transport_requests table for "Je recherche" feature
CREATE TABLE public.transport_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  departure_date_start DATE NOT NULL,
  departure_date_end DATE,
  requested_kg NUMERIC NOT NULL CHECK (requested_kg > 0),
  description TEXT,
  budget_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active transport requests"
ON public.transport_requests
FOR SELECT
USING (status = 'active');

CREATE POLICY "Authenticated users can create transport requests"
ON public.transport_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transport requests"
ON public.transport_requests
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transport requests"
ON public.transport_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Create transport_offers table for "Je peux transporter" responses
CREATE TABLE public.transport_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  traveler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  message TEXT,
  proposed_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, traveler_id)
);

-- Enable RLS
ALTER TABLE public.transport_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transport_offers
CREATE POLICY "Request owners can view offers on their requests"
ON public.transport_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transport_requests tr
    WHERE tr.id = transport_offers.request_id
    AND tr.user_id = auth.uid()
  )
  OR traveler_id = auth.uid()
);

CREATE POLICY "Authenticated users can create offers"
ON public.transport_offers
FOR INSERT
WITH CHECK (auth.uid() = traveler_id);

CREATE POLICY "Travelers can update their own offers"
ON public.transport_offers
FOR UPDATE
USING (auth.uid() = traveler_id);

CREATE POLICY "Request owners can update offer status"
ON public.transport_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.transport_requests tr
    WHERE tr.id = transport_offers.request_id
    AND tr.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_transport_requests_updated_at
BEFORE UPDATE ON public.transport_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify request owner when offer is made
CREATE OR REPLACE FUNCTION public.notify_request_owner_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  traveler_name TEXT;
  request_route TEXT;
BEGIN
  SELECT full_name INTO traveler_name
  FROM profiles WHERE id = NEW.traveler_id;
  
  SELECT departure || ' → ' || arrival INTO request_route
  FROM transport_requests WHERE id = NEW.request_id;
  
  PERFORM send_notification(
    (SELECT user_id FROM transport_requests WHERE id = NEW.request_id),
    '🚀 Nouvelle proposition de transport',
    traveler_name || ' peut transporter votre colis sur le trajet ' || request_route,
    'success'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transport_offer_created
AFTER INSERT ON public.transport_offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_request_owner_new_offer();