import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CURRENCY_WELCOME_KEY = 'kilofly_currency_welcome_shown';

/**
 * Hook to show a welcome toast about the multi-currency system
 * Shows once per user on their first visit after the feature is enabled
 */
export function useCurrencyWelcome() {
  const { user } = useAuth();

  useEffect(() => {
    // Only show for authenticated users
    if (!user) return;

    // Check if we've already shown the welcome message
    const hasShownWelcome = localStorage.getItem(CURRENCY_WELCOME_KEY);
    if (hasShownWelcome) return;

    // Wait a bit for the page to load before showing the toast
    const timer = setTimeout(async () => {
      try {
        // Get user's preferred currency
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .single();

        const userCurrency = profile?.preferred_currency || 'EUR';

        // Show welcome toast
        toast.success(
          `🎉 Système multi-devises activé ! Les prix s'affichent maintenant dans votre devise préférée (${userCurrency}). Vous pouvez changer votre devise dans Paramètres → Devise préférée`,
          {
            duration: 8000,
            position: 'top-center',
          }
        );

        // Mark as shown
        localStorage.setItem(CURRENCY_WELCOME_KEY, 'true');
      } catch (error) {
        console.error('Error showing currency welcome:', error);
        // Still mark as shown to avoid showing error repeatedly
        localStorage.setItem(CURRENCY_WELCOME_KEY, 'true');
      }
    }, 2000); // Wait 2 seconds after page load

    return () => clearTimeout(timer);
  }, [user]);
}
