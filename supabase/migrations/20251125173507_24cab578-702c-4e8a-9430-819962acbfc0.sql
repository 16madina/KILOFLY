-- Create transactions table to track all payments
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  platform_commission NUMERIC NOT NULL CHECK (platform_commission >= 0),
  seller_amount NUMERIC NOT NULL CHECK (seller_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions (as buyer or seller)
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create transactions as buyer
CREATE POLICY "Users can create transactions as buyer"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Admins can update transaction status
CREATE POLICY "Admins can update transactions"
ON public.transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX idx_transactions_listing ON public.transactions(listing_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);