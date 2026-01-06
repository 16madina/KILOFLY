import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Globe, 
  DollarSign, 
  Heart, 
  MapPin, 
  Eye, 
  FileText, 
  HelpCircle, 
  Fingerprint,
  Bell,
  Lock,
  Database,
  Trash2,
  User,
  Star,
  Users,
  AlertTriangle,
  Headphones,
  Palette,
  UserCircle,
  BadgeCheck,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, biometryType, enableBiometric, disableBiometric } = useBiometricAuth();
  const { permission, requestPermission, isSupported: pushSupported } = usePushNotifications();
  const { preferences, updatePreference, loading: prefsLoading } = useNotificationPreferences();
  
  const [darkMode, setDarkMode] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted');

  useEffect(() => {
    setPushEnabled(permission === 'granted');
  }, [permission]);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableBiometric();
      toast.success(`${biometryType} activé`);
    } else {
      await disableBiometric();
      toast.success(`${biometryType} désactivé`);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await requestPermission();
      await updatePreference('push_enabled', true);
      toast.success("Notifications push activées");
    } else {
      setPushEnabled(false);
      await updatePreference('push_enabled', false);
      toast.info("Pour désactiver complètement, allez dans les paramètres de votre appareil");
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const authData = localStorage.getItem('sb-yuhbvzjniylkruaylxzz-auth-token');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('sb-yuhbvzjniylkruaylxzz-auth-token', authData);
      }
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      toast.success("Cache vidé avec succès");
    } catch (error) {
      toast.error("Erreur lors du vidage du cache");
    } finally {
      setClearingCache(false);
    }
  };

  const handleRateApp = () => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    if (isNative) {
      if (platform === 'ios') {
        window.open('https://apps.apple.com/app/kilofly/id123456789', '_blank');
      } else if (platform === 'android') {
        window.open('https://play.google.com/store/apps/details?id=com.kilofly.app', '_blank');
      }
    } else {
      toast.info("Téléchargez l'application pour la noter");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      {/* Header */}
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

      <div className="container px-4 py-4 max-w-2xl mx-auto">
        <Accordion
          type="multiple"
          defaultValue={["personal", "verification", "security", "notifications", "privacy", "storage", "help"]}
          className="space-y-3"
        >
          
          {/* Ma page publique - Direct link */}
          {user && (
            <Link to={`/user/${user.id}`} className="block">
              <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Ma page publique</span>
                  <p className="text-sm text-muted-foreground">Voir mon profil voyageur</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          )}

          {/* Préférences */}
          <AccordionItem value="preferences" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-medium">Préférences</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <Link to="/currency-settings">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <span className="flex-1 text-left font-medium">Devise préférée</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                <Globe className="w-5 h-5 text-primary" />
                <span className="flex-1 text-left font-medium">Langue</span>
                <span className="text-muted-foreground mr-2">Français</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Mode sombre</span>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Vérification d'identité */}
          <AccordionItem value="verification" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-green-500" />
                </div>
                <span className="font-medium">Vérification d'identité</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <Link to="/verify-identity">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <BadgeCheck className="w-5 h-5 text-green-500" />
                  <div className="flex-1 text-left">
                    <span className="font-medium">Vérifier mon identité</span>
                    <p className="text-sm text-muted-foreground">Augmentez votre score de confiance</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
            </AccordionContent>
          </AccordionItem>

          {/* Sécurité du compte */}
          <AccordionItem value="security" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-500" />
                </div>
                <span className="font-medium">Sécurité du compte</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <Link to="/account-security">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left font-medium">Changer le mot de passe</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/account-security">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div className="flex-1 text-left">
                    <span className="font-medium">Authentification à deux facteurs</span>
                    <p className="text-sm text-muted-foreground">Sécurisez votre compte</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              {biometricAvailable && (
                <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-green-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Connexion {biometryType}</span>
                      <span className="text-sm text-muted-foreground">Se connecter avec {biometryType}</span>
                    </div>
                  </div>
                  <Switch checked={biometricEnabled} onCheckedChange={handleBiometricToggle} />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Notifications */}
          <AccordionItem value="notifications" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange-500" />
                </div>
                <span className="font-medium">Notifications</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              {pushSupported && (
                <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium">Notifications push</span>
                      <span className="text-sm text-muted-foreground">Alertes en temps réel</span>
                    </div>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                </div>
              )}

              <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <span>Nouveaux messages</span>
                <Switch 
                  checked={preferences.messages_enabled}
                  onCheckedChange={(checked) => updatePreference('messages_enabled', checked)}
                  disabled={prefsLoading}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <span>Réponses à mes annonces</span>
                <Switch 
                  checked={preferences.responses_enabled}
                  onCheckedChange={(checked) => updatePreference('responses_enabled', checked)}
                  disabled={prefsLoading}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <span>Alertes voyageurs</span>
                <Switch 
                  checked={preferences.alerts_enabled}
                  onCheckedChange={(checked) => updatePreference('alerts_enabled', checked)}
                  disabled={prefsLoading}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <span>Promotions / infos</span>
                <Switch 
                  checked={preferences.promotions_enabled}
                  onCheckedChange={(checked) => updatePreference('promotions_enabled', checked)}
                  disabled={prefsLoading}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Confidentialité */}
          <AccordionItem value="privacy" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                </div>
                <span className="font-medium">Confidentialité</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <Link to="/privacy-settings">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Eye className="w-5 h-5 text-purple-500" />
                  <span className="flex-1 text-left font-medium">Paramètres de confidentialité</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/privacy">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="flex-1 text-left font-medium">Politique de confidentialité</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/terms">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  <span className="flex-1 text-left font-medium">Conditions d'utilisation</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
            </AccordionContent>
          </AccordionItem>

          {/* Données et stockage */}
          <AccordionItem value="storage" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-medium">Données et stockage</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <button 
                className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={handleClearCache}
                disabled={clearingCache}
              >
                <Trash2 className="w-5 h-5 text-red-500" />
                <div className="flex-1 text-left">
                  <span className="font-medium">Vider le cache</span>
                  <p className="text-sm text-muted-foreground">Libérer de l'espace</p>
                </div>
                {clearingCache && <span className="text-sm text-muted-foreground">...</span>}
              </button>

              <Link to="/user-transactions">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left font-medium">Mes transactions</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/favorites">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="flex-1 text-left font-medium">Mes Favoris</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/route-alerts">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <span className="flex-1 text-left font-medium">Alertes de Routes</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
            </AccordionContent>
          </AccordionItem>

          {/* Support & aide */}
          <AccordionItem value="help" className="border rounded-xl px-4 bg-card/50">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="font-medium">Support & aide</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-1">
              <Link to="/faq">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <HelpCircle className="w-5 h-5 text-orange-500" />
                  <span className="flex-1 text-left font-medium">Questions fréquentes (FAQ)</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <Link to="/terms">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="flex-1 text-left font-medium">Règles de la communauté</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>

              <a href="mailto:support@kilofly.com?subject=Signalement d'un problème">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div className="flex-1 text-left">
                    <span className="font-medium">Signaler un problème</span>
                    <p className="text-sm text-muted-foreground">Nous contacter</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </a>

              <a href="mailto:support@kilofly.com">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                  <Headphones className="w-5 h-5 text-green-500" />
                  <div className="flex-1 text-left">
                    <span className="font-medium">Contacter le support</span>
                    <p className="text-sm text-muted-foreground">support@kilofly.com</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </a>

              <button 
                className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={handleRateApp}
              >
                <Star className="w-5 h-5 text-yellow-500" />
                <div className="flex-1 text-left">
                  <span className="font-medium">Noter l'application</span>
                  <p className="text-sm text-muted-foreground">Donnez-nous votre avis</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        {/* Sign Out */}
        <div className="pt-8">
          <Button 
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
