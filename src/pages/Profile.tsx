import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronLeft,
  ChevronRight,
  User, 
  Shield, 
  Package,
  Truck,
  HelpCircle,
  Settings as SettingsIcon,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  avatar_url: string;
  country: string;
  city: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTraveler, setIsTraveler] = useState(false);
  const [isForwarder, setIsForwarder] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, country, city')
      .eq('id', user.id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement du profil");
      console.error(error);
    } else {
      setProfile(data);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p className="text-muted-foreground">Profil introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container flex items-center justify-center py-4 relative max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="absolute left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Kilofly</h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {profile.country} · {profile.city}
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full mb-6">
          Editer profil
        </Button>

        {/* Navigation List */}
        <div className="space-y-1">
          {/* Informations personnelles */}
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <User className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left">Informations personnelles</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Vérification */}
          <div>
            <button 
              onClick={() => setShowVerification(!showVerification)}
              className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors"
            >
              <Shield className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Vérification</span>
              <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showVerification ? 'rotate-90' : ''}`} />
            </button>
            
            {showVerification && (
              <div className="pl-12 pr-4 py-2 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Je suis voyageur</span>
                  <Switch checked={isTraveler} onCheckedChange={setIsTraveler} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Je suis transitaire professionnel</span>
                  <Switch checked={isForwarder} onCheckedChange={setIsForwarder} />
                </div>
                <button className="w-full flex items-center justify-between py-2 hover:bg-accent rounded transition-colors">
                  <span className="text-sm">Je veux envoyer un colis</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Mes annonces */}
          <Link to="/my-listings">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <Package className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Mes annonces</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Mes transactions */}
          <Link to="/my-transactions">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <Truck className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Mes transactions</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Sécurité du compte */}
          <Link to="/account-security">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <Shield className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Sécurité du compte</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Paramètres */}
          <Link to="/settings">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Paramètres</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>

          {/* Support & aide */}
          <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left">Support & aide</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Documents */}
          <Link to="/prohibited-items">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-accent rounded-lg transition-colors">
              <FileText className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left">Documents</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
