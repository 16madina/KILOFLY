import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Calendar, Weight, DollarSign } from "lucide-react";

const PostListing = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Annonce créée avec succès!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Poster une{" "}
              <span className="bg-gradient-sky bg-clip-text text-transparent">
                annonce
              </span>
            </h1>
            <p className="text-muted-foreground">
              Partagez vos kilos disponibles avec d'autres voyageurs
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Détails du voyage</CardTitle>
              <CardDescription>
                Remplissez les informations de votre voyage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departure" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Ville de départ
                    </Label>
                    <Input
                      id="departure"
                      placeholder="ex: Montréal"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      Ville d'arrivée
                    </Label>
                    <Input
                      id="arrival"
                      placeholder="ex: Abidjan"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departure-date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Date de départ
                    </Label>
                    <Input
                      id="departure-date"
                      type="date"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival-date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-accent" />
                      Date d'arrivée
                    </Label>
                    <Input
                      id="arrival-date"
                      type="date"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kg" className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-primary" />
                      Kilos disponibles
                    </Label>
                    <Input
                      id="kg"
                      type="number"
                      placeholder="ex: 15"
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-accent" />
                      Prix par kg (€)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="ex: 8"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notes additionnelles (optionnel)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Ajoutez des informations supplémentaires sur votre offre..."
                    className="min-h-[100px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-sky hover:opacity-90 transition-opacity"
                >
                  Publier l'annonce
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PostListing;
