-- Create listings table
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  departure_date DATE NOT NULL,
  arrival_date DATE NOT NULL,
  available_kg NUMERIC NOT NULL CHECK (available_kg > 0),
  price_per_kg NUMERIC NOT NULL CHECK (price_per_kg > 0),
  destination_image TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active listings"
ON public.listings
FOR SELECT
USING (status = 'active');

CREATE POLICY "Verified users can create listings"
ON public.listings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND id_verified = true
  )
);

CREATE POLICY "Users can update their own listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
ON public.listings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_departure ON public.listings(departure);
CREATE INDEX idx_listings_arrival ON public.listings(arrival);
CREATE INDEX idx_listings_status ON public.listings(status);