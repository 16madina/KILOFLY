import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Weight, 
  Star, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Plane,
  MessageCircle,
  TrendingUp,
  ArrowRight,
  MoreVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReportDialog } from "@/components/ReportDialog";
import { BlockUserDialog } from "@/components/BlockUserDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string | null;
  city: string;
  country: string;
  id_verified: boolean;
  phone_verified: boolean;
  completed_trips: number;
  response_rate: number;
  avg_response_time: number | null;
  created_at: string;
}

interface Listing {
  id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  price_per_kg: number;
  currency: string;
  status: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
  };
  listing: {
    departure: string;
    arrival: string;
  };
}

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [trustScore, setTrustScore] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProfileData();
    }
  }, [id]);

  const fetchProfileData = async () => {
    if (!id) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        toast.error("Profil introuvable");
        navigate('/');
        return;
      }

      setProfile(profileData);

      // Fetch active listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', id)
        .eq('status', 'active')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:reviewer_id (full_name, avatar_url),
          listing:listing_id (departure, arrival)
        `)
        .eq('reviewed_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      
      const formattedReviews = (reviewsData || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer: r.reviewer || { full_name: 'Utilisateur', avatar_url: '' },
        listing: r.listing || { departure: '', arrival: '' }
      }));
      
      setReviews(formattedReviews);

      // Calculate average rating
      if (formattedReviews.length > 0) {
        const avg = formattedReviews.reduce((sum, r) => sum + r.rating, 0) / formattedReviews.length;
        setAverageRating(avg);
      }

      // Calculate trust score
      let calculatedScore = 0;
      if (profileData.id_verified) calculatedScore += 30;
      if (profileData.phone_verified) calculatedScore += 20;
      calculatedScore += (profileData.completed_trips || 0) * 2;
      if (formattedReviews.length > 0) {
        const avgRating = formattedReviews.reduce((sum, r) => sum + r.rating, 0) / formattedReviews.length;
        calculatedScore += (avgRating / 5) * 30;
      }
      calculatedScore += ((profileData.response_rate || 0) / 100) * 20;
      setTrustScore(Math.min(100, Math.round(calculatedScore)));

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profil introuvable</p>
      </div>
    );
  }

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr });

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 transition-all duration-200 hover:scale-110"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Profil public</h1>
          </div>
          
          {/* Report/Block Menu - only show if not viewing own profile */}
          {user && id && user.id !== id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <ReportDialog
                    reportedUserId={id}
                    reportedUserName={profile?.full_name || "Utilisateur"}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <BlockUserDialog
                    userId={id}
                    userName={profile?.full_name || "Utilisateur"}
                    isBlocked={isBlocked}
                    onBlockChange={() => setIsBlocked(!isBlocked)}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{profile.full_name}</h2>
                  <VerifiedBadge verified={profile.id_verified} size="sm" />
                </div>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  {profile.city}, {profile.country}
                </div>
                
                <TrustScore score={trustScore} />
              </div>
            </div>
          </div>
          
          <CardContent className="p-4">
            {profile.bio && (
              <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-primary mb-1">
                  <Plane className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">{profile.completed_trips || 0}</p>
                <p className="text-xs text-muted-foreground">Voyages</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <p className="text-2xl font-bold">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{reviews.length} avis</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">{profile.response_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">Réponse</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {profile.id_verified && (
                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Identité vérifiée
                </Badge>
              )}
              {profile.phone_verified && (
                <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Téléphone vérifié
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Membre depuis {memberSince}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Listings and Reviews */}
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listings" className="gap-2">
              <Plane className="h-4 w-4" />
              Voyages ({listings.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              Avis ({reviews.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="listings" className="space-y-4 mt-4">
            {listings.length === 0 ? (
              <Card className="p-6 text-center">
                <Plane className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun voyage à venir</p>
              </Card>
            ) : (
              listings.map((listing) => (
                <Link key={listing.id} to={`/listing/${listing.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{listing.departure}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.arrival}</span>
                      </div>
                      <Badge variant="secondary">
                        {listing.price_per_kg} {listing.currency}/kg
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(listing.departure_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Weight className="h-4 w-4" />
                        {listing.available_kg} kg disponibles
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {reviews.length === 0 ? (
              <Card className="p-6 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun avis pour le moment</p>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewer.avatar_url} />
                      <AvatarFallback>
                        {review.reviewer.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{review.reviewer.full_name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-muted-foreground/30'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      
                      {review.listing.departure && review.listing.arrival && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Trajet: {review.listing.departure} → {review.listing.arrival}
                        </p>
                      )}
                      
                      {review.comment && (
                        <p className="text-sm text-foreground">{review.comment}</p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(review.created_at), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublicProfile;
