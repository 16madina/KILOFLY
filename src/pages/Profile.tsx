import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Search, Bookmark, X } from "lucide-react";
import { MyListingsEmbed } from "@/components/profile/MyListingsEmbed";
import { MyTransportRequestsEmbed } from "@/components/profile/MyTransportRequestsEmbed";
import { MyReservationsEmbed } from "@/components/profile/MyReservationsEmbed";
import { MyTripsReservationsEmbed } from "@/components/profile/MyTripsReservationsEmbed";
import { MyCancelledReservationsEmbed } from "@/components/profile/MyCancelledReservationsEmbed";
import { MyTransactionsEmbed } from "@/components/profile/MyTransactionsEmbed";
import WalletCard from "@/components/wallet/WalletCard";
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
  Camera,
  Wallet,
  Lock,
  Globe,
  Palette,
  LogOut,
  Info
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

// Public Listings View for non-authenticated users
const PublicListingsView = ({ onNavigateToAuth }: { onNavigateToAuth: () => void }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPublicListings = async () => {
      const { data, error } = await supabase
        .from("listings_with_available_kg")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    };

    fetchPublicListings();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b pt-safe">
        <div className="container flex items-center justify-between py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Découvrir les annonces</h1>
          <Button
            onClick={onNavigateToAuth}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent"
          >
            Connexion
          </Button>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-4xl mx-auto">
        {/* Info Card */}
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Bienvenue sur KiloFly !</h3>
              <p className="text-xs text-muted-foreground">
                Créez un compte pour contacter les voyageurs et réserver des kilos.
              </p>
            </div>
          </div>
        </Card>

        {/* Listings Grid */}
        <h2 className="text-xl font-bold mb-4">Annonces disponibles</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-32 bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune annonce disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings
              .filter(listing => listing.profiles !== null)
              .map((listing) => (
                <Card 
                  key={listing.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Plane className="h-8 w-8 text-primary/40" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {listing.profiles?.avatar_url ? (
                          <img src={listing.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{listing.profiles?.full_name || 'Utilisateur'}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">
                      {listing.departure} → {listing.arrival}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatDate(listing.departure_date)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {listing.real_available_kg ?? listing.available_kg} kg
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {listing.price_per_kg} {listing.currency || 'EUR'}/kg
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={onNavigateToAuth}
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            Créer un compte gratuit
          </Button>
        </div>
      </div>
    </div>
  );
};

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Hook pour les notifications de score de confiance
  useTrustScoreNotifications(trustScore);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

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
      soldItems: 0,
      averageRating: avgRating,
      followers: 0
    });

    // Calculate trust score with new system
    let calculatedScore = 0;
    calculatedScore += 5; // Inscription (signup)
    if (user?.email_confirmed_at) calculatedScore += 5; // Email verified
    if (data.id_verified) calculatedScore += 5; // ID verified
    if (data.phone_verified) calculatedScore += 5; // Phone verified
    calculatedScore += (data.completed_trips || 0) * 2; // 2pts per completed trip
    setTrustScore(calculatedScore);

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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast.success("Photo de profil mise à jour !");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploadingAvatar(false);
    }
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

  // If user is not logged in, show public listings view
  if (!user || !profile) {
    return <PublicListingsView onNavigateToAuth={() => navigate('/auth')} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pt-safe">
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

        {/* Profile Card with Glassmorphism */}
        <Card className="p-5 backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10 shadow-xl">
          <div className="flex gap-5">
            {/* Large Square Avatar with Diagonal Banner */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-primary-foreground text-3xl font-bold">
                        {profile.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Diagonal Verified Banner */}
                  {profile.id_verified && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-[14px] -right-[32px] w-[120px] bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] font-bold py-1 text-center transform rotate-45 shadow-md uppercase tracking-wider">
                        Vérifié
                      </div>
                    </div>
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              
              {/* Action buttons under avatar */}
              <div className="mt-3 flex flex-col gap-1.5 items-center">
                {profile.id_verified ? (
                  <label className="flex items-center gap-1.5 text-sm text-primary font-medium cursor-pointer hover:underline">
                    <Camera className="h-4 w-4" />
                    <span>Modifier</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground text-center max-w-[112px]">
                    📷 Après vérification
                  </p>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-destructive font-medium cursor-pointer hover:underline"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Déconnexion</span>
                </button>
                
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium cursor-pointer hover:underline"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </button>
                )}
              </div>
            </div>

            {/* User Info on Right */}
            <div className="flex-1 flex flex-col justify-center space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{profile.full_name}</h1>
                <button 
                  onClick={() => navigate('/trust-score-info')}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  title="Comprendre le score de confiance"
                >
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{profile.city}, {profile.country}</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>Membre depuis {formatDistanceToNow(new Date(profile.created_at), { addSuffix: false, locale: fr })}</span>
              </div>

              {/* Trust Score */}
              <button onClick={() => navigate('/my-rewards')} className="w-fit transition-transform hover:scale-105 mt-1">
                <TrustScore score={trustScore} />
              </button>
            </div>
          </div>

          {/* Verification Badges */}
          <div className="flex flex-wrap gap-2 justify-center mt-4 pt-4 border-t border-border/50">
            {user?.email_confirmed_at ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Email</span>
              </div>
            ) : (
              <button 
                onClick={handleResendVerificationEmail}
                disabled={resendingEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs hover:opacity-80"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{resendingEmail ? "Envoi..." : "Email non vérifié"}</span>
              </button>
            )}
            {profile.phone_verified && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Téléphone</span>
              </div>
            )}
            {profile.id_verified && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Identité</span>
              </div>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="annonces" className="w-full">
          {/* Tabs styled like stats grid */}
          <TabsList className="grid w-full grid-cols-4 gap-3 p-4 h-auto rounded-xl backdrop-blur-xl bg-card/70 border border-white/20 dark:border-white/10">
            <TabsTrigger 
              value="annonces" 
              className="flex flex-col items-center gap-2 py-3 px-1 h-auto rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:shadow-none transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center transition-transform group-data-[state=active]:scale-110">
                <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-xs font-medium text-muted-foreground data-[state=active]:text-foreground">Annonces</p>
            </TabsTrigger>

            <TabsTrigger 
              value="reservations" 
              className="flex flex-col items-center gap-2 py-3 px-1 h-auto rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:shadow-none transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-medium text-muted-foreground data-[state=active]:text-foreground">RDV</p>
            </TabsTrigger>

            <TabsTrigger 
              value="transactions" 
              className="flex flex-col items-center gap-2 py-3 px-1 h-auto rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:shadow-none transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-xs font-medium text-muted-foreground data-[state=active]:text-foreground">Transactions</p>
            </TabsTrigger>

            <TabsTrigger 
              value="parametres" 
              className="flex flex-col items-center gap-2 py-3 px-1 h-auto rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:shadow-none transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <SettingsIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-medium text-muted-foreground data-[state=active]:text-foreground">Paramètres</p>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Mes annonces */}
          <TabsContent value="annonces" className="mt-4">
            <Tabs defaultValue="voyages" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-10">
                <TabsTrigger value="voyages" className="text-xs gap-1.5">
                  <Plane className="h-3.5 w-3.5" />
                  Mes voyages
                </TabsTrigger>
                <TabsTrigger value="recherches" className="text-xs gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Mes recherches
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="voyages">
                <MyListingsEmbed />
              </TabsContent>
              
              <TabsContent value="recherches">
                <MyTransportRequestsEmbed />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab: Mes rendez-vous / réservations */}
          <TabsContent value="reservations" className="mt-4">
            <Tabs defaultValue="mes-reservations" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 h-10">
                <TabsTrigger value="mes-reservations" className="text-xs gap-1">
                  <Bookmark className="h-3.5 w-3.5" />
                  Réservations
                </TabsTrigger>
                <TabsTrigger value="mes-trajets" className="text-xs gap-1">
                  <Plane className="h-3.5 w-3.5" />
                  Trajets
                </TabsTrigger>
                <TabsTrigger value="annulees" className="text-xs gap-1">
                  <X className="h-3.5 w-3.5" />
                  Annulées
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="mes-reservations">
                <MyReservationsEmbed />
              </TabsContent>
              
              <TabsContent value="mes-trajets">
                <MyTripsReservationsEmbed />
              </TabsContent>
              
              <TabsContent value="annulees">
                <MyCancelledReservationsEmbed />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab: Mes transactions */}
          <TabsContent value="transactions" className="mt-4 space-y-4">
            {/* Wallet Card */}
            <WalletCard />
            
            <MyTransactionsEmbed />
            
            <Link to="/currency-settings">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="font-medium">Devise préférée</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          </TabsContent>

          {/* Tab: Paramètres */}
          <TabsContent value="parametres" className="mt-4 space-y-2">
            {/* Informations personnelles */}
            <Link to="/settings">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
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
            <Card className="p-4 backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
              <button
                onClick={() => setVerificationExpanded(!verificationExpanded)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium">Type d'utilisateur</span>
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

            {/* Identity Verification */}
            <Link to="/verify-identity">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
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

            {/* Sécurité du compte */}
            <Link to="/account-security">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-medium">Sécurité du compte</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            {/* Confidentialité */}
            <Link to="/privacy-settings">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="font-medium">Confidentialité</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

            {/* Support & aide */}
            <Link to="/faq">
              <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="font-medium">Support & aide</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
