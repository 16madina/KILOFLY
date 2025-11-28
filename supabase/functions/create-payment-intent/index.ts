import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  reservationId: string;
  amount: number;
  buyerEmail: string;
  sellerName: string;
  route: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId, amount, buyerEmail, sellerName, route }: PaymentRequest = await req.json();

    console.log('Creating payment intent for reservation:', reservationId);

    // Calculate platform commission (5%)
    const platformCommission = Math.round(amount * 100 * 0.05); // Convert to cents and take 5%
    const sellerAmount = Math.round(amount * 100) - platformCommission;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      receipt_email: buyerEmail,
      description: `KiloFly - Transport ${route} avec ${sellerName}`,
      metadata: {
        reservationId,
        platformCommission: platformCommission.toString(),
        sellerAmount: sellerAmount.toString(),
      },
      // Hold funds until explicit capture (after delivery)
      capture_method: 'manual',
    });

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformCommission: platformCommission / 100,
        sellerAmount: sellerAmount / 100,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});