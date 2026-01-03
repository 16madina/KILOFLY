import AnimatedListingCard from "@/components/mobile/AnimatedListingCard";
import Navbar from "@/components/Navbar";
import { SkeletonShimmer } from "@/components/ui/skeleton-shimmer";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, CreditCard, Package, Users, TrendingUp, Plus, Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import heroImage from "@/assets/hero-travel.jpg";
import montrealImg from "@/assets/destinations/montreal.jpg";
import abidjanImg from "@/assets/destinations/abidjan.jpg";
import parisImg from "@/assets/destinations/paris.jpg";
import dakarImg from "@/assets/destinations/dakar.jpg";
import torontoImg from "@/assets/destinations/toronto.jpg";
import lomeImg from "@/assets/destinations/lome.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SearchFlow } from "@/components/SearchFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportRequestsList } from "@/components/transport-requests/TransportRequestsList";

interface Listing {
  id: string;
  user_id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  real_available_kg: number | null;
  price_per_kg: number;
  currency?: string;
  destination_image: string | null;
  description: string | null;
  allowed_items: unknown;
  prohibited_items: unknown;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const Home = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ totalTrips: 0, totalMembers: 0 });
  const [currentSearch, setCurrentSearch] = useState({ departure: "", arrival: "" });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
    fetchStats();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { count: tripsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');

      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalTrips: tripsCount || 0,
        totalMembers: membersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const favoriteIds = new Set(data?.map(f => f.listing_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error('Connectez-vous pour sauvegarder des favoris');
      navigate('/auth');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (error) throw error;

        const newFavorites = new Set(favorites);
        newFavorites.delete(listingId);
        setFavorites(newFavorites);
        toast.success('Retiré des favoris');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId,
          });

        if (error) throw error;

        const newFavorites = new Set(favorites);
        newFavorites.add(listingId);
        setFavorites(newFavorites);
        toast.success('Ajouté aux favoris');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const fetchListings = async (departure?: string, arrival?: string) => {
    setLoading(true);
    
    // Use the view that calculates real available kg
    let query = supabase
      .from("listings_with_available_kg")
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq("status", "active");

    if (departure) {
      query = query.ilike("departure", `%${departure}%`);
    }
    if (arrival) {
      query = query.ilike("arrival", `%${arrival}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const handleSearch = (departure: string, arrival: string) => {
    setCurrentSearch({ departure, arrival });
    fetchListings(departure, arrival);
  };

  const handleRefresh = async () => {
    await fetchListings(currentSearch.departure, currentSearch.arrival);
  };

  const getDestinationImage = (city: string) => {
    const cityMap: Record<string, string> = {
      "Abidjan": abidjanImg,
      "Dakar": dakarImg,
      "Lomé": lomeImg,
      "Lome": lomeImg,
      "Paris": parisImg,
      "Toronto": torontoImg,
      "Montréal": montrealImg,
      "Montreal": montrealImg,
    };
    return cityMap[city] || abidjanImg;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-32">
        <Navbar />

        {/* Stats Bar */}
        <div className="bg-gradient-sky text-white py-3">
          <div className="container px-4 sm:px-6">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">{stats.totalTrips}+ voyages réussis</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{stats.totalMembers}+ membres actifs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>
          
          <div className="relative container px-4 sm:px-6 py-12 md:py-20">
            {/* Post Listing Button */}
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => navigate('/post-listing')}
                className="bg-gradient-sky hover:opacity-90 transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Poster une annonce
              </Button>
            </div>

            <div className="max-w-3xl mx-auto text-center space-y-4 animate-fade-in">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Partagez vos kilos,{" "}
                <span className="bg-gradient-sky bg-clip-text text-transparent">
                  voyagez léger
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Connectez-vous avec des voyageurs pour utiliser leurs kilos disponibles
              </p>

              {/* Search Flow */}
              <div className="mt-6 max-w-lg mx-auto">
                <SearchFlow onSearch={handleSearch} />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="container px-4 sm:px-6 py-6 -mt-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="py-1 px-2 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Voyageurs vérifiés
            </Badge>
            <Badge variant="secondary" className="py-1 px-2 text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              Paiement sécurisé
            </Badge>
            <Badge variant="secondary" className="py-1 px-2 text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              5% seulement
            </Badge>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center gap-4 sm:gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center flex-1">
              <div className="mb-2 p-2 bg-gradient-sky rounded-full">
                <Search className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold mb-1">1. Rechercher</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Trouvez un voyageur qui part vers votre destination
              </p>
            </div>

            <div className="flex flex-col items-center text-center flex-1">
              <div className="mb-2 p-2 bg-gradient-sky rounded-full">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold mb-1">2. Réserver & Payer</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Réservez les kilos et payez en toute sécurité
              </p>
            </div>

            <div className="flex flex-col items-center text-center flex-1">
              <div className="mb-2 p-2 bg-gradient-sky rounded-full">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold mb-1">3. Recevoir</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Récupérez vos colis à destination en toute tranquillité
              </p>
            </div>
          </div>
        </section>

        {/* Currency Converter Button */}
        <section className="container px-4 sm:px-6 py-4">
          <div className="flex justify-start">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 animate-pulse hover:animate-none shadow-lg hover:shadow-xl transition-all duration-300 border-primary/50 hover:border-primary"
                >
                  <TrendingUp className="h-4 w-4" />
                  Calculateur de devises
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <CurrencyConverter />
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Main Tabs Section */}
        <section className="container px-4 sm:px-6 py-8">
          <Tabs defaultValue="listings" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="listings" className="gap-2">
                <Plane className="h-4 w-4" />
                Annonces
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <Search className="h-4 w-4" />
                Je recherche
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings" className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Annonces récentes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Dernières offres disponibles
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-card shadow-card">
                      <SkeletonShimmer className="h-48 w-full rounded-none" />
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <SkeletonShimmer className="h-10 w-10 rounded-full" />
                          <SkeletonShimmer className="h-4 w-32" />
                        </div>
                        <SkeletonShimmer className="h-4 w-full" />
                        <SkeletonShimmer className="h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <p className="text-muted-foreground">Aucune annonce disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings
                    .filter(listing => listing.profiles !== null)
                    .slice(0, 6)
                    .map((listing, index) => (
                      <AnimatedListingCard
                        key={listing.id}
                        id={listing.id}
                        userId={listing.user_id}
                        userName={listing.profiles?.full_name || 'Utilisateur'}
                        userAvatar={listing.profiles?.avatar_url || ''}
                        departure={listing.departure}
                        arrival={listing.arrival}
                        departureDate={formatDate(listing.departure_date)}
                        arrivalDate={formatDate(listing.arrival_date)}
                        availableKg={listing.real_available_kg ?? listing.available_kg}
                        originalKg={listing.available_kg}
                        pricePerKg={listing.price_per_kg}
                        currency={listing.currency}
                        destinationImage={listing.destination_image || getDestinationImage(listing.arrival)}
                        isFavorited={favorites.has(listing.id)}
                        onFavoriteToggle={() => handleToggleFavorite(listing.id)}
                        allowedItems={listing.allowed_items as string[] || []}
                        prohibitedItems={listing.prohibited_items as string[] || []}
                        description={listing.description || undefined}
                        index={index}
                      />
                    ))}
                </div>
              )}
              
              {!loading && listings.length > 6 && (
                <div className="mt-6 text-center">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    Voir toutes les annonces
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Transport Requests Tab */}
            <TabsContent value="requests">
              <TransportRequestsList />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </PullToRefresh>
  );
};

export default Home;