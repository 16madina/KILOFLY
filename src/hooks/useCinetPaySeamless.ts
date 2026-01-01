import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CinetPayConfig {
  apiKey: string;
  siteId: string;
  notifyUrl: string;
  mode: 'PRODUCTION' | 'TEST';
}

interface PaymentOptions {
  reservationId: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export const useCinetPaySeamless = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [config, setConfig] = useState<CinetPayConfig | null>(null);

  // Fetch CinetPay config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-cinetpay-config');
        if (error) throw error;
        
        setConfig({
          apiKey: data.apiKey,
          siteId: data.siteId,
          notifyUrl: data.notifyUrl,
          mode: data.mode || 'PRODUCTION'
        });
        setIsReady(true);
      } catch (err) {
        console.error('Failed to fetch CinetPay config:', err);
        // Fallback - SDK might still work if configured elsewhere
        setIsReady(true);
      }
    };

    fetchConfig();
  }, []);

  const openPaymentModal = useCallback(async (options: PaymentOptions) => {
    if (!window.CinetPay) {
      toast.error('SDK CinetPay non chargé. Veuillez rafraîchir la page.');
      options.onError('SDK not loaded');
      return;
    }

    setIsLoading(true);

    try {
      // Generate unique transaction ID
      const transactionId = `KFLY-${options.reservationId.slice(0, 8)}-${Date.now()}`;
      
      // Calculate amount with 5% buyer fee
      const buyerFee = Math.round(options.amount * 0.05);
      const totalAmount = options.amount + buyerFee;

      // CinetPay only supports XOF on this account, so we must use XOF
      // Amount must be a multiple of 5 for XOF
      const xofAmount = Math.ceil(totalAmount / 5) * 5;

      // Configure CinetPay SDK
      if (config) {
        window.CinetPay.setConfig({
          apikey: config.apiKey,
          site_id: config.siteId,
          notify_url: config.notifyUrl,
          mode: config.mode
        });
      }

      // Create transaction record in database first
      const { data: reservation } = await supabase
        .from('reservations')
        .select('listing_id, buyer_id, seller_id')
        .eq('id', options.reservationId)
        .single();

      if (reservation) {
        const sellerAmount = options.amount - Math.round(options.amount * 0.05);
        const platformCommission = buyerFee + Math.round(options.amount * 0.05);

        await supabase.from('transactions').insert({
          reservation_id: options.reservationId,
          listing_id: reservation.listing_id,
          buyer_id: reservation.buyer_id,
          seller_id: reservation.seller_id,
          amount: totalAmount,
          platform_commission: platformCommission,
          seller_amount: sellerAmount,
          status: 'pending',
          payment_status: 'pending',
          stripe_payment_intent_id: transactionId
        });
      }

      // Open CinetPay Seamless modal
      window.CinetPay.getCheckout({
        transaction_id: transactionId,
        amount: xofAmount,
        currency: 'XOF', // Force XOF as per account limitation
        channels: 'ALL',
        description: options.description,
        customer_name: options.customerName.split(' ')[0] || options.customerName,
        customer_surname: options.customerName.split(' ').slice(1).join(' ') || '',
        customer_email: options.customerEmail,
        customer_phone_number: options.customerPhone.replace(/[\s+\-()]/g, ''),
        lock_amount: true,
        lock_currency: true
      });

      // Handle response
      window.CinetPay.waitResponse((data) => {
        setIsLoading(false);
        
        if (data.status === 'ACCEPTED') {
          toast.success('Paiement réussi !');
          options.onSuccess(transactionId);
        } else if (data.status === 'REFUSED') {
          toast.error(data.message || 'Paiement refusé');
          options.onError(data.message || 'Payment refused');
        } else {
          // PENDING - wait for webhook
          toast.info('Paiement en attente de confirmation...');
        }
      });

      // Handle modal close
      window.CinetPay.onClose(() => {
        setIsLoading(false);
        options.onClose();
      });

    } catch (error: any) {
      setIsLoading(false);
      console.error('CinetPay error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
      options.onError(error.message || 'Unknown error');
    }
  }, [config]);

  return {
    openPaymentModal,
    isLoading,
    isReady
  };
};
