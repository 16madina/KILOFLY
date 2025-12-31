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
import { MapPin, Calendar, Weight, DollarSign, ArrowLeft, AlertCircle, X, Plus, ExternalLink, Truck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// Objets groupés par catégories que les voyageurs refusent généralement de transporter
const REFUSED_ITEMS_BY_CATEGORY = {
  "📄 Documents": [
    "Documents officiels (passeports, visas, actes)",
    "Argent liquide",
    "Chèques et titres de valeur",
    "Cartes bancaires",
  ],
  "💄 Cosmétiques": [
    "Parfums et eaux de toilette",
    "Crèmes éclaircissantes / hydroquinone",
    "Pommades et cosmétiques non scellés",
    "Huiles essentielles en grande quantité",
    "Produits de beauté sans étiquette",
  ],
  "🍎 Alimentaire": [
    "Produits alimentaires périssables",
    "Viandes et produits laitiers",
    "Épices en grande quantité",
    "Alcool en grande quantité",
    "Boissons et liquides",
  ],
  "📱 Électronique": [
    "Téléphones et tablettes d'occasion",
    "Appareils électroniques sans facture",
    "Batteries et accumulateurs",
    "Pièces détachées électroniques",
    "Ordinateurs portables d'occasion",
  ],
  "💊 Santé": [
    "Médicaments sans ordonnance",
    "Produits pharmaceutiques non identifiés",
    "Insecticides et pesticides",
    "Produits chimiques non identifiés",
  ],
  "📦 Autres": [
    "Cigarettes et tabac (quantité commerciale)",
    "Bijoux de grande valeur",
    "Objets de valeur non assurés",
    "Colis scellés / contenu inconnu",
    "Marchandises sans facture",
    "Produits de contrebande",
    "Pièces détachées automobiles",
  ],
};

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
  
  // Delivery options state
  const [deliveryOption, setDeliveryOption] = useState<string>("pickup");
  
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
      setDeliveryOption(data.delivery_option || "pickup");
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
            delivery_option: deliveryOption,
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
          delivery_option: deliveryOption,
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
            onClick={() => navigate(-1)}
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

                {/* Objets Interdits Section - moved here after kg */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="text-base font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Objets que vous refusez de transporter
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez les types d'objets que vous ne souhaitez pas transporter
                  </p>

                  {/* Grouped dropdown for refused items */}
                  <div className="space-y-3">
                    <Label htmlFor="prohibited-items-select">Sélectionner par catégorie</Label>
                    <Select onValueChange={handleAddProhibitedItem}>
                      <SelectTrigger id="prohibited-items-select" className="w-full">
                        <SelectValue placeholder="Choisir un type d'objet..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[350px] z-50 bg-popover">
                        {Object.entries(REFUSED_ITEMS_BY_CATEGORY).map(([category, items]) => (
                          <div key={category}>
                            <div className="px-2 py-2 text-sm font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                              {category}
                            </div>
                            {items
                              .filter(item => !selectedProhibitedItems.includes(item))
                              .map((item) => (
                                <SelectItem key={item} value={item} className="cursor-pointer pl-4">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    {item}
                                  </div>
                                </SelectItem>
                              ))}
                          </div>
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
                      <Label>Objets refusés sélectionnés ({selectedProhibitedItems.length})</Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
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
              </div>

              {/* Options de réception */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Options de réception
                </h3>
                <p className="text-sm text-muted-foreground">
                  Comment souhaitez-vous remettre les colis à destination ?
                </p>
                
                <RadioGroup
                  value={deliveryOption}
                  onValueChange={setDeliveryOption}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="pickup" id="pickup" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="pickup" className="font-medium cursor-pointer">
                        🏠 Venir chercher sur place
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        L'expéditeur vient récupérer le colis à mon point de rencontre
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="delivery_free" id="delivery_free" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="delivery_free" className="font-medium cursor-pointer">
                        🚗 Livraison gratuite
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Je peux livrer le colis gratuitement dans un rayon proche
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="delivery_paid" id="delivery_paid" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="delivery_paid" className="font-medium cursor-pointer">
                        📦 Livraison payante
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Livraison possible avec frais supplémentaires à convenir
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="handover" id="handover" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="handover" className="font-medium cursor-pointer">
                        🤝 Remise en main propre
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rencontre dans un lieu public pour la remise du colis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="airport" id="airport" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="airport" className="font-medium cursor-pointer">
                        ✈️ À l'aéroport uniquement
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Remise du colis uniquement à l'aéroport d'arrivée
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Note info about regulations */}
              <Alert className="border-orange-500/20 bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  <strong>Rappel:</strong> Les articles interdits par les réglementations aéroportuaires (IATA/TSA) sont automatiquement exclus. Consultez le lien des règlements ci-dessous.
                </AlertDescription>
              </Alert>

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