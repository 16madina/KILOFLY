-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites
CREATE POLICY "Users can view their own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create route_alerts table
CREATE TABLE public.route_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_alerts
CREATE POLICY "Users can view their own route alerts"
  ON public.route_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create route alerts"
  ON public.route_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own route alerts"
  ON public.route_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own route alerts"
  ON public.route_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for route_alerts updated_at
CREATE TRIGGER update_route_alerts_updated_at
  BEFORE UPDATE ON public.route_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check for new listings matching route alerts and send notifications
CREATE OR REPLACE FUNCTION public.notify_route_alert_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- Send notification to each user with matching alert
      PERFORM send_notification(
        alert_record.user_id,
        'Nouvelle annonce disponible',
        'Une nouvelle annonce correspond à votre alerte: ' || NEW.departure || ' → ' || NEW.arrival || ' par ' || alert_record.full_name,
        'route_alert'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to notify users when new listings match their route alerts
CREATE TRIGGER notify_on_new_listing
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_route_alert_matches();