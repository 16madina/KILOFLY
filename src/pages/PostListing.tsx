import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Calendar, Weight, DollarSign, ArrowLeft, AlertCircle, X, Plus, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Currency, CURRENCY_NAMES, CURRENCY_SYMBOLS } from "@/lib/currency";

// Validation schema
const listingSchema = z.object({
  departure: z.string().trim().min(2, "Ville de départ requise").max(100, "Max 100 caractères"),
  arrival: z.string().trim().min(2, "Ville d'arrivée requise").max(100, "Max 100 caractères"),
  departure_date: z.string().min(1, "Date de départ requise"),
  arrival_date: z.string().min(1, "Date d'arrivée requise"),
  available_kg: z.number().min(1, "Minimum 1 kg").max(100, "Maximum 100 kg"),
  price_per_kg: z.number().min(1, "Prix minimum 1€").max(1000, "Prix maximum 1000€"),
  description: z.string().max(1000, "Maximum 1000 caractères").optional(),
  prohibited_items: z.array(z.string()),
  regulations_accepted: z.boolean().refine(val => val === true, "Vous devez accepter les règlements aéroportuaires"),
});

// Objets que les voyageurs refusent généralement de transporter
const COMMON_REFUSED_ITEMS = [
  "Documents officiels (passeports, visas, actes)",
  "Parfums et eaux de toilette",
  "Crèmes éclaircissantes / hydroquinone",
  "Pommades et cosmétiques non scellés",
  "Insecticides et pesticides",
  "Médicaments sans ordonnance",
  "Produits pharmaceutiques non identifiés",
  "Alcool en grande quantité",
  "Cigarettes et tabac (quantité commerciale)",
  "Produits alimentaires périssables",
  "Viandes et produits laitiers",
  "Épices en grande quantité",
  "Argent liquide",
  "Bijoux de grande valeur",
  "Téléphones et tablettes d'occasion",
  "Appareils électroniques sans facture",
  "Pièces détachées automobiles",
  "Batteries et accumulateurs",
  "Huiles essentielles en grande quantité",
  "Produits de contrebande",
  "Marchandises sans facture",
  "Objets de valeur non assurés",
  "Colis scellés / contenu inconnu",
  "Produits chimiques non identifiés",
];

const PostListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("edit");
  
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<Currency>("EUR");
  
  // Prohibited items state
  const [selectedProhibitedItems, setSelectedProhibitedItems] = useState<string[]>([]);
  const [customProhibitedItem, setCustomProhibitedItem] = useState("");
  const [regulationsAccepted, setRegulationsAccepted] = useState(false);
  
  // Form data state for editing
  const [formData, setFormData] = useState({
    departure: "",
    arrival: "",
    departure_date: "",
    arrival_date: "",
    available_kg: "",
    price_per_kg: "",
    description: "",
  });
  
  useEffect(() => {
    checkVerificationStatus();
    if (editingId) {
      loadListingData();
    }
  }, [editingId]);

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

    // Check both email verification AND ID verification
    const emailVerified = !!user.email_confirmed_at;
    const idVerified = profile?.id_verified || false;
    
    setIsVerified(emailVerified && idVerified);
  };

  const loadListingData = async () => {
    if (!editingId) return;

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", editingId)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de l'annonce");
      console.error(error);
      navigate("/my-listings");
      return;
    }

    if (data) {
      setFormData({
        departure: data.departure,
        arrival: data.arrival,
        departure_date: data.departure_date,
        arrival_date: data.arrival_date,
        available_kg: data.available_kg.toString(),
        price_per_kg: data.price_per_kg.toString(),
        description: data.description || "",
      });
      setCurrency(data.currency as Currency);
      setSelectedProhibitedItems(data.prohibited_items || []);
      setRegulationsAccepted(true); // Already accepted when editing
    }
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
      toast.error("Vous devez vérifier votre email et votre identité avant de poster une annonce");
      navigate("/profile");
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vous devez être connecté");
      navigate("/auth");
      return;
    }

    try {
      // Validate form data from state
      const validatedData = listingSchema.parse({
        departure: formData.departure,
        arrival: formData.arrival,
        departure_date: formData.departure_date,
        arrival_date: formData.arrival_date,
        available_kg: parseFloat(formData.available_kg),
        price_per_kg: parseFloat(formData.price_per_kg),
        description: formData.description || undefined,
        prohibited_items: selectedProhibitedItems,
        regulations_accepted: regulationsAccepted,
      });

      if (editingId) {
        // Update existing listing
        const { error } = await supabase
          .from("listings")
          .update({
            departure: validatedData.departure,
            arrival: validatedData.arrival,
            departure_date: validatedData.departure_date,
            arrival_date: validatedData.arrival_date,
            available_kg: validatedData.available_kg,
            price_per_kg: validatedData.price_per_kg,
            currency,
            description: validatedData.description || null,
            prohibited_items: validatedData.prohibited_items,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Annonce mise à jour avec succès!");
      } else {
        // Create new listing
        const { error } = await supabase.from("listings").insert({
          user_id: user.id,
          departure: validatedData.departure,
          arrival: validatedData.arrival,
          departure_date: validatedData.departure_date,
          arrival_date: validatedData.arrival_date,
          available_kg: validatedData.available_kg,
          price_per_kg: validatedData.price_per_kg,
          currency,
          description: validatedData.description || null,
          prohibited_items: validatedData.prohibited_items,
        });

        if (error) throw error;
        toast.success("Annonce créée avec succès!");
      }

      navigate("/my-listings");
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
          <h1 className="text-xl font-bold">{editingId ? "Modifier l'annonce" : "Poster une annonce"}</h1>
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
                      value={formData.departure}
                      onChange={(e) => setFormData(prev => ({ ...prev, departure: e.target.value }))}
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
                      value={formData.arrival}
                      onChange={(e) => setFormData(prev => ({ ...prev, arrival: e.target.value }))}
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
                      value={formData.departure_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, departure_date: e.target.value }))}
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
                      value={formData.arrival_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, arrival_date: e.target.value }))}
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
                      value={formData.available_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, available_kg: e.target.value }))}
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Prix par kg</Label>
                    <div className="flex gap-2">
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        placeholder="ex: 8"
                        min="1"
                        max="100000"
                        required
                        value={formData.price_per_kg}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_per_kg: e.target.value }))}
                        className="flex-1 transition-all duration-200 focus:scale-[1.02]"
                      />
                      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">
                            {CURRENCY_SYMBOLS.EUR} EUR
                          </SelectItem>
                          <SelectItem value="USD">
                            {CURRENCY_SYMBOLS.USD} USD
                          </SelectItem>
                          <SelectItem value="XOF">
                            {CURRENCY_SYMBOLS.XOF} CFA
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
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
                      {COMMON_REFUSED_ITEMS.filter(item => !selectedProhibitedItems.includes(item)).map((item) => (
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

              {/* Réglementations aéroportuaires - Checkbox */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
                  <Checkbox
                    id="regulations-accepted"
                    checked={regulationsAccepted}
                    onCheckedChange={(checked) => setRegulationsAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <Label 
                      htmlFor="regulations-accepted" 
                      className="text-sm cursor-pointer leading-relaxed"
                    >
                      J'ai lu et j'accepte les{" "}
                      <a
                        href="/prohibited-items"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        règlements aéroportuaires internationaux
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {" "}concernant les articles interdits en transport aérien.
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Je m'engage à respecter toutes les réglementations IATA et TSA applicables.
                    </p>
                  </div>
                </div>
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
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {isVerified === false && (
                <Alert variant="destructive" className="mb-4 animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-3">
                    <p className="font-medium">Vérification requise (2 étapes)</p>
                    <p className="text-sm">
                      Pour poster une annonce, vous devez compléter 2 vérifications:
                      <br />
                      1. <strong>Email</strong> - Vérifiez votre boîte mail
                      <br />
                      2. <strong>Identité</strong> - Téléversez votre pièce d'identité
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/verify-identity")}
                      className="w-full transition-all duration-200 hover:scale-[1.02]"
                    >
                      Compléter mes vérifications
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!regulationsAccepted && (
                <Alert className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Veuillez accepter les règlements aéroportuaires avant de publier
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || isVerified === false || !regulationsAccepted}
                className="w-full h-12 text-base font-semibold bg-gradient-sky hover:opacity-90 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading 
                  ? (editingId ? "Mise à jour..." : "Publication en cours...") 
                  : (editingId ? "Mettre à jour l'annonce" : "Publier l'annonce")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostListing;