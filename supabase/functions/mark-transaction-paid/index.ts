import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId, reservationId } = await req.json();
    
    console.log('Marking transaction as paid for PaymentIntent:', paymentIntentId);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    // Verify payment intent status with Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to verify payment intent');
    }

    const paymentIntent = await stripeResponse.json();
    
    console.log('Payment intent status:', paymentIntent.status);

    // Only update if payment succeeded or requires capture
    if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
    }

    // Initialize Supabase with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update transaction status
    const paymentStatus = paymentIntent.status === 'succeeded' ? 'paid' : 'authorized';
    const transactionStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'pending';

    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update({ 
        payment_status: paymentStatus,
        status: transactionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      throw updateError;
    }

    console.log('Transaction updated successfully:', transaction.id);

    // Update reservation status if payment succeeded
    if (paymentIntent.status === 'succeeded' && reservationId) {
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (reservationError) {
        console.error('Error updating reservation:', reservationError);
        // Don't throw, payment is still successful
      } else {
        console.log('Reservation status updated to in_progress');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        paymentStatus,
        transactionStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error marking transaction as paid:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
