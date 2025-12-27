import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  Calendar, 
  Weight, 
  ArrowRight, 
  Package, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  ExternalLink, 
  Truck,
  Shield,
  Star,
  Clock,
  Plane,
  ChevronRight,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";
import PinchZoomImage from "@/components/mobile/PinchZoomImage";
import { motion } from "framer-motion";

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
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

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
      
      if (data.profiles) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', data.user_id);
        
        const avgRatingCalc = reviews && reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;
        
        setAvgRating(avgRatingCalc);
        setReviewCount(reviews?.length || 0);
        
        let calculatedScore = 0;
        if (data.profiles.id_verified) calculatedScore += 30;
        if (data.profiles.phone_verified) calculatedScore += 20;
        calculatedScore += (data.profiles.completed_trips || 0) * 2;
        calculatedScore += (avgRatingCalc / 5) * 30;
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Plane className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <p className="text-muted-foreground">Annonce introuvable</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const totalPrice = requestedKg * listing.price_per_kg;
  const formattedDepartureDate = new Date(listing.departure_date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
  const formattedArrivalDate = new Date(listing.arrival_date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Image */}
      <div className="relative">
        {/* Back Button - Floating */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-50 pt-safe"
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md shadow-lg hover:bg-background border-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Hero Image */}
        <div className="relative h-72 sm:h-80 md:h-96 overflow-hidden">
          {listing.destination_image ? (
            <img
              src={listing.destination_image}
              alt={listing.arrival}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center">
              <Plane className="h-24 w-24 text-primary/30" />
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Route Badge on Image */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-6 left-4 right-4"
          >
            <div className="inline-flex items-center gap-2 bg-background/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{listing.departure}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-lg">{listing.arrival}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-2 bg-background rounded-t-3xl pb-32">
        <div className="container px-4 sm:px-6 max-w-2xl mx-auto">
          
          {/* Price Highlight */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <p className="text-sm text-muted-foreground mb-1">Prix par kilogramme</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{listing.price_per_kg}€</span>
                <span className="text-muted-foreground">/kg</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Weight className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Disponible</span>
              </div>
              <span className="text-2xl font-bold text-primary">{listing.available_kg} kg</span>
            </div>
          </motion.div>

          <Separator className="mb-6" />

          {/* Traveler Card - Premium Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to={`/user/${listing.user_id}`}>
              <Card className="p-5 mb-6 bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <img
                        src={listing.profiles.avatar_url}
                        alt={listing.profiles.full_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {listing.profiles.id_verified && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Shield className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{listing.profiles.full_name}</h3>
                      {listing.profiles.id_verified && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                          Vérifié
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
                          <span>({reviewCount})</span>
                        </div>
                      )}
                      {listing.profiles.completed_trips > 0 && (
                        <div className="flex items-center gap-1">
                          <Plane className="h-4 w-4" />
                          <span>{listing.profiles.completed_trips} voyages</span>
                        </div>
                      )}
                    </div>
                    
                    <TrustScore score={trustScore} className="mt-2" />
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Trip Details - Timeline Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates du voyage
            </h4>
            <div className="relative pl-6">
              {/* Timeline Line */}
              <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-accent" />
              
              {/* Departure */}
              <div className="relative pb-6">
                <div className="absolute left-[-18px] top-1 h-4 w-4 rounded-full bg-primary shadow-lg shadow-primary/30" />
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Départ</p>
                  <p className="font-semibold">{listing.departure}</p>
                  <p className="text-sm text-muted-foreground capitalize">{formattedDepartureDate}</p>
                </div>
              </div>
              
              {/* Arrival */}
              <div className="relative">
                <div className="absolute left-[-18px] top-1 h-4 w-4 rounded-full bg-accent shadow-lg shadow-accent/30" />
                <div className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Arrivée</p>
                  <p className="font-semibold">{listing.arrival}</p>
                  <p className="text-sm text-muted-foreground capitalize">{formattedArrivalDate}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          {listing.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="mb-6"
            >
              <Card className="p-5 bg-muted/30 border-0">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">À propos du voyage</h4>
                <p className="text-sm leading-relaxed">{listing.description}</p>
              </Card>
            </motion.div>
          )}

          {/* Delivery Option */}
          {listing.delivery_option && DELIVERY_OPTIONS_LABELS[listing.delivery_option] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6"
            >
              <Card className="p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {DELIVERY_OPTIONS_LABELS[listing.delivery_option].icon}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Mode de réception
                    </p>
                    <p className="font-semibold mb-1">
                      {DELIVERY_OPTIONS_LABELS[listing.delivery_option].label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DELIVERY_OPTIONS_LABELS[listing.delivery_option].description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Prohibited Items */}
          {listing.prohibited_items && listing.prohibited_items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="mb-6"
            >
              <Card className="p-5 border-destructive/20 bg-destructive/5">
                <h4 className="font-medium text-destructive mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Articles refusés
                </h4>
                <div className="flex flex-wrap gap-2">
                  {listing.prohibited_items.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="bg-destructive/10 text-destructive border-0"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Airport Regulations Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <Alert className="border-amber-500/20 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <span className="font-medium">Rappel :</span> Consultez les{" "}
                <a
                  href="/prohibited-items"
                  target="_blank"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  règlements aéroportuaires
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Reservation Section - Premium Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Card className="p-6 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20 shadow-xl">
              <h4 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Réserver des kilos
              </h4>
              
              <div className="space-y-5">
                {/* Quantity Selector - Premium */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Quantité</Label>
                    <span className="text-xs text-muted-foreground">Max: {listing.available_kg} kg</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setRequestedKg(Math.max(1, requestedKg - 1))}
                      disabled={requestedKg <= 1}
                      className="h-12 w-12 rounded-xl"
                    >
                      -
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        value={requestedKg}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setRequestedKg(Math.min(listing.available_kg, Math.max(1, value)));
                        }}
                        min={1}
                        max={listing.available_kg}
                        className="text-center text-xl font-bold h-12 rounded-xl"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">kg</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setRequestedKg(Math.min(listing.available_kg, requestedKg + 1))}
                      disabled={requestedKg >= listing.available_kg}
                      className="h-12 w-12 rounded-xl"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Item Description */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Description des articles <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="Décrivez vos articles (type, poids, dimensions...)"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                    className="resize-none rounded-xl"
                  />
                </div>

                {/* Price Summary - Premium */}
                <div className="bg-background/50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{requestedKg} kg × {listing.price_per_kg}€</span>
                    <span>{totalPrice}€</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">{totalPrice}€</span>
                  </div>
                </div>

                {/* Regulations Checkbox */}
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                  <Checkbox
                    id="regulations"
                    checked={regulationsAccepted}
                    onCheckedChange={(checked) => setRegulationsAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="regulations" className="text-sm leading-relaxed cursor-pointer">
                    J'accepte les{" "}
                    <a
                      href="/prohibited-items"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      règlements aéroportuaires
                    </a>
                    {" "}et confirme que mes articles sont conformes.
                  </Label>
                </div>

                {/* Submit Button */}
                <Button 
                  className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 gap-2" 
                  onClick={handleReservation}
                  disabled={contactLoading || !itemDescription.trim() || !regulationsAccepted}
                >
                  {contactLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Envoyer la demande
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Le voyageur recevra une notification et pourra accepter ou refuser
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
