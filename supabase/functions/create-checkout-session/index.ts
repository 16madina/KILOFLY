import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')?.trim() || '', {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId, successUrl, cancelUrl } = await req.json();

    console.log('Creating checkout session for reservation:', reservationId);

    // Get reservation details
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        buyer:profiles!buyer_id(full_name, email),
        seller:profiles!seller_id(full_name),
        listing:listings!listing_id(departure, arrival, departure_date, currency)
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

    // Calculate amounts with 5% commission on BOTH sides
    const baseAmount = reservation.total_price;
    const buyerFee = Math.round(baseAmount * 100 * 0.05) / 100;
    const sellerFee = Math.round(baseAmount * 100 * 0.05) / 100;
    const totalAmountWithFee = baseAmount + buyerFee;
    const sellerAmount = baseAmount - sellerFee;
    const platformCommission = buyerFee + sellerFee;

    const currency = reservation.listing.currency?.toLowerCase() || 'eur';

    // Get buyer's email
    const { data: buyerAuth } = await supabase.auth.admin.getUserById(reservation.buyer_id);
    const buyerEmail = buyerAuth?.user?.email || '';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Transport ${reservation.listing.departure} → ${reservation.listing.arrival}`,
              description: `${reservation.requested_kg} kg - Voyageur: ${reservation.seller.full_name}`,
            },
            unit_amount: Math.round(totalAmountWithFee * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservationId,
        baseAmount: baseAmount.toString(),
        buyerFee: buyerFee.toString(),
        sellerFee: sellerFee.toString(),
        platformCommission: platformCommission.toString(),
        sellerAmount: sellerAmount.toString(),
        sellerId: reservation.seller_id,
        buyerId: reservation.buyer_id,
        listingId: reservation.listing_id,
      },
      success_url: successUrl || `${req.headers.get('origin')}/payment-success?reservation=${reservationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/payment?reservation=${reservationId}&canceled=true`,
    });

    console.log('Checkout session created:', session.id);

    // Create or update transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .upsert({
        listing_id: reservation.listing_id,
        buyer_id: reservation.buyer_id,
        seller_id: reservation.seller_id,
        reservation_id: reservationId,
        amount: totalAmountWithFee,
        platform_commission: platformCommission,
        seller_amount: sellerAmount,
        stripe_payment_intent_id: session.id, // Store session ID
        status: 'pending',
        payment_status: 'requires_payment',
      }, {
        onConflict: 'reservation_id',
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't throw, session is already created
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
