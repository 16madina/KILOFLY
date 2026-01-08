import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Currency, CURRENCY_NAMES, CURRENCY_SYMBOLS, DISPLAY_CURRENCIES } from "@/lib/currency";

const CurrencySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("EUR");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchUserCurrency();
  }, [user, navigate]);

  const fetchUserCurrency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.preferred_currency) {
        setSelectedCurrency(data.preferred_currency as Currency);
      }
    } catch (error) {
      console.error("Error fetching currency:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_currency: selectedCurrency })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Devise préférée mise à jour avec succès");
      navigate("/settings");
    } catch (error) {
      console.error("Error updating currency:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const currencies = DISPLAY_CURRENCIES;

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Paramètres de devise</h1>
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-sky flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Devise d'affichage</CardTitle>
                <CardDescription>
                  Choisissez votre devise préférée pour l'affichage des prix
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Devise préférée
              </Label>
              <p className="text-sm text-muted-foreground">
                Les prix seront automatiquement convertis et affichés dans votre devise préférée.
                Les vendeurs peuvent toujours publier dans leur propre devise.
              </p>

              <RadioGroup
                value={selectedCurrency}
                onValueChange={(value) => setSelectedCurrency(value as Currency)}
                className="space-y-3"
              >
                {currencies.map((currency) => (
                  <div
                    key={currency}
                    className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setSelectedCurrency(currency)}
                  >
                    <RadioGroupItem value={currency} id={currency} />
                    <Label
                      htmlFor={currency}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base">
                            {CURRENCY_SYMBOLS[currency]} {CURRENCY_NAMES[currency]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Code: {currency}
                          </p>
                        </div>
                        <div className="text-3xl">
                          {CURRENCY_SYMBOLS[currency]}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">💡 Bon à savoir</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Les conversions utilisent des taux de change en temps réel</li>
                <li>Les prix originaux restent visibles lors du paiement</li>
                <li>Les paiements sont traités dans la devise du vendeur</li>
                <li>Les taux sont mis à jour automatiquement chaque jour</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-gradient-sky hover:opacity-90"
              >
                {loading ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CurrencySettings;
