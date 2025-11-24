import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Calendar, Weight, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PostListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vous devez être connecté");
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id_verified")
      .eq("id", user.id)
      .single();

    setIsVerified(profile?.id_verified || false);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isVerified) {
      toast.error("Vous devez vérifier votre identité avant de poster une annonce");
      navigate("/profile");
      return;
    }

    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vous devez être connecté");
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("listings").insert({
      user_id: user.id,
      departure: formData.get("departure") as string,
      arrival: formData.get("arrival") as string,
      departure_date: formData.get("departure-date") as string,
      arrival_date: formData.get("arrival-date") as string,
      available_kg: parseFloat(formData.get("kg") as string),
      price_per_kg: parseFloat(formData.get("price") as string),
      description: formData.get("notes") as string || null,
    });

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de la création de l'annonce");
      console.error(error);
      return;
    }

    toast.success("Annonce créée avec succès!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Poster une annonce</h1>
        </div>
      </header>

      <div className="container py-6">
        <Card className="shadow-card animate-fade-in">
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
                  disabled={loading || isVerified === false}
                  className="w-full h-12 text-base font-semibold bg-gradient-sky hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "Publication..." : "Publier l'annonce"}
                </Button>
                {isVerified === false && (
                  <p className="text-sm text-destructive text-center mt-2">
                    Vous devez vérifier votre identité pour poster une annonce
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default PostListing;
