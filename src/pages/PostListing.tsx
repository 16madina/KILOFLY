import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Calendar, Weight, DollarSign, ArrowLeft, AlertCircle, Package, X, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Validation schema
const listingSchema = z.object({
  departure: z.string().trim().min(2, "Ville de départ requise").max(100, "Max 100 caractères"),
  arrival: z.string().trim().min(2, "Ville d'arrivée requise").max(100, "Max 100 caractères"),
  departure_date: z.string().min(1, "Date de départ requise"),
  arrival_date: z.string().min(1, "Date d'arrivée requise"),
  available_kg: z.number().min(1, "Minimum 1 kg").max(100, "Maximum 100 kg"),
  price_per_kg: z.number().min(1, "Prix minimum 1€").max(1000, "Prix maximum 1000€"),
  description: z.string().max(1000, "Maximum 1000 caractères").optional(),
  allowed_items: z.array(z.string()).min(1, "Sélectionnez au moins un objet autorisé"),
  prohibited_items: z.array(z.string()),
});

// Objets prédéfinis - Autorisés
const COMMON_ALLOWED_ITEMS = [
  "Vêtements",
  "Chaussures",
  "Livres",
  "Jouets",
  "Médicaments (non contrôlés avec ordonnance)",
  "Cosmétiques (quantité limitée)",
  "Électronique (téléphones, tablettes, ordinateurs)",
  "Documents",
  "Produits alimentaires secs/non périssables",
  "Bijoux (déclarés)",
  "Accessoires de mode",
  "Matériel de sport (sans armes blanches)",
  "Fournitures scolaires",
  "Petits appareils électroménagers",
];

// Objets interdits - Réglementations aéroportuaires internationales
const COMMON_PROHIBITED_ITEMS = [
  "Armes à feu et munitions",
  "Armes blanches (couteaux, ciseaux >6cm, rasoirs)",
  "Drogues et stupéfiants",
  "Explosifs et feux d'artifice",
  "Gaz comprimés (spray au poivre, bonbonnes)",
  "Liquides inflammables (essence, alcool >70%)",
  "Substances toxiques et corrosives",
  "Produits chimiques dangereux",
  "Batteries au lithium en vrac",
  "Cigarettes électroniques en soute",
  "Alcool >70° d'alcool",
  "Liquides >100ml en cabine",
  "Objets contondants (battes, clubs)",
  "Matières radioactives",
  "Agents oxydants (eau de javel concentrée)",
  "Aliments liquides non scellés",
  "Plantes et graines (selon pays)",
  "Produits d'origine animale (viande, lait)",
  "Contrefaçons et produits piratés",
  "Objets de valeur >10 000€ non déclarés",
  "Animaux vivants sans autorisation",
  "Matériel médical avec aiguilles non certifié",
  "Briquets tempête et allumettes (quantité)",
  "Poudres >350ml en cabine",
];

const PostListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  
  // Allowed items state
  const [selectedAllowedItems, setSelectedAllowedItems] = useState<string[]>([]);
  const [customAllowedItem, setCustomAllowedItem] = useState("");
  
  // Prohibited items state
  const [selectedProhibitedItems, setSelectedProhibitedItems] = useState<string[]>([]);
  const [customProhibitedItem, setCustomProhibitedItem] = useState("");
  
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
  
  const handleAddAllowedItem = (item: string) => {
    if (item && !selectedAllowedItems.includes(item)) {
      setSelectedAllowedItems(prev => [...prev, item]);
    }
  };

  const handleAddCustomAllowedItem = () => {
    const trimmedItem = customAllowedItem.trim();
    if (trimmedItem && !selectedAllowedItems.includes(trimmedItem)) {
      setSelectedAllowedItems(prev => [...prev, trimmedItem]);
      setCustomAllowedItem("");
    }
  };

  const handleRemoveAllowedItem = (item: string) => {
    setSelectedAllowedItems(prev => prev.filter(i => i !== item));
  };

  const handleAddProhibitedItem = (item: string) => {
    if (item && !selectedProhibitedItems.includes(item)) {
      setSelectedProhibitedItems(prev => [...prev, item]);
    }
  };

  const handleAddCustomProhibitedItem = () => {
    const trimmedItem = customProhibitedItem.trim();
    if (trimmedItem && !selectedProhibitedItems.includes(trimmedItem)) {
      setSelectedProhibitedItems(prev => [...prev, trimmedItem]);
      setCustomProhibitedItem("");
    }
  };

  const handleRemoveProhibitedItem = (item: string) => {
    setSelectedProhibitedItems(prev => prev.filter(i => i !== item));
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

    try {
      // Validate form data
      const validatedData = listingSchema.parse({
        departure: formData.get("departure") as string,
        arrival: formData.get("arrival") as string,
        departure_date: formData.get("departure-date") as string,
        arrival_date: formData.get("arrival-date") as string,
        available_kg: parseFloat(formData.get("kg") as string),
        price_per_kg: parseFloat(formData.get("price") as string),
        description: formData.get("notes") as string || undefined,
        allowed_items: selectedAllowedItems,
        prohibited_items: selectedProhibitedItems,
      });

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        departure: validatedData.departure,
        arrival: validatedData.arrival,
        departure_date: validatedData.departure_date,
        arrival_date: validatedData.arrival_date,
        available_kg: validatedData.available_kg,
        price_per_kg: validatedData.price_per_kg,
        description: validatedData.description || null,
        allowed_items: validatedData.allowed_items,
        prohibited_items: validatedData.prohibited_items,
      });

      if (error) throw error;

      toast.success("Annonce créée avec succès!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error("Erreur lors de la création de l'annonce");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-9 w-9 transition-all duration-200 hover:scale-110"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Poster une annonce</h1>
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6">
        <Card className="shadow-card animate-fade-in transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle>Détails du voyage</CardTitle>
            <CardDescription>
              Remplissez les informations de votre voyage
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Itinéraire Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Itinéraire
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departure">Ville de départ</Label>
                    <Input
                      id="departure"
                      name="departure"
                      placeholder="ex: Montréal"
                      required
                      maxLength={100}
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival">Ville d'arrivée</Label>
                    <Input
                      id="arrival"
                      name="arrival"
                      placeholder="ex: Abidjan"
                      required
                      maxLength={100}
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Dates
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departure-date">Date de départ</Label>
                    <Input
                      id="departure-date"
                      name="departure-date"
                      type="date"
                      required
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrival-date">Date d'arrivée</Label>
                    <Input
                      id="arrival-date"
                      name="arrival-date"
                      type="date"
                      required
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>

              {/* Capacité et Prix Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Weight className="h-5 w-5 text-primary" />
                  Capacité et Tarif
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kg">Kilos disponibles</Label>
                    <Input
                      id="kg"
                      name="kg"
                      type="number"
                      placeholder="ex: 15"
                      min="1"
                      max="100"
                      required
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Prix par kg (€)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="ex: 8"
                      min="1"
                      max="1000"
                      required
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>

              {/* Objets Autorisés Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-500" />
                  Objets que vous acceptez de transporter
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les types d'objets que vous êtes prêt à transporter
                </p>

                {/* Dropdown for allowed items */}
                <div className="space-y-3">
                  <Label htmlFor="allowed-items-select">Sélectionner des objets autorisés</Label>
                  <Select onValueChange={handleAddAllowedItem}>
                    <SelectTrigger id="allowed-items-select" className="w-full">
                      <SelectValue placeholder="Choisir un type d'objet..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-50 bg-popover">
                      {COMMON_ALLOWED_ITEMS.filter(item => !selectedAllowedItems.includes(item)).map((item) => (
                        <SelectItem key={item} value={item} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            {item}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom allowed item input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-allowed">Ajouter un objet personnalisé</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-allowed"
                      placeholder="Si non disponible dans la liste..."
                      value={customAllowedItem}
                      onChange={(e) => setCustomAllowedItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomAllowedItem();
                        }
                      }}
                      maxLength={50}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddCustomAllowedItem}
                      disabled={!customAllowedItem.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Selected allowed items */}
                {selectedAllowedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Objets sélectionnés ({selectedAllowedItems.length})</Label>
                    <div className="flex flex-wrap gap-2 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      {selectedAllowedItems.map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-300"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllowedItem(item)}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Objets Interdits Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Objets que vous refusez de transporter
                </h3>
                <Alert className="border-orange-500/20 bg-orange-500/10">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-sm">
                    <strong>Réglementations aéroportuaires internationales:</strong> Cette liste comprend les objets généralement interdits en cabine et/ou en soute selon les normes IATA et TSA. Vérifiez toujours les réglementations spécifiques de votre compagnie aérienne et pays de destination.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  Spécifiez les objets interdits selon les réglementations aéroportuaires
                </p>

                {/* Dropdown for prohibited items */}
                <div className="space-y-3">
                  <Label htmlFor="prohibited-items-select">Sélectionner des objets interdits</Label>
                  <Select onValueChange={handleAddProhibitedItem}>
                    <SelectTrigger id="prohibited-items-select" className="w-full">
                      <SelectValue placeholder="Choisir un type d'objet interdit..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-50 bg-popover">
                      {COMMON_PROHIBITED_ITEMS.filter(item => !selectedProhibitedItems.includes(item)).map((item) => (
                        <SelectItem key={item} value={item} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            {item}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom prohibited item input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-prohibited">Ajouter un objet personnalisé</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-prohibited"
                      placeholder="Si non disponible dans la liste..."
                      value={customProhibitedItem}
                      onChange={(e) => setCustomProhibitedItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomProhibitedItem();
                        }
                      }}
                      maxLength={50}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddCustomProhibitedItem}
                      disabled={!customProhibitedItem.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Selected prohibited items */}
                {selectedProhibitedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Objets interdits sélectionnés ({selectedProhibitedItems.length})</Label>
                    <div className="flex flex-wrap gap-2 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      {selectedProhibitedItems.map((item) => (
                        <Badge
                          key={item}
                          variant="secondary"
                          className="gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleRemoveProhibitedItem(item)}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes additionnelles (optionnel)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ajoutez des informations supplémentaires sur votre offre..."
                  className="min-h-[100px] transition-all duration-200 focus:scale-[1.01]"
                  maxLength={1000}
                />
              </div>

              {isVerified === false && (
                <Alert variant="destructive" className="mb-4 animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-3">
                    <p className="font-medium">Vérification d'identité requise</p>
                    <p className="text-sm">
                      Pour garantir la sécurité de tous les utilisateurs, vous devez vérifier votre identité avant de poster une annonce.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/profile")}
                      className="w-full transition-all duration-200 hover:scale-[1.02]"
                    >
                      Vérifier mon identité
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {selectedAllowedItems.length === 0 && (
                <Alert className="animate-fade-in">
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    Veuillez sélectionner au moins un type d'objet que vous acceptez de transporter
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || isVerified === false || selectedAllowedItems.length === 0}
                className="w-full h-12 text-base font-semibold bg-gradient-sky hover:opacity-90 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Publication en cours..." : "Publier l'annonce"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostListing;