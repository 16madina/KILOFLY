-- Create wallets table for seller balances
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table for tracking all wallet movements
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  provider TEXT CHECK (provider IN ('stripe', 'cinetpay', 'wave', 'orange_money', 'platform')),
  payout_method TEXT CHECK (payout_method IN ('wave', 'orange_money')),
  phone_number TEXT,
  reference TEXT,
  external_id TEXT,
  reservation_id UUID REFERENCES public.reservations(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create wallets"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their wallet transactions"
ON public.wallet_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM wallets w WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()
));

CREATE POLICY "Users can create withdrawal requests"
ON public.wallet_transactions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM wallets w WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()
) AND type = 'debit');

CREATE POLICY "Service role can manage all transactions"
ON public.wallet_transactions FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all wallets"
ON public.wallets FOR ALL
USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_reservation_id ON public.wallet_transactions(reservation_id);

-- Trigger to update updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create wallet for users
CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, currency)
  VALUES (NEW.id, COALESCE(NEW.preferred_currency, 'XOF'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create wallet when profile is created
CREATE TRIGGER create_wallet_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_user_wallet();

-- Function to credit seller wallet when delivery is confirmed
CREATE OR REPLACE FUNCTION public.credit_seller_wallet_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id UUID;
  v_seller_amount NUMERIC;
  v_transaction RECORD;
BEGIN
  -- Only process when status changes to 'delivered'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- Get the transaction for this reservation
    SELECT * INTO v_transaction
    FROM transactions
    WHERE reservation_id = NEW.id
    AND payment_status = 'captured'
    LIMIT 1;
    
    IF v_transaction.id IS NOT NULL THEN
      -- Get or create wallet for seller
      SELECT id INTO v_wallet_id
      FROM wallets
      WHERE user_id = NEW.seller_id;
      
      IF v_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, currency)
        VALUES (NEW.seller_id, 'XOF')
        RETURNING id INTO v_wallet_id;
      END IF;
      
      -- Credit the wallet
      UPDATE wallets
      SET balance = balance + v_transaction.seller_amount,
          updated_at = now()
      WHERE id = v_wallet_id;
      
      -- Record the credit transaction
      INSERT INTO wallet_transactions (
        wallet_id, type, amount, status, provider, 
        reservation_id, description
      ) VALUES (
        v_wallet_id, 'credit', v_transaction.seller_amount, 'completed', 'platform',
        NEW.id, 'Paiement pour livraison confirmée'
      );
      
      -- Notify the seller
      PERFORM send_notification(
        NEW.seller_id,
        '💰 Paiement reçu !',
        v_transaction.seller_amount || ' XOF ont été ajoutés à votre portefeuille',
        'success'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for crediting wallet on delivery
CREATE TRIGGER credit_wallet_on_delivery
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.credit_seller_wallet_on_delivery();

-- Enable realtime for wallet updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;