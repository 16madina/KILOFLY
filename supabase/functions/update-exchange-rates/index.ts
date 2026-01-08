import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeRateResponse {
  rates: {
    [key: string]: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching exchange rates from API...');

    // Using exchangerate-api.io (free tier allows 1,500 requests per month)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    // All currencies we support (listing + display currencies)
    const currencies = ['EUR', 'USD', 'XOF', 'CAD', 'GBP', 'GNF', 'MAD', 'NGN', 'XAF', 'CDF', 'DZD', 'CHF'];
    
    // Build EUR rates map from API response
    const eurRates: Record<string, number> = { EUR: 1 };
    for (const currency of currencies) {
      if (currency !== 'EUR') {
        eurRates[currency] = data.rates[currency] || getFallbackRate(currency);
      }
    }

    console.log('Exchange rates fetched:', eurRates);

    // Fallback rates if API doesn't have the currency
    function getFallbackRate(currency: string): number {
      const fallbacks: Record<string, number> = {
        USD: 1.08,
        XOF: 656,
        CAD: 1.50,
        GBP: 0.84,
        GNF: 9200,
        MAD: 10.8,
        NGN: 1650,
        XAF: 656,
        CDF: 2800,
        DZD: 145,
        CHF: 0.94,
      };
      return fallbacks[currency] || 1;
    }

    // Calculate all conversion pairs
    const rates: { base_currency: string; target_currency: string; rate: number }[] = [];
    
    for (const base of currencies) {
      for (const target of currencies) {
        // Convert via EUR as pivot
        const baseToEur = 1 / eurRates[base];
        const eurToTarget = eurRates[target];
        const rate = baseToEur * eurToTarget;
        
        rates.push({
          base_currency: base,
          target_currency: target,
          rate: rate,
        });
      }
    }

    // Update exchange rates in database
    for (const rate of rates) {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert({
          base_currency: rate.base_currency,
          target_currency: rate.target_currency,
          rate: rate.rate,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'base_currency,target_currency'
        });

      if (error) {
        console.error('Error updating rate:', rate, error);
      }
    }

    console.log('Exchange rates updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates,
        updated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error updating exchange rates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
