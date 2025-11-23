import Navbar from "@/components/Navbar";
import ListingCard from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";

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
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="relative container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Partagez vos kilos,{" "}
              <span className="bg-gradient-sky bg-clip-text text-transparent">
                voyagez léger
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Connectez-vous avec des voyageurs pour utiliser leurs kilos disponibles 
              et envoyez vos colis partout dans le monde
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Ville de départ..."
                  className="pl-10 h-12 bg-card shadow-card"
                />
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Destination..."
                  className="pl-10 h-12 bg-card shadow-card"
                />
              </div>
              <Button size="lg" className="h-12 px-8 bg-gradient-sky hover:opacity-90 transition-opacity">
                Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Listings Section */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Annonces récentes</h2>
            <p className="text-muted-foreground mt-1">
              Découvrez les dernières offres de kilos disponibles
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockListings.map((listing) => (
            <ListingCard key={listing.id} {...listing} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
