import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CINETPAY_API_KEY = Deno.env.get('CINETPAY_API_KEY') || '';
const CINETPAY_SITE_ID = Deno.env.get('CINETPAY_SITE_ID') || '';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PaymentRequest {
  reservationId: string;
  amount: number;
  buyerEmail: string;
  buyerPhone: string;
  buyerName: string;
  sellerName: string;
  route: string;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      reservationId,
      amount,
      buyerEmail,
      buyerPhone,
      buyerName,
      sellerName,
      route,
      currency = 'XOF',
      returnUrl,
      cancelUrl
    }: PaymentRequest = await req.json();

    console.log('Creating CinetPay payment for reservation:', reservationId);

    // Calculate platform commission (5% from buyer)
    const buyerCommission = Math.round(amount * 0.05);
    const totalAmount = amount + buyerCommission;

    // Generate unique transaction ID
    const transactionId = `KFLY-${reservationId.slice(0, 8)}-${Date.now()}`;

    // Get reservation details
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, listings(*)')
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      throw new Error('Réservation non trouvée');
    }

    // Create CinetPay payment
    const cinetpayPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: Math.round(totalAmount),
      currency: currency.toUpperCase(),
      description: `KiloFly - Transport ${route} avec ${sellerName}`,
      customer_name: buyerName,
      customer_surname: '',
      customer_email: buyerEmail,
      customer_phone_number: buyerPhone.replace(/[\s+\-()]/g, ''),
      customer_address: '',
      customer_city: '',
      customer_country: '',
      customer_state: '',
      customer_zip_code: '',
      notify_url: `${supabaseUrl}/functions/v1/cinetpay-payment-webhook`,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      channels: 'ALL',
      metadata: JSON.stringify({
        reservation_id: reservationId,
        base_amount: amount,
        buyer_commission: buyerCommission,
        seller_id: reservation.seller_id,
        buyer_id: reservation.buyer_id,
        listing_id: reservation.listing_id
      }),
      lang: 'fr',
      invoice_data: {
        Quantity: reservation.requested_kg,
        Unit_price: reservation.listings.price_per_kg,
        Total_price: amount
      }
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPayload),
    });

    const result = await response.json();
    console.log('CinetPay payment response:', JSON.stringify(result));

    if (result.code !== '201') {
      throw new Error(result.message || 'Erreur lors de la création du paiement CinetPay');
    }

    // Create transaction record
    const sellerAmount = amount - Math.round(amount * 0.05); // 5% commission from seller too
    const platformCommission = buyerCommission + Math.round(amount * 0.05); // Total 10%

    await supabase
      .from('transactions')
      .insert({
        reservation_id: reservationId,
        listing_id: reservation.listing_id,
        buyer_id: reservation.buyer_id,
        seller_id: reservation.seller_id,
        amount: totalAmount,
        platform_commission: platformCommission,
        seller_amount: sellerAmount,
        status: 'pending',
        payment_status: 'pending',
        stripe_payment_intent_id: transactionId, // Using this field for CinetPay transaction ID
      });

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: result.data.payment_url,
        paymentToken: result.data.payment_token,
        transactionId: transactionId,
        totalAmount: totalAmount,
        buyerCommission: buyerCommission,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('CinetPay payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la création du paiement'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
