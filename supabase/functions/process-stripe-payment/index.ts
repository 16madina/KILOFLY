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

interface ProcessPaymentRequest {
  reservationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId }: ProcessPaymentRequest = await req.json();

    console.log('Processing payment for reservation:', reservationId);

    // Get reservation details
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        buyer:profiles!buyer_id(full_name, avatar_url),
        seller:profiles!seller_id(full_name, avatar_url),
        listing:listings!listing_id(departure, arrival, departure_date, price_per_kg)
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError) {
      console.error('Error fetching reservation:', reservationError);
      throw reservationError;
    }

    if (reservation.status !== 'approved') {
      throw new Error('Reservation must be approved before processing payment');
    }

    // Calculate amounts
    const totalAmount = reservation.total_price;
    const platformCommission = Math.round(totalAmount * 100 * 0.05) / 100; // 5%
    const sellerAmount = totalAmount - platformCommission;

    // Get buyer's email
    const { data: buyerAuth } = await supabase.auth.admin.getUserById(reservation.buyer_id);
    const buyerEmail = buyerAuth?.user?.email || '';

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'eur',
      receipt_email: buyerEmail,
      description: `KiloFly - Transport ${reservation.listing.departure} → ${reservation.listing.arrival}`,
      metadata: {
        reservationId,
        platformCommission: (platformCommission * 100).toString(),
        sellerAmount: (sellerAmount * 100).toString(),
        sellerId: reservation.seller_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        listing_id: reservation.listing_id,
        buyer_id: reservation.buyer_id,
        seller_id: reservation.seller_id,
        amount: totalAmount,
        platform_commission: platformCommission,
        seller_amount: sellerAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        payment_status: 'requires_payment',
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      throw transactionError;
    }

    // Send notification to buyer
    await supabase.rpc('send_notification', {
      p_user_id: reservation.buyer_id,
      p_title: 'Paiement requis 💳',
      p_message: `Votre réservation a été approuvée ! Veuillez procéder au paiement de ${totalAmount.toFixed(2)}€ pour confirmer votre commande.`,
      p_type: 'info',
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        platformCommission,
        sellerAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});