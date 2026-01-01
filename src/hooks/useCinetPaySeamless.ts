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
    console.log('[CinetPay] Starting payment modal...', { 
      hasSDK: !!window.CinetPay, 
      hasConfig: !!config 
    });

    if (!window.CinetPay) {
      toast.error('SDK CinetPay non chargé. Veuillez rafraîchir la page.');
      options.onError('SDK not loaded');
      return;
    }

    if (!config) {
      toast.error('Configuration CinetPay non disponible.');
      options.onError('Config not loaded');
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
      // Amount must be a multiple of 5 for XOF and minimum 100 XOF
      const xofAmount = Math.max(100, Math.ceil(totalAmount / 5) * 5);

      console.log('[CinetPay] Payment config:', {
        transactionId,
        originalAmount: options.amount,
        xofAmount,
        apiKey: config.apiKey?.substring(0, 8) + '...',
        siteId: config.siteId
      });

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
        console.log('[CinetPay] Transaction record created');
      }

      // Step 1: Set config FIRST
      console.log('[CinetPay] Setting config...');
      window.CinetPay.setConfig({
        apikey: config.apiKey,
        site_id: config.siteId,
        notify_url: config.notifyUrl,
        mode: config.mode
      });

      // Step 2: Define callbacks BEFORE getCheckout (per SDK docs)
      console.log('[CinetPay] Setting up callbacks...');
      window.CinetPay.waitResponse = (data: any) => {
        console.log('[CinetPay] Response received:', data);
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
      };

      window.CinetPay.onClose = () => {
        console.log('[CinetPay] Modal closed');
        setIsLoading(false);
        options.onClose();
      };

      if (window.CinetPay.onError !== undefined) {
        window.CinetPay.onError = (error: any) => {
          console.error('[CinetPay] SDK Error:', error);
          setIsLoading(false);
          toast.error('Erreur technique CinetPay');
          options.onError(error?.message || 'SDK error');
        };
      }

      // Step 3: Open the checkout modal
      console.log('[CinetPay] Opening checkout modal...');
      
      // Clean description - remove special characters that cause CinetPay errors
      const cleanDescription = options.description.replace(/[#/$_&→<>]/g, '-').substring(0, 100);
      
      // Format phone number - must be digits only with country code (no + sign)
      const cleanPhone = options.customerPhone.replace(/[\s+\-()]/g, '');
      
      // Return URL for after payment
      const returnUrl = `${window.location.origin}/payment-success?reservation=${options.reservationId}`;
      
      window.CinetPay.getCheckout({
        transaction_id: transactionId,
        amount: xofAmount,
        currency: 'XOF',
        channels: 'ALL',
        description: cleanDescription,
        customer_name: options.customerName.split(' ')[0] || 'Client',
        customer_surname: options.customerName.split(' ').slice(1).join(' ') || 'KiloFly',
        customer_email: options.customerEmail || 'client@kilofly.com',
        customer_phone_number: cleanPhone,
        return_url: returnUrl,
        lock_amount: true,
        lock_currency: true
      });

      console.log('[CinetPay] getCheckout called successfully');

    } catch (error: any) {
      setIsLoading(false);
      console.error('[CinetPay] Error:', error);
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
