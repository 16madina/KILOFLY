import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Currency, formatPriceWithConversion } from "@/lib/currency";

interface PriceDisplayProps {
  amount: number;
  currency: Currency;
  showOriginal?: boolean;
  className?: string;
}

export function PriceDisplay({ 
  amount, 
  currency, 
  showOriginal = false,
  className = ""
}: PriceDisplayProps) {
  const { user } = useAuth();
  const [displayPrice, setDisplayPrice] = useState<string>("");
  const [userCurrency, setUserCurrency] = useState<Currency>(currency);

  useEffect(() => {
    async function loadUserCurrency() {
      if (!user) {
        setUserCurrency(currency);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .single();

        if (data?.preferred_currency) {
          setUserCurrency(data.preferred_currency as Currency);
        }
      } catch (error) {
        console.error('Error loading user currency:', error);
      }
    }

    loadUserCurrency();
  }, [user, currency]);

  useEffect(() => {
    async function updatePrice() {
      const formatted = await formatPriceWithConversion(
        amount,
        currency,
        userCurrency,
        { showOriginal }
      );
      setDisplayPrice(formatted);
    }

    updatePrice();
  }, [amount, currency, userCurrency, showOriginal]);

  return <span className={className}>{displayPrice || "..."}</span>;
}
