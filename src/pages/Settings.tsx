import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  MessageCircle,
  Users,
  AlertTriangle,
  Headphones
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, biometryType, enableBiometric, disableBiometric } = useBiometricAuth();
  const { permission, requestPermission, isSupported: pushSupported } = usePushNotifications();
  
  const [notifications, setNotifications] = useState({
    messages: true,
    responses: true,
    alerts: true,
    promotions: false,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted');
  const [clearingCache, setClearingCache] = useState(false);

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
      toast.success("Notifications push activées");
    } else {
      setPushEnabled(false);
      toast.info("Pour désactiver complètement, allez dans les paramètres de votre appareil");
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      // Clear localStorage except auth data
      const authData = localStorage.getItem('sb-yuhbvzjniylkruaylxzz-auth-token');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('sb-yuhbvzjniylkruaylxzz-auth-token', authData);
      }
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear caches if available
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
        // iOS App Store URL
        window.open('https://apps.apple.com/app/kilofly/id123456789', '_blank');
      } else if (platform === 'android') {
        // Google Play Store URL
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
        {/* Notifications Push */}
        {pushSupported && (
          <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">Notifications push</span>
                <span className="text-sm text-muted-foreground">
                  Recevoir des alertes en temps réel
                </span>
              </div>
            </div>
            <Switch 
              checked={pushEnabled}
              onCheckedChange={handlePushToggle}
            />
          </div>
        )}

        {/* Security */}
        <Link to="/account-security">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Shield className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left font-medium">Sécurité</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Link>

        {/* Two Factor Authentication */}
        <Link to="/account-security">
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Lock className="w-5 h-5 text-amber-500" />
            <div className="flex-1 text-left">
              <span className="font-medium">Authentification à deux facteurs</span>
              <p className="text-sm text-muted-foreground">Sécurisez votre compte</p>
            </div>
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

        {/* Storage Section */}
        <div className="space-y-1">
          <h3 className="font-semibold px-4 py-2 text-muted-foreground text-sm uppercase tracking-wide">Stockage et données</h3>
          
          <button 
            className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors"
            onClick={handleClearCache}
            disabled={clearingCache}
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <div className="flex-1 text-left">
              <span className="font-medium">Vider le cache</span>
              <p className="text-sm text-muted-foreground">Libérer de l'espace de stockage</p>
            </div>
            {clearingCache && <span className="text-sm text-muted-foreground">...</span>}
          </button>
          
          <div className="flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <Database className="w-5 h-5 text-blue-500" />
            <div className="flex-1 text-left">
              <span className="font-medium">Gérer le stockage</span>
              <p className="text-sm text-muted-foreground">Photos et fichiers téléchargés</p>
            </div>
          </div>
        </div>

        {/* My Public Page */}
        {user && (
          <Link to={`/user/${user.id}`}>
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <User className="w-5 h-5 text-indigo-500" />
              <div className="flex-1 text-left">
                <span className="font-medium">Ma page publique</span>
                <p className="text-sm text-muted-foreground">Voir mon profil voyageur</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
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

        {/* Rate App */}
        <button 
          className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors"
          onClick={handleRateApp}
        >
          <Star className="w-5 h-5 text-yellow-500" />
          <div className="flex-1 text-left">
            <span className="font-medium">Noter l'application</span>
            <p className="text-sm text-muted-foreground">Donnez-nous votre avis</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Help Center Section */}
        <div className="space-y-1">
          <h3 className="font-semibold px-4 py-2 text-muted-foreground text-sm uppercase tracking-wide">Centre d'aide</h3>
          
          {/* FAQ */}
          <Link to="/faq">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              <span className="flex-1 text-left font-medium">Questions fréquentes (FAQ)</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Community Guidelines */}
          <Link to="/terms">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="flex-1 text-left font-medium">Règles de la communauté</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Report Problem */}
          <a href="mailto:support@kilofly.com?subject=Signalement d'un problème">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div className="flex-1 text-left">
                <span className="font-medium">Signaler un problème</span>
                <p className="text-sm text-muted-foreground">Nous contacter par email</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </a>

          {/* Support */}
          <a href="mailto:support@kilofly.com">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <Headphones className="w-5 h-5 text-green-500" />
              <div className="flex-1 text-left">
                <span className="font-medium">Contacter le support</span>
                <p className="text-sm text-muted-foreground">support@kilofly.com</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </a>
        </div>

        {/* Legal Section */}
        <div className="space-y-1">
          <h3 className="font-semibold px-4 py-2 text-muted-foreground text-sm uppercase tracking-wide">Légal</h3>
          
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
        </div>

        {/* Language */}
        <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
          <Globe className="w-5 h-5 text-primary" />
          <span className="flex-1 text-left font-medium">Langue</span>
          <span className="text-muted-foreground mr-2">Français</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h3 className="font-semibold px-4">Préférences de notifications</h3>
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
