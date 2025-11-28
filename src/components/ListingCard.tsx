import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Weight, ArrowRight, Heart, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [isVerified, setIsVerified] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const navigate = useNavigate();

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle();
    }
  };

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-hover group relative cursor-pointer"
      onClick={() => navigate(`/listing/${id}`)}
    >
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
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/listing/${id}`);
              }}
            >
              Voir détails
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ListingCard;
export { ListingCard };