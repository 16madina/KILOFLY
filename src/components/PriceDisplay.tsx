import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Currency, formatPrice, convertCurrency } from "@/lib/currency";

interface PriceDisplayProps {
  amount: number;
  currency: Currency;
  showConversion?: boolean;
  className?: string;
  conversionClassName?: string;
}

export function PriceDisplay({ 
  amount, 
  currency, 
  showConversion = true,
  className = "",
  conversionClassName = "text-xs text-muted-foreground"
}: PriceDisplayProps) {
  const { user } = useAuth();
  const [userCurrency, setUserCurrency] = useState<Currency | null>(null);
  const [convertedPrice, setConvertedPrice] = useState<string>("");

  // Original price in seller's currency
  const originalPrice = formatPrice(amount, currency);

  useEffect(() => {
    async function loadUserCurrency() {
      if (!user) {
        setUserCurrency(null);
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
  }, [user]);

  useEffect(() => {
    async function updateConversion() {
      // Only show conversion if user has a different preferred currency
      if (!userCurrency || userCurrency === currency) {
        setConvertedPrice("");
        return;
      }

      try {
        const converted = await convertCurrency(amount, currency, userCurrency);
        const formatted = formatPrice(converted, userCurrency);
        setConvertedPrice(formatted);
      } catch (error) {
        console.error('Error converting currency:', error);
        setConvertedPrice("");
      }
    }

    if (showConversion) {
      updateConversion();
    }
  }, [amount, currency, userCurrency, showConversion]);

  return (
    <span className="flex flex-col">
      <span className={className}>{originalPrice}</span>
      {showConversion && convertedPrice && (
        <span className={conversionClassName}>≈ {convertedPrice}</span>
      )}
    </span>
  );
}
