import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, Weight, ArrowRight, User, Phone, Heart, Package, AlertCircle } from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";

interface ListingCardProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  departure: string;
  arrival: string;
  departureDate: string;
  arrivalDate: string;
  availableKg: number;
  pricePerKg: number;
  destinationImage?: string;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
  allowedItems?: string[];
  prohibitedItems?: string[];
  description?: string;
}

const ListingCard = ({
  id,
  userId,
  userName,
  userAvatar,
  departure,
  arrival,
  departureDate,
  arrivalDate,
  availableKg,
  pricePerKg,
  destinationImage,
  isFavorited = false,
  onFavoriteToggle,
  allowedItems = [],
  prohibitedItems = [],
  description,
}: ListingCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [requestedKg, setRequestedKg] = useState<number>(1);
  const [itemDescription, setItemDescription] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Calculate total price
  const totalPrice = requestedKg * pricePerKg;

  useEffect(() => {
    fetchUserVerification();
  }, [userId]);

  const fetchUserVerification = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id_verified, phone_verified, completed_trips, response_rate')
      .eq('id', userId)
      .single();
    
    if (data) {
      setIsVerified(data.id_verified || false);
      
      // Calculate trust score
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', userId);
      
      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      
      let calculatedScore = 0;
      if (data.id_verified) calculatedScore += 30;
      if (data.phone_verified) calculatedScore += 20;
      calculatedScore += (data.completed_trips || 0) * 2;
      calculatedScore += (avgRating / 5) * 30;
      calculatedScore += ((data.response_rate || 0) / 100) * 20;
      setTrustScore(Math.min(100, Math.round(calculatedScore)));
    }
  };

  const handleReservation = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour faire une réservation");
      navigate('/auth');
      return;
    }

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

    if (user.id === userId) {
      toast.error("Vous ne pouvez pas réserver votre propre annonce");
      return;
    }

    if (requestedKg > availableKg) {
      toast.error(`Quantité maximale disponible: ${availableKg} kg`);
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

    setContactLoading(true);

    try {
      // Create reservation
      const { error: reservationError } = await supabase
        .from("reservations")
        .insert({
          listing_id: id,
          buyer_id: user.id,
          seller_id: userId,
          requested_kg: requestedKg,
          total_price: totalPrice,
          item_description: itemDescription,
        });

      if (reservationError) throw reservationError;

      toast.success("Demande de réservation envoyée avec succès");
      toast.info("Le vendeur recevra une notification et pourra approuver votre demande");
      
      setIsDetailOpen(false);
      setRequestedKg(1);
      setItemDescription("");
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setContactLoading(false);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle();
    }
  };

  return (
    <>
      <BottomSheet 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        title="Détails de l'annonce"
      >
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-sky text-primary-foreground text-xl">
                {userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-lg">{userName}</p>
                <VerifiedBadge verified={isVerified} size="sm" />
              </div>
              <TrustScore score={trustScore} className="mb-1" />
              <p className="text-sm text-muted-foreground">
                {isVerified ? "Voyageur vérifié" : "En attente de vérification"}
              </p>
            </div>
          </div>

          {/* Destination Image */}
          {destinationImage && (
            <div className="relative h-48 rounded-lg overflow-hidden">
              <img 
                src={destinationImage} 
                alt={arrival}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          )}

          {/* Trip Details */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Itinéraire</h4>
              <div className="flex items-center gap-3 text-base">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-semibold">{departure}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{arrival}</span>
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
                    <p className="font-medium">{departureDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Arrivée</p>
                    <p className="font-medium">{arrivalDate}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Capacité disponible</h4>
              <div className="flex items-center gap-3">
                <Weight className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-2xl font-bold">{availableKg} kg</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Tarif</h4>
              <p className="text-3xl font-bold text-primary">
                {pricePerKg}€<span className="text-lg text-muted-foreground">/kg</span>
              </p>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{description}</p>
            </div>
          )}

          <Separator />

          {/* Objets autorisés */}
          {allowedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                Objets acceptés
              </h4>
              <div className="flex flex-wrap gap-2">
                {allowedItems.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Objets interdits */}
          {prohibitedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Objets refusés
              </h4>
              <div className="flex flex-wrap gap-2">
                {prohibitedItems.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Réservation Section */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <h4 className="font-semibold text-lg">Réserver des kilos</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="kg-input" className="text-sm">
                  Quantité souhaitée (kg)
                </Label>
                <span className="text-xs text-muted-foreground">
                  Maximum: {availableKg} kg
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
                    setRequestedKg(Math.min(availableKg, Math.max(1, value)));
                  }}
                  min={1}
                  max={availableKg}
                  className="text-center text-lg font-bold"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setRequestedKg(Math.min(availableKg, requestedKg + 1))}
                  disabled={requestedKg >= availableKg}
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
                  <span className="font-medium">{pricePerKg}€</span>
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
            </div>
          </div>

          {/* Reservation Button */}
          <Button 
            className="w-full gap-2 bg-gradient-sky hover:opacity-90 transition-opacity" 
            size="lg"
            onClick={handleReservation}
            disabled={contactLoading || !itemDescription.trim()}
          >
            <Phone className="h-5 w-5" />
            {contactLoading ? "Envoi en cours..." : `Envoyer la demande de réservation`}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Le vendeur recevra une notification et pourra approuver ou refuser votre demande
          </p>
        </div>
      </BottomSheet>

      <Card className="overflow-hidden transition-all hover:shadow-hover group relative">
      {/* Favorite Button */}
      {onFavoriteToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-full"
          onClick={handleFavoriteClick}
        >
          <Heart 
            className={`h-5 w-5 transition-colors ${
              isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
            }`} 
          />
        </Button>
      )}
      <div className="relative h-40 overflow-hidden">
        {destinationImage ? (
          <img 
            src={destinationImage} 
            alt={arrival}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage src={userAvatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-sky text-primary-foreground rounded-none text-6xl">
              {userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="gap-1 bg-background/90 backdrop-blur-sm">
            <Weight className="h-3 w-3" />
            {availableKg} kg
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-background flex-shrink-0">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gradient-sky text-primary-foreground text-xs">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <p className="font-semibold text-foreground text-sm truncate flex-1">{userName}</p>
                {isVerified && <VerifiedBadge verified={isVerified} size="sm" />}
              </div>
            </div>
            <TrustScore score={trustScore} className="scale-75 origin-left animate-fade-in" />
          </div>
        </div>
      </div>
      <CardContent className="p-4">

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium">{departure}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{arrival}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div>
              <span>Départ: {departureDate}</span>
              <span className="mx-2">•</span>
              <span>Arrivée: {arrivalDate}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <p className="text-xl font-bold text-primary">
                {pricePerKg}€<span className="text-sm text-muted-foreground">/kg</span>
              </p>
            </div>
            <Button 
              size="sm" 
              className="gap-2 bg-gradient-sky hover:opacity-90 transition-opacity"
              onClick={() => setIsDetailOpen(true)}
            >
              Contacter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default ListingCard;
export { ListingCard };