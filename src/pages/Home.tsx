import ListingCard from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-travel.jpg";
import montrealImg from "@/assets/destinations/montreal.jpg";
import abidjanImg from "@/assets/destinations/abidjan.jpg";
import parisImg from "@/assets/destinations/paris.jpg";
import dakarImg from "@/assets/destinations/dakar.jpg";
import torontoImg from "@/assets/destinations/toronto.jpg";
import lomeImg from "@/assets/destinations/lome.jpg";

interface Listing {
  id: string;
  user_id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  price_per_kg: number;
  destination_image: string | null;
  description: string | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const Home = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDeparture, setSearchDeparture] = useState("");
  const [searchArrival, setSearchArrival] = useState("");

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async (departure?: string, arrival?: string) => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select(`
        *,
        profiles (
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

  const handleSearch = () => {
    fetchListings(searchDeparture, searchArrival);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container py-4 flex items-center gap-3">
          <div className="rounded-lg bg-gradient-sky p-2">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-sky bg-clip-text text-transparent">
            KiloShare
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="relative container py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Partagez vos kilos,{" "}
              <span className="bg-gradient-sky bg-clip-text text-transparent">
                voyagez léger
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Connectez-vous avec des voyageurs pour utiliser leurs kilos disponibles
            </p>

            {/* Search Bar */}
            <div className="flex flex-col gap-3 mt-6 max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Ville de départ..."
                  className="pl-10 h-12 bg-card shadow-card text-base"
                  value={searchDeparture}
                  onChange={(e) => setSearchDeparture(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Destination..."
                  className="pl-10 h-12 bg-card shadow-card text-base"
                  value={searchArrival}
                  onChange={(e) => setSearchArrival(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                size="lg" 
                className="h-12 w-full bg-gradient-sky hover:opacity-90 transition-opacity text-base font-semibold"
                onClick={handleSearch}
              >
                Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Listings Section */}
      <section className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Annonces récentes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dernières offres disponibles
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement des annonces...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune annonce disponible pour le moment.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 animate-fade-in scrollbar-hide">
            {listings.map((listing) => (
              <div key={listing.id} className="flex-shrink-0 w-[280px] snap-center">
                <ListingCard
                  id={listing.id}
                  userId={listing.user_id}
                  userName={listing.profiles.full_name}
                  userAvatar={listing.profiles.avatar_url}
                  departure={listing.departure}
                  arrival={listing.arrival}
                  departureDate={formatDate(listing.departure_date)}
                  arrivalDate={formatDate(listing.arrival_date)}
                  availableKg={listing.available_kg}
                  pricePerKg={listing.price_per_kg}
                  destinationImage={listing.destination_image || getDestinationImage(listing.arrival)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
