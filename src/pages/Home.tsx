import ListingCard from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plane } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";
import montrealImg from "@/assets/destinations/montreal.jpg";
import abidjanImg from "@/assets/destinations/abidjan.jpg";
import parisImg from "@/assets/destinations/paris.jpg";
import dakarImg from "@/assets/destinations/dakar.jpg";
import torontoImg from "@/assets/destinations/toronto.jpg";
import lomeImg from "@/assets/destinations/lome.jpg";

const Home = () => {
  // Mock data - sera remplacé par des vraies données de la base de données
  const mockListings = [
    {
      id: "1",
      userName: "Marie Dubois",
      departure: "Montréal",
      arrival: "Abidjan",
      departureDate: "15 Jan 2025",
      arrivalDate: "16 Jan 2025",
      availableKg: 15,
      pricePerKg: 8,
      destinationImage: abidjanImg,
    },
    {
      id: "2",
      userName: "Jean Kouassi",
      departure: "Paris",
      arrival: "Dakar",
      departureDate: "20 Jan 2025",
      arrivalDate: "20 Jan 2025",
      availableKg: 20,
      pricePerKg: 6,
      destinationImage: dakarImg,
    },
    {
      id: "3",
      userName: "Sophie Martin",
      departure: "Toronto",
      arrival: "Lomé",
      departureDate: "25 Jan 2025",
      arrivalDate: "26 Jan 2025",
      availableKg: 12,
      pricePerKg: 10,
      destinationImage: lomeImg,
    },
  ];

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
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Destination..."
                  className="pl-10 h-12 bg-card shadow-card text-base"
                />
              </div>
              <Button size="lg" className="h-12 w-full bg-gradient-sky hover:opacity-90 transition-opacity text-base font-semibold">
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

        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          {mockListings.map((listing) => (
            <ListingCard key={listing.id} {...listing} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
