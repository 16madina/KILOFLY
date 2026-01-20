import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WithdrawalRequest {
  walletId: string;
  amount: number;
  phoneNumber: string;
  payoutMethod: 'wave' | 'orange_money';
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletId, amount, phoneNumber, payoutMethod, userId }: WithdrawalRequest = await req.json();

    console.log('Processing withdrawal request:', { 
      walletId, 
      amount, 
      payoutMethod, 
      phoneNumber: phoneNumber.slice(0, 6) + '***' 
    });

    // Validate minimum amount
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

    // Generate unique transaction reference
    const reference = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create pending withdrawal transaction
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        type: 'debit',
        amount: amount,
        status: 'pending',
        provider: 'manual', // Manual payout by admin
        payout_method: payoutMethod,
        phone_number: phoneNumber,
        reference: reference,
        description: `Demande de retrait ${payoutMethod === 'wave' ? 'Wave' : 'Orange Money'}`
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      throw new Error('Erreur lors de la création de la demande');
    }

    // Deduct from wallet balance (reserve the funds)
    const newBalance = wallet.balance - amount;
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
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

    // Get user profile for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Send notification to user
    await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_title: '💸 Demande de retrait reçue',
      p_message: `Votre demande de retrait de ${amount} XOF vers ${payoutMethod === 'wave' ? 'Wave' : 'Orange Money'} (${phoneNumber}) est en cours de traitement.`,
      p_type: 'info'
    });

    console.log('Withdrawal request created successfully:', {
      transactionId: transaction.id,
      reference,
      amount,
      newBalance
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        reference: reference,
        message: 'Demande de retrait enregistrée. Vous serez notifié une fois le paiement effectué.',
        newBalance: newBalance
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Withdrawal request error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la demande de retrait'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
