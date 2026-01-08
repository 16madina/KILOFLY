import { supabase } from "@/integrations/supabase/client";

// Currencies available for posting listings
export type ListingCurrency = 'EUR' | 'USD' | 'XOF';

// All currencies including display-only currencies (for user preferences)
export type Currency = 'EUR' | 'USD' | 'XOF' | 'CAD' | 'GBP' | 'GNF' | 'MAD' | 'NGN' | 'XAF' | 'CDF' | 'DZD' | 'CHF';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  XOF: 'CFA',
  CAD: 'CA$',
  GBP: '£',
  GNF: 'GNF',
  MAD: 'DH',
  NGN: '₦',
  XAF: 'FCFA',
  CDF: 'FC',
  DZD: 'DA',
  CHF: 'CHF',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  XOF: 'Franc CFA (UEMOA)',
  CAD: 'Dollar canadien',
  GBP: 'Livre sterling',
  GNF: 'Franc guinéen',
  MAD: 'Dirham marocain',
  NGN: 'Naira nigérian',
  XAF: 'Franc CFA (CEMAC)',
  CDF: 'Franc congolais',
  DZD: 'Dinar algérien',
  CHF: 'Franc suisse',
};

// Currencies users can post listings in
export const LISTING_CURRENCIES: ListingCurrency[] = ['EUR', 'USD', 'XOF'];

// All currencies users can set as their preferred display currency
export const DISPLAY_CURRENCIES: Currency[] = ['EUR', 'USD', 'XOF', 'CAD', 'GBP', 'GNF', 'MAD', 'NGN', 'XAF', 'CDF', 'DZD', 'CHF'];

// Map country codes to their local currencies
export const COUNTRY_CURRENCY_MAP: Record<string, Currency> = {
  // Europe
  FR: 'EUR', BE: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR', FI: 'EUR',
  GB: 'GBP',
  CH: 'CHF',
  // North America
  US: 'USD',
  CA: 'CAD',
  // West Africa (UEMOA - XOF)
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
  // Central Africa (CEMAC - XAF)
  CM: 'XAF', GA: 'XAF', CG: 'XAF',
  // Other Africa
  GN: 'GNF',
  MA: 'MAD',
  NG: 'NGN',
  CD: 'CDF',
  DZ: 'DZD',
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
    // EUR-based fallback rates
    const eurRates: Record<string, number> = {
      EUR: 1,
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

    // Calculate conversion using EUR as pivot
    const [base, target] = cacheKey.split('-') as [Currency, Currency];
    if (eurRates[base] && eurRates[target]) {
      const baseToEur = 1 / eurRates[base];
      const eurToTarget = eurRates[target];
      return baseToEur * eurToTarget;
    }

    return 1;
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

  // African currencies don't use decimals traditionally
  if (['XOF', 'XAF', 'GNF', 'NGN', 'CDF', 'DZD'].includes(currency)) {
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
