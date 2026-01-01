import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const parseWebhookBody = async (req: Request): Promise<Record<string, any>> => {
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await req.json();
    }

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData();
      return Object.fromEntries(fd.entries());
    }

    const text = await req.text();
    const params = new URLSearchParams(text);
    const obj: Record<string, any> = {};
    params.forEach((value, key) => {
      obj[key] = value;
    });

    if (Object.keys(obj).length === 0 && text) {
      try {
        return JSON.parse(text);
      } catch {
        // ignore
      }
    }

    return obj;
  } catch (e) {
    console.error('Failed to parse CinetPay webhook body:', e);
    return {};
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await parseWebhookBody(req);
    console.log('CinetPay webhook received:', JSON.stringify(body));

    const { 
      cpm_trans_id,
      cpm_trans_status,
      cpm_amount,
      cpm_currency,
      cpm_custom,
      cpm_error_message
    } = body;

    // Parse metadata
    let metadata: any = {};
    try {
      metadata = cpm_custom ? JSON.parse(cpm_custom) : {};
    } catch (e) {
      console.log('Could not parse metadata:', cpm_custom);
    }

    // Find the transaction by reference
    const { data: transaction, error: findError } = await supabase
      .from('wallet_transactions')
      .select('*, wallets(*)')
      .eq('reference', cpm_trans_id)
      .single();

    if (findError || !transaction) {
      // Try by external_id
      const { data: txByExternal } = await supabase
        .from('wallet_transactions')
        .select('*, wallets(*)')
        .eq('external_id', cpm_trans_id)
        .single();

      if (!txByExternal) {
        console.error('Transaction not found:', cpm_trans_id);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const tx = transaction || (await supabase
      .from('wallet_transactions')
      .select('*, wallets(*)')
      .eq('external_id', cpm_trans_id)
      .single()).data;

    if (!tx) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map CinetPay status to our status
    let newStatus: 'completed' | 'failed' | 'pending' = 'pending';
    if (cpm_trans_status === '00' || cpm_trans_status === 'ACCEPTED' || cpm_trans_status === 'SUCCESS') {
      newStatus = 'completed';
    } else if (cpm_trans_status === 'REFUSED' || cpm_trans_status === 'FAILED' || cpm_trans_status === 'CANCELLED') {
      newStatus = 'failed';
    }

    console.log(`Updating transaction ${tx.id} to status: ${newStatus}`);

    // Update transaction status
    await supabase
      .from('wallet_transactions')
      .update({
        status: newStatus,
        metadata: {
          ...tx.metadata,
          webhook_response: body,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', tx.id);

    // If failed, refund the wallet
    if (newStatus === 'failed' && tx.wallets) {
      await supabase
        .from('wallets')
        .update({ 
          balance: tx.wallets.balance + tx.amount 
        })
        .eq('id', tx.wallet_id);

      // Notify user of failure
      await supabase.rpc('send_notification', {
        p_user_id: tx.wallets.user_id,
        p_title: '❌ Retrait échoué',
        p_message: `Votre retrait de ${tx.amount} XOF a échoué. Le montant a été recrédité sur votre portefeuille.`,
        p_type: 'warning'
      });
    }

    // If successful, notify user
    if (newStatus === 'completed' && tx.wallets) {
      await supabase.rpc('send_notification', {
        p_user_id: tx.wallets.user_id,
        p_title: '✅ Retrait réussi !',
        p_message: `Votre retrait de ${tx.amount} XOF a été envoyé avec succès`,
        p_type: 'success'
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
    // IMPORTANT: Never fail the provider callback with 5xx; it can mark payout as failed/unstable.
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
