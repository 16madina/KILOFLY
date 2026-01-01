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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('CinetPay payment webhook received:', JSON.stringify(body));

    const { cpm_trans_id } = body;

    if (!cpm_trans_id) {
      throw new Error('Missing transaction ID');
    }

    // Verify transaction status with CinetPay
    const verifyResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: CINETPAY_API_KEY,
        site_id: CINETPAY_SITE_ID,
        transaction_id: cpm_trans_id,
      }),
    });

    const verifyResult = await verifyResponse.json();
    console.log('CinetPay verification result:', JSON.stringify(verifyResult));

    // Find the transaction
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*, reservations(*)')
      .eq('stripe_payment_intent_id', cpm_trans_id)
      .single();

    if (findError || !transaction) {
      console.error('Transaction not found:', cpm_trans_id);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse metadata
    let metadata: any = {};
    try {
      metadata = verifyResult.data?.metadata ? JSON.parse(verifyResult.data.metadata) : {};
    } catch (e) {
      console.log('Could not parse metadata');
    }

    const paymentStatus = verifyResult.data?.status;
    let newStatus: 'captured' | 'failed' | 'pending' = 'pending';
    
    if (paymentStatus === 'ACCEPTED') {
      newStatus = 'captured';
    } else if (paymentStatus === 'REFUSED' || paymentStatus === 'CANCELLED') {
      newStatus = 'failed';
    }

    console.log(`Updating transaction ${transaction.id} to payment_status: ${newStatus}`);

    // Update transaction
    await supabase
      .from('transactions')
      .update({
        payment_status: newStatus,
        status: newStatus === 'captured' ? 'completed' : (newStatus === 'failed' ? 'failed' : 'pending'),
      })
      .eq('id', transaction.id);

    if (newStatus === 'captured') {
      // Update reservation to approved
      await supabase
        .from('reservations')
        .update({ status: 'approved' })
        .eq('id', transaction.reservation_id);

      // Notify buyer
      await supabase.rpc('send_notification', {
        p_user_id: transaction.buyer_id,
        p_title: '✅ Paiement confirmé !',
        p_message: `Votre paiement de ${transaction.amount} XOF a été confirmé`,
        p_type: 'success'
      });

      // Notify seller
      await supabase.rpc('send_notification', {
        p_user_id: transaction.seller_id,
        p_title: '💰 Paiement reçu !',
        p_message: `Un paiement de ${transaction.amount} XOF a été reçu pour une réservation`,
        p_type: 'success'
      });
    } else if (newStatus === 'failed') {
      // Notify buyer of failure
      await supabase.rpc('send_notification', {
        p_user_id: transaction.buyer_id,
        p_title: '❌ Paiement échoué',
        p_message: 'Votre paiement n\'a pas pu être traité. Veuillez réessayer.',
        p_type: 'warning'
      });
    }

    return new Response(
      JSON.stringify({ received: true, status: newStatus }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Payment webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
