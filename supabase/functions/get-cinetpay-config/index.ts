import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CINETPAY_API_KEY = Deno.env.get('CINETPAY_API_KEY') || '';
const CINETPAY_SITE_ID = Deno.env.get('CINETPAY_SITE_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Returning CinetPay config for seamless SDK');
    
    // Return public config for the seamless SDK
    // The API key is required by CinetPay SDK on the frontend
    return new Response(
      JSON.stringify({
        apiKey: CINETPAY_API_KEY,
        siteId: CINETPAY_SITE_ID,
        notifyUrl: `${SUPABASE_URL}/functions/v1/cinetpay-payment-webhook`,
        mode: 'PRODUCTION'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error getting CinetPay config:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
