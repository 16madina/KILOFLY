import { supabase } from "@/integrations/supabase/client";

export type Currency = 'EUR' | 'USD' | 'XOF';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  XOF: 'CFA',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  XOF: 'Franc CFA',
};

// Cache for exchange rates
let exchangeRatesCache: Map<string, { rate: number; timestamp: number }> = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get exchange rate from base currency to target currency
 */
export async function getExchangeRate(
  baseCurrency: Currency,
  targetCurrency: Currency
): Promise<number> {
  if (baseCurrency === targetCurrency) return 1;

  const cacheKey = `${baseCurrency}-${targetCurrency}`;
  const cached = exchangeRatesCache.get(cacheKey);

  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    // Fetch from database
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', baseCurrency)
      .eq('target_currency', targetCurrency)
      .single();

    if (error) throw error;

    const rate = Number(data.rate);
    
    // Update cache
    exchangeRatesCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
    });

    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Fallback to approximate rates
    const fallbackRates: Record<string, number> = {
      'EUR-USD': 1.08,
      'EUR-XOF': 656,
      'USD-EUR': 0.93,
      'USD-XOF': 607,
      'XOF-EUR': 0.0015,
      'XOF-USD': 0.0016,
    };

    return fallbackRates[cacheKey] || 1;
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  options: { showSymbol?: boolean; decimals?: number } = {}
): string {
  const { showSymbol = true, decimals = 2 } = options;
  
  const formattedAmount = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (!showSymbol) return formattedAmount;

  // XOF doesn't use decimals traditionally
  if (currency === 'XOF') {
    const roundedAmount = Math.round(amount).toLocaleString('fr-FR');
    return `${roundedAmount} ${CURRENCY_SYMBOLS[currency]}`;
  }

  // EUR and USD use symbol before or after based on convention
  if (currency === 'EUR') {
    return `${formattedAmount}${CURRENCY_SYMBOLS[currency]}`;
  }

  return `${CURRENCY_SYMBOLS[currency]}${formattedAmount}`;
}

/**
 * Format price with automatic conversion to user's preferred currency
 */
export async function formatPriceWithConversion(
  amount: number,
  originalCurrency: Currency,
  targetCurrency: Currency,
  options: { showOriginal?: boolean } = {}
): Promise<string> {
  const { showOriginal = false } = options;

  if (originalCurrency === targetCurrency) {
    return formatPrice(amount, originalCurrency);
  }

  const convertedAmount = await convertCurrency(amount, originalCurrency, targetCurrency);
  const formattedConverted = formatPrice(convertedAmount, targetCurrency);

  if (showOriginal) {
    const formattedOriginal = formatPrice(amount, originalCurrency);
    return `${formattedConverted} (${formattedOriginal})`;
  }

  return formattedConverted;
}

/**
 * Get Stripe currency code (lowercase for Stripe API)
 */
export function getStripeCurrency(currency: Currency): string {
  // Stripe uses lowercase currency codes
  // XOF is West African CFA Franc, supported by Stripe
  return currency.toLowerCase();
}

/**
 * Update exchange rates (call this periodically or on app load)
 */
export async function updateExchangeRates(): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('update-exchange-rates');
    
    if (error) {
      console.error('Error updating exchange rates:', error);
    } else {
      console.log('Exchange rates updated successfully');
      // Clear cache to force reload of new rates
      exchangeRatesCache.clear();
    }
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
  }
}
