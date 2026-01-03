import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Shield, Globe, DollarSign, Heart, MapPin, Eye, FileText, HelpCircle, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, biometryType, enableBiometric, disableBiometric } = useBiometricAuth();
  
  const [notifications, setNotifications] = useState({
    messages: true,
    responses: true,
    alerts: true,
    promotions: false,
  });
  const [darkMode, setDarkMode] = useState(false);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableBiometric();
      toast.success(`${biometryType} activé`);
    } else {
      await disableBiometric();
      toast.success(`${biometryType} désactivé`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      {/* Header with safe area */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="h-9 w-9 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Paramètres</h1>
        </div>
      </header>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Security */}
        <Link to="/account-security">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Shield className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left font-medium">Sécurité</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Biometric Authentication */}
        {biometricAvailable && (
          <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-green-500" />
              <div className="flex flex-col">
                <span className="font-medium">Connexion {biometryType}</span>
                <span className="text-sm text-muted-foreground">
                  Se connecter avec {biometryType}
                </span>
              </div>
            </div>
            <Switch 
              checked={biometricEnabled}
              onCheckedChange={handleBiometricToggle}
            />
          </div>
        )}

        {/* Transactions */}
        <Link to="/user-transactions">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left font-medium">Mes transactions</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Currency Settings */}
        <Link to="/currency-settings">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Globe className="w-5 h-5 text-orange-500" />
            <span className="flex-1 text-left font-medium">Devise préférée</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Privacy Settings */}
        <Link to="/privacy-settings">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Eye className="w-5 h-5 text-purple-500" />
            <span className="flex-1 text-left font-medium">Paramètres de confidentialité</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Favorites */}
        <Link to="/favorites">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="flex-1 text-left font-medium">Mes Favoris</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Route Alerts */}
        <Link to="/route-alerts">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <MapPin className="w-5 h-5 text-green-500" />
            <span className="flex-1 text-left font-medium">Alertes de Routes</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Privacy Policy */}
        <Link to="/privacy">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="flex-1 text-left font-medium">Politique de confidentialité</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Terms */}
        <Link to="/terms">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <FileText className="w-5 h-5 text-cyan-500" />
            <span className="flex-1 text-left font-medium">Conditions d'utilisation</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* FAQ */}
        <Link to="/faq">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span className="flex-1 text-left font-medium">Questions Fréquentes (FAQ)</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Language */}
        <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
          <Globe className="w-5 h-5 text-primary" />
          <span className="flex-1 text-left font-medium">Langue</span>
          <span className="text-muted-foreground mr-2">Français</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h3 className="font-semibold px-4">Notifications</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
              <span>Nouveaux messages</span>
              <Switch 
                checked={notifications.messages}
                onCheckedChange={(checked) => setNotifications({...notifications, messages: checked})}
              />
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
              <span>Réponses à mes annonces</span>
              <Switch 
                checked={notifications.responses}
                onCheckedChange={(checked) => setNotifications({...notifications, responses: checked})}
              />
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
              <span>Alertes voyageurs sur mes destinations</span>
              <Switch 
                checked={notifications.alerts}
                onCheckedChange={(checked) => setNotifications({...notifications, alerts: checked})}
              />
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
              <span>Promotions / infos</span>
              <Switch 
                checked={notifications.promotions}
                onCheckedChange={(checked) => setNotifications({...notifications, promotions: checked})}
              />
            </div>
          </div>
        </div>

        {/* Personalization Section */}
        <div className="space-y-4">
          <h3 className="font-semibold px-4">Personnalisation</h3>
          <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
            <span>Mode sombre</span>
            <Switch 
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </div>

        {/* Sign Out */}
        <Button 
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 mt-8"
          onClick={handleSignOut}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default Settings;
