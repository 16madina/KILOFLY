import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  HelpCircle, 
  Bell,
  Lock,
  Database,
  User,
  Palette,
  BadgeCheck,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

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
      <div className="space-y-3">
          {/* Ma page publique */}
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

          {/* Vérification d'identité */}
          <Link to="/verify-identity" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Vérification d'identité</span>
                <p className="text-sm text-muted-foreground">Augmentez votre score de confiance</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Sécurité du compte */}
          <Link to="/account-security" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Sécurité du compte</span>
                <p className="text-sm text-muted-foreground">Mot de passe, 2FA, biométrie</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Notifications */}
          <Link to="/notification-settings" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Notifications</span>
                <p className="text-sm text-muted-foreground">Gérer les alertes et notifications</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Confidentialité */}
          <Link to="/privacy-settings" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Confidentialité</span>
                <p className="text-sm text-muted-foreground">Vie privée et données personnelles</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Données et stockage */}
          <Link to="/storage-settings" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Données et stockage</span>
                <p className="text-sm text-muted-foreground">Cache, favoris, transactions</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Support & aide */}
          <Link to="/help" className="block">
            <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <span className="font-medium">Support & aide</span>
                <p className="text-sm text-muted-foreground">FAQ, contact, signalement</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {/* Préférences */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Préférences</h3>
            
            <Link to="/currency-settings" className="block">
              <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Devise préférée</span>
                  <p className="text-sm text-muted-foreground">Choisir la devise de référence</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>

            <button className="w-full mt-3 border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium">Langue</span>
                <p className="text-sm text-muted-foreground">Français</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="mt-3 border rounded-xl px-4 py-4 bg-card/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <span className="font-medium">Mode sombre</span>
                  <p className="text-sm text-muted-foreground">Thème de l'application</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>

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
    </div>
  );
};

export default Settings;
