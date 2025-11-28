import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, TrendingUp } from "lucide-react";
import { Currency, CURRENCY_SYMBOLS, CURRENCY_NAMES, convertCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";

export function CurrencyConverter() {
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<Currency>("XOF");
  const [toCurrency, setToCurrency] = useState<Currency>("EUR");
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    performConversion();
  }, [amount, fromCurrency, toCurrency]);

  const performConversion = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setConvertedAmount(0);
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertCurrency(numAmount, fromCurrency, toCurrency);
      setConvertedAmount(result);
    } catch (error) {
      console.error("Conversion error:", error);
      setConvertedAmount(0);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const currencies: Currency[] = ["EUR", "USD", "XOF"];

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Calculateur de devises
        </CardTitle>
        <CardDescription>
          Convertissez instantanément entre EUR, USD et CFA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Montant</Label>
          <Input
            id="amount"
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg"
            min="0"
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="from-currency">De</Label>
            <Select value={fromCurrency} onValueChange={(value) => setFromCurrency(value as Currency)}>
              <SelectTrigger id="from-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{CURRENCY_SYMBOLS[curr]}</span>
                      <span>{curr}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapCurrencies}
            className="mb-0.5 hover:scale-110 transition-transform"
          >
            <ArrowDownUp className="h-5 w-5" />
          </Button>

          <div className="space-y-2">
            <Label htmlFor="to-currency">Vers</Label>
            <Select value={toCurrency} onValueChange={(value) => setToCurrency(value as Currency)}>
              <SelectTrigger id="to-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{CURRENCY_SYMBOLS[curr]}</span>
                      <span>{curr}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="bg-gradient-sky/10 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Résultat</p>
            <p className="text-3xl font-bold text-primary">
              {isConverting ? (
                <span className="text-xl">Conversion...</span>
              ) : (
                <>
                  {convertedAmount.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-lg">{CURRENCY_SYMBOLS[toCurrency]}</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {amount} {CURRENCY_SYMBOLS[fromCurrency]} = {convertedAmount.toFixed(2)} {CURRENCY_SYMBOLS[toCurrency]}
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2">
          Taux de change mis à jour quotidiennement
        </div>
      </CardContent>
    </Card>
  );
}
