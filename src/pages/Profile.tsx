import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";
import { 
  ChevronLeft,
  ChevronRight,
  Bell,
  Share2,
  MapPin,
  Calendar,
  Package,
  TrendingUp,
  Star,
  Users,
  CheckCircle2,
  User,
  ShieldCheck,
  Receipt,
  Shield,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  CalendarCheck,
  AlertCircle,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useTrustScoreNotifications } from "@/hooks/useTrustScoreNotifications";

interface Profile {
  full_name: string;
  avatar_url: string;
  country: string;
  city: string;
  created_at: string;
  id_verified: boolean;
  phone_verified: boolean;
  response_rate: number | null;
  completed_trips: number | null;
}

interface Stats {
  activeListings: number;
  soldItems: number;
  averageRating: number;
  followers: number;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    activeListings: 0,
    soldItems: 0,
    averageRating: 0,
    followers: 0
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Hook pour les notifications de score de confiance
  useTrustScoreNotifications(trustScore);

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
      .select('full_name, avatar_url, country, city, created_at, id_verified, phone_verified, response_rate, completed_trips')
      .eq('id', user.id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement du profil");
      console.error(error);
    } else {
      setProfile(data);
    }

    // Fetch active listings count
    const { count: listingsCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Fetch reviews stats
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', user.id);

    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!roleData);

    setStats({
      activeListings: listingsCount || 0,
      soldItems: 0, // TODO: implement sold items tracking
      averageRating: avgRating,
      followers: 0 // TODO: implement followers system
    });

    // Calculate trust score
    let calculatedScore = 0;
    if (data.id_verified) calculatedScore += 30;
    if (data.phone_verified) calculatedScore += 20;
    calculatedScore += (data.completed_trips || 0) * 2;
    calculatedScore += (avgRating / 5) * 30;
    calculatedScore += ((data.response_rate || 0) / 100) * 20;
    setTrustScore(Math.min(100, Math.round(calculatedScore)));

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleResendVerificationEmail = async () => {
    if (!user?.email) return;
    
    setResendingEmail(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`
      }
    });
    
    if (error) {
      toast.error("Erreur lors de l'envoi de l'email");
    } else {
      toast.success("Email de vérification envoyé ! Vérifiez votre boîte de réception.");
    }
    
    setResendingEmail(false);
  };

  const isVerificationIncomplete = () => {
    const emailVerified = user?.email_confirmed_at != null;
    const idVerified = profile?.id_verified || false;
    return !emailVerified || !idVerified;
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
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Verification Incomplete Alert */}
        {isVerificationIncomplete() && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Complétez votre vérification
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Finalisez les étapes de vérification pour débloquer toutes les fonctionnalités de KiloFly.
                  </p>
                  <Button
                    onClick={() => navigate('/onboarding')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Continuer la vérification
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Profile Avatar with Badge */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {profile.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {profile.id_verified && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 border-4 border-background">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          
          {/* Trust Score Badge */}
          <div className="flex justify-center py-2">
            <button onClick={() => navigate('/trust-score-info')} className="transition-transform hover:scale-105">
              <TrustScore score={trustScore} />
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{profile.city}, {profile.country}</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Membre depuis {formatDistanceToNow(new Date(profile.created_at), { addSuffix: false, locale: fr })}</span>
          </div>
        </div>

        {/* Current Location Card */}
        <Card className="p-4 text-center bg-muted/50">
          <p className="text-sm text-muted-foreground italic">{profile.city}, {profile.country}</p>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.activeListings}</p>
                <p className="text-xs text-muted-foreground">Annonces actives</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.soldItems}</p>
                <p className="text-xs text-muted-foreground">Articles vendus</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Note moyenne</p>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.followers}</p>
                <p className="text-xs text-muted-foreground">Abonnés</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Verification Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {user?.email_confirmed_at ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Email vérifié</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm justify-center">
                <AlertCircle className="h-4 w-4" />
                <span>Email non vérifié</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerificationEmail}
                disabled={resendingEmail}
                className="w-full"
              >
                {resendingEmail ? "Envoi..." : "Renvoyer l'email"}
              </Button>
            </div>
          )}
          {profile.phone_verified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Téléphone vérifié</span>
            </div>
          )}
          {profile.id_verified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Identité vérifiée</span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-2">
          {/* Informations personnelles */}
          <Link to="/settings">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">Informations personnelles</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Vérification */}
          <Card className="p-4">
            <button
              onClick={() => setVerificationExpanded(!verificationExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">Vérification</span>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${verificationExpanded ? 'rotate-90' : ''}`} />
            </button>
            
            {verificationExpanded && (
              <div className="mt-4 space-y-3 pl-13">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Je suis voyageur</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Je suis transitaire professionnel</span>
                  <Switch />
                </div>
                <button className="w-full text-left text-sm text-primary hover:underline">
                  Je veux envoyer un colis
                </button>
              </div>
            )}
          </Card>

          {/* Mes annonces */}
          <Link to="/my-listings">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-medium">Mes annonces</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Mes transactions */}
          <Link to="/user-transactions">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium">Mes transactions</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Mes réservations */}
          <Link to="/my-reservations">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="font-medium">Mes réservations</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Sécurité du compte */}
          <Link to="/account-security">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-medium">Sécurité du compte</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Paramètres */}
          <Link to="/settings">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="font-medium">Paramètres</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Support & aide */}
          <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="font-medium">Support & aide</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>

          {/* Identity Verification */}
          <Link to="/verify-identity">
            <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Vérification d'identité</span>
                  {!profile.id_verified && (
                    <span className="text-xs text-muted-foreground">🤖 Vérification automatique IA</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>

          {/* Admin Panel Button */}
          {isAdmin && (
            <Link to="/admin">
              <Card className="p-4 flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 transition-opacity cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Panneau d'Administration</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
