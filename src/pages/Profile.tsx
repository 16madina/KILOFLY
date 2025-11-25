import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import VerifiedBadge from "@/components/VerifiedBadge";
import { 
  ChevronLeft,
  Bell,
  Share2,
  MapPin,
  Calendar,
  Package,
  TrendingUp,
  Star,
  Users,
  CheckCircle2,
  Edit,
  Settings as SettingsIcon,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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
      .single();

    setIsAdmin(roleData?.role === 'admin');

    setStats({
      activeListings: listingsCount || 0,
      soldItems: 0, // TODO: implement sold items tracking
      averageRating: avgRating,
      followers: 0 // TODO: implement followers system
    });

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
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeListings}</p>
              <p className="text-sm text-muted-foreground">Annonces actives</p>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.soldItems}</p>
              <p className="text-sm text-muted-foreground">Articles vendus</p>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Note moyenne</p>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.followers}</p>
              <p className="text-sm text-muted-foreground">Abonnés</p>
            </div>
          </Card>
        </div>

        {/* Verification Badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {user?.email && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Email vérifié</span>
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/settings">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/settings">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Paramètres
            </Link>
          </Button>
        </div>

        {/* Admin Panel Button */}
        {isAdmin && (
          <Button 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            asChild
          >
            <Link to="/admin/verification">
              <Shield className="h-4 w-4 mr-2" />
              Panneau d'administration
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Profile;
