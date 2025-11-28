import { useEffect } from 'react';
import { updateExchangeRates } from '@/lib/currency';

/**
 * Hook to automatically update exchange rates on app load
 * Updates rates once when the app initializes
 */
export function useExchangeRates() {
  useEffect(() => {
    // Update exchange rates on mount
    updateExchangeRates();

    // Update exchange rates every 24 hours
    const interval = setInterval(() => {
      updateExchangeRates();
    }, 1000 * 60 * 60 * 24); // 24 hours

    return () => clearInterval(interval);
  }, []);
}
