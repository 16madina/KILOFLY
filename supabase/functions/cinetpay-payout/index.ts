import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CINETPAY_API_KEY = Deno.env.get('CINETPAY_API_KEY') || '';
const CINETPAY_SITE_ID = Deno.env.get('CINETPAY_SITE_ID') || '';
const CINETPAY_SECRET_KEY = Deno.env.get('CINETPAY_SECRET_KEY') || '';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PayoutRequest {
  walletId: string;
  amount: number;
  phoneNumber: string;
  payoutMethod: 'wave' | 'orange_money';
  userId: string;
}

// Map payout method to CinetPay operator code
function getOperatorCode(method: string, phoneNumber: string): string {
  // Detect country from phone number prefix
  const isSenegal = phoneNumber.startsWith('+221') || phoneNumber.startsWith('221');
  const isCoteDivoire = phoneNumber.startsWith('+225') || phoneNumber.startsWith('225');
  
  if (method === 'wave') {
    if (isSenegal) return 'WAVESN';
    if (isCoteDivoire) return 'WAVECI';
    return 'WAVE';
  }
  
  if (method === 'orange_money') {
    if (isSenegal) return 'OMSN';
    if (isCoteDivoire) return 'OMCI';
    return 'OM';
  }
  
  return method.toUpperCase();
}

// Format phone number for CinetPay (remove + and spaces)
function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s+\-()]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletId, amount, phoneNumber, payoutMethod, userId }: PayoutRequest = await req.json();

    console.log('Processing payout request:', { walletId, amount, payoutMethod, phoneNumber: phoneNumber.slice(0, 6) + '***' });

    // Validate minimum amount (CinetPay minimum is usually 100 XOF)
    if (amount < 500) {
      throw new Error('Le montant minimum de retrait est de 500 XOF');
    }

    // Get wallet and verify balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet error:', walletError);
      throw new Error('Portefeuille non trouvé');
    }

    if (wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }

    // Generate unique transaction ID
    const transactionId = `KFLY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create pending transaction record
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type: 'debit',
        amount: amount,
        status: 'pending',
        provider: 'cinetpay',
        payout_method: payoutMethod,
        phone_number: phoneNumber,
        reference: transactionId,
        description: `Retrait ${payoutMethod === 'wave' ? 'Wave' : 'Orange Money'}`
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      throw new Error('Erreur lors de la création de la transaction');
    }

    // Deduct from wallet balance (optimistic)
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('id', walletId);

    if (deductError) {
      console.error('Balance deduction error:', deductError);
      // Rollback transaction status
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);
      throw new Error('Erreur lors de la mise à jour du solde');
    }

    // Call CinetPay Transfer API
    const operatorCode = getOperatorCode(payoutMethod, phoneNumber);
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log('Calling CinetPay API with operator:', operatorCode);

    const cinetpayPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: Math.round(amount),
      currency: 'XOF',
      receiver: formattedPhone,
      operator: operatorCode,
      payment_method: 'MOBILE_MONEY',
      notify_url: `${supabaseUrl}/functions/v1/cinetpay-webhook`,
      metadata: JSON.stringify({
        wallet_id: walletId,
        user_id: userId,
        transaction_db_id: transaction.id
      })
    };

    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/transfer/money/send/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPayload),
    });

    const cinetpayResult = await cinetpayResponse.json();
    console.log('CinetPay response:', JSON.stringify(cinetpayResult));

    if (cinetpayResult.code !== '00' && cinetpayResult.code !== 'PENDING') {
      // Refund the wallet on failure
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('id', walletId);

      await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          metadata: { cinetpay_response: cinetpayResult }
        })
        .eq('id', transaction.id);

      throw new Error(cinetpayResult.message || 'Erreur CinetPay: Transfert refusé');
    }

    // Update transaction with CinetPay reference
    await supabase
      .from('wallet_transactions')
      .update({
        external_id: cinetpayResult.data?.transfer_id || cinetpayResult.transaction_id,
        metadata: { cinetpay_response: cinetpayResult }
      })
      .eq('id', transaction.id);

    // Send notification
    await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_title: '💸 Retrait en cours',
      p_message: `Votre retrait de ${amount} XOF vers ${payoutMethod === 'wave' ? 'Wave' : 'Orange Money'} est en traitement`,
      p_type: 'info'
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        reference: transactionId,
        message: 'Retrait en cours de traitement',
        newBalance: wallet.balance - amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Payout error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors du retrait'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
