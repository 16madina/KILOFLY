-- Create tracking_events table for detailed package tracking
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  created_by UUID REFERENCES public.profiles(id),
  is_automatic BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_tracking_events_reservation ON public.tracking_events(reservation_id);
CREATE INDEX idx_tracking_events_status ON public.tracking_events(status);
CREATE INDEX idx_tracking_events_created_at ON public.tracking_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Buyers and sellers can view tracking events for their reservations
CREATE POLICY "Users can view tracking for their reservations"
ON public.tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = tracking_events.reservation_id
    AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
  )
);

-- Sellers can create tracking events for their reservations
CREATE POLICY "Sellers can create tracking events"
ON public.tracking_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = tracking_events.reservation_id
    AND r.seller_id = auth.uid()
  )
  OR is_automatic = true
);

-- Enable realtime for tracking_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;

-- Create function to auto-create tracking event on reservation status change
CREATE OR REPLACE FUNCTION public.auto_create_tracking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.tracking_events (
      reservation_id,
      status,
      description,
      is_automatic,
      created_by
    ) VALUES (
      NEW.id,
      NEW.status,
      CASE NEW.status
        WHEN 'pending' THEN 'Demande de réservation créée'
        WHEN 'approved' THEN 'Réservation approuvée par le voyageur'
        WHEN 'rejected' THEN 'Réservation refusée'
        WHEN 'cancelled' THEN 'Réservation annulée'
        WHEN 'in_progress' THEN 'Colis en cours de transport'
        WHEN 'delivered' THEN 'Colis livré avec succès'
        ELSE 'Statut mis à jour: ' || NEW.status
      END,
      true,
      COALESCE(NEW.seller_id, NEW.buyer_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto tracking
CREATE TRIGGER on_reservation_status_change
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_tracking_event();

-- Also create initial tracking event on new reservation
CREATE OR REPLACE FUNCTION public.create_initial_tracking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tracking_events (
    reservation_id,
    status,
    description,
    is_automatic,
    created_by
  ) VALUES (
    NEW.id,
    'pending',
    'Demande de réservation créée',
    true,
    NEW.buyer_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reservation_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_tracking_event();