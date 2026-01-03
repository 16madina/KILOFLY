import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronLeft, Eye, Lock, Cookie, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PrivacySettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    profile_visibility: "public",
    listing_visibility: "public",
    allow_data_sharing: false,
    cookie_essential: true,
    cookie_analytics: false,
    cookie_marketing: false,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("privacy_settings")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setSettings({
        profile_visibility: data.profile_visibility,
        listing_visibility: data.listing_visibility,
        allow_data_sharing: data.allow_data_sharing,
        cookie_essential: data.cookie_essential,
        cookie_analytics: data.cookie_analytics,
        cookie_marketing: data.cookie_marketing,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("privacy_settings")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("privacy_settings")
          .update(settings)
          .eq("user_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("privacy_settings")
          .insert({ ...settings, user_id: user?.id });

        if (error) throw error;
      }

      // Update localStorage for cookie preferences
      localStorage.setItem("cookiePreferences", JSON.stringify({
        essential: settings.cookie_essential,
        analytics: settings.cookie_analytics,
        marketing: settings.cookie_marketing,
      }));

      toast.success("Paramètres de confidentialité enregistrés");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      {/* Header with safe area */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-9 w-9 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Paramètres de confidentialité</h1>
        </div>
      </header>
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        <div className="space-y-6">
          {/* Profile Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Visibilité du profil
              </CardTitle>
              <CardDescription>
                Contrôlez qui peut voir votre profil complet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.profile_visibility}
                onValueChange={(value) =>
                  setSettings({ ...settings, profile_visibility: value })
                }
              >
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="public" id="profile-public" />
                  <Label htmlFor="profile-public" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Public</p>
                      <p className="text-sm text-muted-foreground">
                        Tout le monde peut voir votre profil
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="verified_only" id="profile-verified" />
                  <Label htmlFor="profile-verified" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Utilisateurs vérifiés uniquement</p>
                      <p className="text-sm text-muted-foreground">
                        Seuls les utilisateurs avec identité vérifiée peuvent voir votre profil
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="profile-private" />
                  <Label htmlFor="profile-private" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Privé</p>
                      <p className="text-sm text-muted-foreground">
                        Votre profil est masqué pour tous sauf vous
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Listing Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Visibilité des annonces
              </CardTitle>
              <CardDescription>
                Contrôlez qui peut voir vos annonces de voyage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.listing_visibility}
                onValueChange={(value) =>
                  setSettings({ ...settings, listing_visibility: value })
                }
              >
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="public" id="listing-public" />
                  <Label htmlFor="listing-public" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Public</p>
                      <p className="text-sm text-muted-foreground">
                        Tout le monde peut voir vos annonces
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="verified_only" id="listing-verified" />
                  <Label htmlFor="listing-verified" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Utilisateurs vérifiés uniquement</p>
                      <p className="text-sm text-muted-foreground">
                        Seuls les utilisateurs vérifiés peuvent voir vos annonces
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="listing-private" />
                  <Label htmlFor="listing-private" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Privé</p>
                      <p className="text-sm text-muted-foreground">
                        Vos annonces ne sont visibles que par vous
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Data Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Partage de données
              </CardTitle>
              <CardDescription>
                Contrôlez le partage de vos données avec des tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-sharing">Autoriser le partage avec des tiers</Label>
                  <p className="text-sm text-muted-foreground">
                    Partenaires de confiance pour améliorer nos services
                  </p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={settings.allow_data_sharing}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_data_sharing: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Cookie Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-primary" />
                Préférences de cookies
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de cookies (conforme RGPD)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cookie-essential">Cookies essentiels</Label>
                  <p className="text-sm text-muted-foreground">
                    Nécessaires au fonctionnement du site
                  </p>
                </div>
                <Switch id="cookie-essential" checked={true} disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cookie-analytics">Cookies analytiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Nous aident à comprendre l'utilisation du site
                  </p>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={settings.cookie_analytics}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, cookie_analytics: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cookie-marketing">Cookies marketing</Label>
                  <p className="text-sm text-muted-foreground">
                    Utilisés pour la publicité ciblée
                  </p>
                </div>
                <Switch
                  id="cookie-marketing"
                  checked={settings.cookie_marketing}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, cookie_marketing: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Questions sur la confidentialité ?</CardTitle>
              <CardDescription>
                Pour toute question concernant vos données personnelles et votre vie privée, contactez-nous à{" "}
                <a href="mailto:privacy@kilofly.com" className="text-primary underline">
                  privacy@kilofly.com
                </a>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
