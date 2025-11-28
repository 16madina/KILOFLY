import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureRequest {
  paymentIntentId: string;
  reservationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId, reservationId }: CaptureRequest = await req.json();

    console.log('Capturing payment for reservation:', reservationId);

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    console.log('Payment captured successfully:', paymentIntent.id);

    // Calculate amounts from metadata
    const platformCommission = parseInt(paymentIntent.metadata.platformCommission || '0') / 100;
    const sellerAmount = parseInt(paymentIntent.metadata.sellerAmount || '0') / 100;

    // Get reservation details to find seller
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('seller_id, buyer_id, listing_id, total_price')
      .eq('id', reservationId)
      .single();

    if (reservationError) {
      console.error('Error fetching reservation:', reservationError);
      throw reservationError;
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        listing_id: reservation.listing_id,
        buyer_id: reservation.buyer_id,
        seller_id: reservation.seller_id,
        amount: reservation.total_price,
        platform_commission: platformCommission,
        seller_amount: sellerAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'completed',
        payment_status: 'captured',
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      throw transactionError;
    }

    console.log('Transaction created successfully');

    // Send notification to seller about payment
    await supabase.rpc('send_notification', {
      p_user_id: reservation.seller_id,
      p_title: 'Paiement reçu ! 💰',
      p_message: `Le paiement de ${sellerAmount.toFixed(2)}€ a été reçu avec succès. L'argent sera versé sur votre compte après la livraison confirmée.`,
      p_type: 'success',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment captured successfully',
        platformCommission,
        sellerAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});