import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Cookie, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CookieConsent = () => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    checkCookieConsent();
  }, [user]);

  const checkCookieConsent = async () => {
    const hasConsent = localStorage.getItem("cookieConsent");
    
    if (!hasConsent && !user) {
      setShowBanner(true);
      return;
    }

    if (user) {
      const { data, error } = await supabase
        .from("privacy_settings")
        .select("cookie_essential, cookie_analytics, cookie_marketing")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setShowBanner(true);
      } else {
        setPreferences({
          essential: data.cookie_essential,
          analytics: data.cookie_analytics,
          marketing: data.cookie_marketing,
        });
      }
    }
  };

  const handleAcceptAll = async () => {
    const newPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    
    await savePreferences(newPreferences);
    setShowBanner(false);
    toast.success("Préférences de cookies enregistrées");
  };

  const handleAcceptEssential = async () => {
    const newPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    
    await savePreferences(newPreferences);
    setShowBanner(false);
    toast.success("Préférences de cookies enregistrées");
  };

  const handleSaveCustom = async () => {
    await savePreferences(preferences);
    setShowSettings(false);
    setShowBanner(false);
    toast.success("Préférences de cookies enregistrées");
  };

  const savePreferences = async (prefs: typeof preferences) => {
    localStorage.setItem("cookieConsent", "true");
    localStorage.setItem("cookiePreferences", JSON.stringify(prefs));

    if (user) {
      const { data: existing } = await supabase
        .from("privacy_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("privacy_settings")
          .update({
            cookie_essential: prefs.essential,
            cookie_analytics: prefs.analytics,
            cookie_marketing: prefs.marketing,
          })
          .eq("user_id", user.id);
      } else {
        await supabase.from("privacy_settings").insert({
          user_id: user.id,
          cookie_essential: prefs.essential,
          cookie_analytics: prefs.analytics,
          cookie_marketing: prefs.marketing,
        });
      }
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
        <Card className="max-w-4xl mx-auto border-2 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Gestion des cookies</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-sm">
              Nous utilisons des cookies pour améliorer votre expérience sur KiloFly. 
              Les cookies essentiels sont nécessaires au fonctionnement du site. 
              Vous pouvez personnaliser vos préférences pour les cookies analytiques et marketing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAcceptAll} className="flex-1">
                Tout accepter
              </Button>
              <Button onClick={handleAcceptEssential} variant="outline" className="flex-1">
                Essentiels uniquement
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-2" />
                Personnaliser
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Préférences de cookies</DialogTitle>
            <DialogDescription>
              Gérez vos préférences de cookies. Les cookies essentiels ne peuvent pas être désactivés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="essential">Cookies essentiels</Label>
                <p className="text-xs text-muted-foreground">
                  Nécessaires au fonctionnement du site
                </p>
              </div>
              <Switch id="essential" checked={true} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Cookies analytiques</Label>
                <p className="text-xs text-muted-foreground">
                  Nous aident à comprendre l'utilisation du site
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Cookies marketing</Label>
                <p className="text-xs text-muted-foreground">
                  Utilisés pour la publicité ciblée
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveCustom} className="flex-1">
              Enregistrer
            </Button>
            <Button
              onClick={() => setShowSettings(false)}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
