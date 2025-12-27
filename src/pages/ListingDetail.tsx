import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Calendar, Weight, ArrowRight, Phone, Package, AlertCircle, ArrowLeft, Loader2, ExternalLink, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";
import PinchZoomImage from "@/components/mobile/PinchZoomImage";

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
  allowed_items: string[];
  prohibited_items: string[];
  description: string | null;
  delivery_option: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    id_verified: boolean;
    phone_verified: boolean;
    completed_trips: number;
    response_rate: number;
  };
}

// Mapping des options de livraison pour affichage
const DELIVERY_OPTIONS_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  pickup: { label: "Venir chercher sur place", icon: "🏠", description: "L'expéditeur vient récupérer le colis au point de rencontre du voyageur" },
  delivery_free: { label: "Livraison gratuite", icon: "🚗", description: "Le voyageur peut livrer le colis gratuitement dans un rayon proche" },
  delivery_paid: { label: "Livraison payante", icon: "📦", description: "Livraison possible avec frais supplémentaires à convenir" },
  handover: { label: "Remise en main propre", icon: "🤝", description: "Rencontre dans un lieu public pour la remise du colis" },
  airport: { label: "À l'aéroport uniquement", icon: "✈️", description: "Remise du colis uniquement à l'aéroport d'arrivée" },
};

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [requestedKg, setRequestedKg] = useState<number>(1);
  const [itemDescription, setItemDescription] = useState<string>("");
  const [regulationsAccepted, setRegulationsAccepted] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            id_verified,
            phone_verified,
            completed_trips,
            response_rate
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setListing(data as unknown as Listing);
      
      // Calculate trust score
      if (data.profiles) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', data.user_id);
        
        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;
        
        let calculatedScore = 0;
        if (data.profiles.id_verified) calculatedScore += 30;
        if (data.profiles.phone_verified) calculatedScore += 20;
        calculatedScore += (data.profiles.completed_trips || 0) * 2;
        calculatedScore += (avgRating / 5) * 30;
        calculatedScore += ((data.profiles.response_rate || 0) / 100) * 20;
        setTrustScore(Math.min(100, Math.round(calculatedScore)));
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error("Erreur lors du chargement de l'annonce");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour faire une réservation");
      navigate('/auth');
      return;
    }

    if (!listing) return;

    // Check if user's email is verified and ID is verified
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('id_verified')
      .eq('id', user.id)
      .single();

    const emailVerified = !!user.email_confirmed_at;
    const idVerified = currentUserProfile?.id_verified || false;

    if (!emailVerified || !idVerified) {
      toast.error("Vous devez vérifier votre email et votre identité avant de réserver");
      navigate('/verify-identity');
      return;
    }

    if (user.id === listing.user_id) {
      toast.error("Vous ne pouvez pas réserver votre propre annonce");
      return;
    }

    if (requestedKg > listing.available_kg) {
      toast.error(`Quantité maximale disponible: ${listing.available_kg} kg`);
      return;
    }

    if (requestedKg < 1) {
      toast.error("La quantité doit être d'au moins 1 kg");
      return;
    }

    if (!itemDescription.trim()) {
      toast.error("Veuillez décrire les articles que vous souhaitez envoyer");
      return;
    }

    if (!regulationsAccepted) {
      toast.error("Veuillez accepter les règlements aéroportuaires");
      return;
    }

    setContactLoading(true);

    try {
      const totalPrice = requestedKg * listing.price_per_kg;
      
      // Create reservation
      const { error: reservationError } = await supabase
        .from("reservations")
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
          requested_kg: requestedKg,
          total_price: totalPrice,
          item_description: itemDescription,
        });

      if (reservationError) throw reservationError;

      toast.success("Demande de réservation envoyée avec succès");
      toast.info("Le vendeur recevra une notification et pourra approuver votre demande");
      
      navigate('/my-reservations');
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Annonce introuvable</p>
      </div>
    );
  }

  const totalPrice = requestedKg * listing.price_per_kg;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
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
          <h1 className="text-xl font-bold">Détails de l'annonce</h1>
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* User Info */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <PinchZoomImage
              src={listing.profiles.avatar_url}
              alt={listing.profiles.full_name}
              className="h-16 w-16 rounded-full object-cover"
              containerClassName="h-16 w-16 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-lg">{listing.profiles.full_name}</p>
                <VerifiedBadge verified={listing.profiles.id_verified} size="sm" />
              </div>
              <TrustScore score={trustScore} className="mb-1" />
              <p className="text-sm text-muted-foreground">
                {listing.profiles.id_verified ? "Voyageur vérifié" : "En attente de vérification"}
              </p>
            </div>
          </div>
        </Card>

        {/* Destination Image */}
        {listing.destination_image && (
          <PinchZoomImage
            src={listing.destination_image}
            alt={listing.arrival}
            className="w-full h-64 object-cover rounded-lg"
            containerClassName="relative h-64 rounded-lg overflow-hidden"
          />
        )}

        {/* Trip Details */}
        <Card className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Itinéraire</h4>
            <div className="flex items-center gap-3 text-base">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="font-semibold">{listing.departure}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{listing.arrival}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Dates</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Départ</p>
                  <p className="font-medium">{listing.departure_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Arrivée</p>
                  <p className="font-medium">{listing.arrival_date}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Capacité disponible</h4>
            <div className="flex items-center gap-3">
              <Weight className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-2xl font-bold">{listing.available_kg} kg</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Tarif</h4>
            <p className="text-3xl font-bold text-primary">
              {listing.price_per_kg}€<span className="text-lg text-muted-foreground">/kg</span>
            </p>
          </div>
        </Card>

        {/* Description */}
        {listing.description && (
          <Card className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{listing.description}</p>
          </Card>
        )}

        {/* Option de réception */}
        {listing.delivery_option && DELIVERY_OPTIONS_LABELS[listing.delivery_option] && (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Mode de réception
            </h4>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{DELIVERY_OPTIONS_LABELS[listing.delivery_option].icon}</span>
              <div>
                <p className="font-medium text-foreground">
                  {DELIVERY_OPTIONS_LABELS[listing.delivery_option].label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {DELIVERY_OPTIONS_LABELS[listing.delivery_option].description}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Objets refusés par le voyageur */}
        {listing.prohibited_items && listing.prohibited_items.length > 0 && (
          <Card className="p-4 border-red-500/20 bg-red-500/5">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Objets refusés par ce voyageur
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Ce voyageur ne transporte pas les articles suivants :
            </p>
            <div className="flex flex-wrap gap-2">
              {listing.prohibited_items.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Rappel des réglementations aéroportuaires */}
        <Alert className="border-orange-500/20 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-sm">
            <strong>Rappel important :</strong> Les articles interdits par les réglementations aéroportuaires internationales (IATA/TSA) ne peuvent pas être transportés. 
            <a
              href="/prohibited-items"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 ml-1 font-medium"
            >
              Voir la liste complète
              <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        {/* Réservation Section */}
        <Card className="p-4 space-y-4 bg-primary/5 border-primary/10">
          <h4 className="font-semibold text-lg">Réserver des kilos</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="kg-input" className="text-sm">
                Quantité souhaitée (kg)
              </Label>
              <span className="text-xs text-muted-foreground">
                Maximum: {listing.available_kg} kg
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRequestedKg(Math.max(1, requestedKg - 1))}
                disabled={requestedKg <= 1}
              >
                -
              </Button>
              
              <Input
                id="kg-input"
                type="number"
                value={requestedKg}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setRequestedKg(Math.min(listing.available_kg, Math.max(1, value)));
                }}
                min={1}
                max={listing.available_kg}
                className="text-center text-lg font-bold"
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRequestedKg(Math.min(listing.available_kg, requestedKg + 1))}
                disabled={requestedKg >= listing.available_kg}
              >
                +
              </Button>
            </div>

            {/* Item Description */}
            <div className="space-y-2">
              <Label htmlFor="item-description" className="text-sm">
                Description des articles <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="item-description"
                placeholder="Décrivez les articles que vous souhaitez envoyer (type, poids approximatif, dimensions, etc.)"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Soyez précis pour aider le voyageur à évaluer votre demande
              </p>
            </div>

            {/* Price Calculation */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix par kg:</span>
                <span className="font-medium">{listing.price_per_kg}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantité:</span>
                <span className="font-medium">{requestedKg} kg</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{totalPrice}€</span>
              </div>
            </div>

            {/* Checkbox acceptation règlements */}
            <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-muted/30">
              <Checkbox
                id="regulations-accepted-detail"
                checked={regulationsAccepted}
                onCheckedChange={(checked) => setRegulationsAccepted(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="regulations-accepted-detail" 
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
                    règlements aéroportuaires
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {" "}et je confirme que mes articles sont conformes.
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Reservation Button */}
        {!regulationsAccepted && (
          <Alert className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Veuillez accepter les règlements aéroportuaires avant d'envoyer votre demande
            </AlertDescription>
          </Alert>
        )}

        <Button 
          className="w-full gap-2 bg-gradient-sky hover:opacity-90 transition-opacity" 
          size="lg"
          onClick={handleReservation}
          disabled={contactLoading || !itemDescription.trim() || !regulationsAccepted}
        >
          <Phone className="h-5 w-5" />
          {contactLoading ? "Envoi en cours..." : `Envoyer la demande de réservation`}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Le vendeur recevra une notification et pourra approuver ou refuser votre demande
        </p>
      </div>
    </div>
  );
};

export default ListingDetail;
