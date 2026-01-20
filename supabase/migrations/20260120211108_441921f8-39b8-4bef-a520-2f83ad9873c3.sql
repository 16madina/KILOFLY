-- Fix the credit_seller_wallet_on_delivery function to check for 'paid' or 'captured' status
CREATE OR REPLACE FUNCTION public.credit_seller_wallet_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id UUID;
  v_seller_amount NUMERIC;
  v_transaction RECORD;
  v_already_credited BOOLEAN;
BEGIN
  -- Only process when status changes to 'delivered'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- Get the transaction for this reservation (check for 'paid', 'captured', or 'completed')
    SELECT * INTO v_transaction
    FROM transactions
    WHERE reservation_id = NEW.id
    AND (payment_status IN ('paid', 'captured', 'completed') OR status = 'completed')
    LIMIT 1;
    
    IF v_transaction.id IS NOT NULL THEN
      -- Check if already credited to avoid duplicates
      SELECT EXISTS(
        SELECT 1 FROM wallet_transactions 
        WHERE reservation_id = NEW.id 
        AND type = 'credit' 
        AND status = 'completed'
      ) INTO v_already_credited;
      
      IF NOT v_already_credited THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;