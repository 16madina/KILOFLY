import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId } = await req.json();
    
    console.log('Retrieving payment intent:', paymentIntentId);

    const stripeSecretKey = (Deno.env.get('STRIPE_SECRET_KEY') || '').trim();
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const keyMode = stripeSecretKey.startsWith('sk_live_')
      ? 'live'
      : stripeSecretKey.startsWith('sk_test_')
        ? 'test'
        : 'unknown';

    console.log('Stripe key mode:', keyMode, 'last4:', stripeSecretKey.slice(-4));

    // Use fetch API directly instead of Stripe SDK to avoid Deno compatibility issues
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to retrieve payment intent');
    }

    const paymentIntent = await response.json();
    
    console.log('Payment intent retrieved - status:', paymentIntent.status, 'has_client_secret:', !!paymentIntent.client_secret);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
