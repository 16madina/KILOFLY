import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Search } from "lucide-react";
import { MyListingsEmbed } from "@/components/profile/MyListingsEmbed";
import { MyTransportRequestsEmbed } from "@/components/profile/MyTransportRequestsEmbed";
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
              
              {/* Modifier profil button */}
              {profile.id_verified ? (
                <label className="mt-3 flex items-center gap-1.5 text-sm text-primary font-medium cursor-pointer hover:underline">
                  <Camera className="h-4 w-4" />
                  <span>Modifier profil</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground text-center max-w-[112px]">
                  📷 Photo modifiable après vérification
                </p>
              )}
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

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-border/50">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-lg font-bold">{stats.activeListings}</p>
              <p className="text-[10px] text-muted-foreground text-center">Annonces</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-bold">{stats.soldItems}</p>
              <p className="text-[10px] text-muted-foreground text-center">Vendus</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-lg font-bold">{stats.averageRating.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground text-center">Note</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-lg font-bold">{stats.followers}</p>
              <p className="text-[10px] text-muted-foreground text-center">Abonnés</p>
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
          <TabsList className="grid w-full grid-cols-4 h-12 backdrop-blur-xl bg-card/70 border border-white/20 dark:border-white/10">
            <TabsTrigger value="annonces" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-4 w-4 mr-1" />
              Annonces
            </TabsTrigger>
            <TabsTrigger value="reservations" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarCheck className="h-4 w-4 mr-1" />
              RDV
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="h-4 w-4 mr-1" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="parametres" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <SettingsIcon className="h-4 w-4 mr-1" />
              Paramètres
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
            <Tabs defaultValue="voyages-rdv" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-10">
                <TabsTrigger value="voyages-rdv" className="text-xs gap-1.5">
                  <Plane className="h-3.5 w-3.5" />
                  Mes voyages
                </TabsTrigger>
                <TabsTrigger value="recherches-rdv" className="text-xs gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Mes recherches
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="voyages-rdv" className="space-y-2">
                <Link to="/my-reservations?type=seller">
                  <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                        <CalendarCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <span className="font-medium">RDV sur mes voyages</span>
                        <p className="text-xs text-muted-foreground">Demandes reçues pour vos trajets</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
                
                <Link to="/route-alerts">
                  <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <span className="font-medium">Alertes de trajet</span>
                        <p className="text-xs text-muted-foreground">Notifications sur vos routes favorites</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
              </TabsContent>
              
              <TabsContent value="recherches-rdv" className="space-y-2">
                <Link to="/my-reservations?type=buyer">
                  <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        <CalendarCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="font-medium">RDV sur mes recherches</span>
                        <p className="text-xs text-muted-foreground">Vos réservations chez les voyageurs</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab: Mes transactions */}
          <TabsContent value="transactions" className="mt-4">
            <Tabs defaultValue="voyages-trans" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-10">
                <TabsTrigger value="voyages-trans" className="text-xs gap-1.5">
                  <Plane className="h-3.5 w-3.5" />
                  Mes voyages
                </TabsTrigger>
                <TabsTrigger value="recherches-trans" className="text-xs gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Mes recherches
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="voyages-trans" className="space-y-2">
                <Link to="/user-transactions?type=seller">
                  <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <span className="font-medium">Revenus (voyageur)</span>
                        <p className="text-xs text-muted-foreground">Paiements reçus pour vos transports</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
              </TabsContent>
              
              <TabsContent value="recherches-trans" className="space-y-2">
                <Link to="/user-transactions?type=buyer">
                  <Card className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="font-medium">Dépenses (expéditeur)</span>
                        <p className="text-xs text-muted-foreground">Paiements effectués pour vos colis</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4">
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
            </div>
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

            {/* Déconnexion */}
            <Card 
              className="p-4 flex items-center justify-between hover:bg-destructive/10 transition-colors cursor-pointer backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10"
              onClick={handleSignOut}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <span className="font-medium text-destructive">Déconnexion</span>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
