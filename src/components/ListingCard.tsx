import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Weight, ArrowRight, Heart, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { TrustScore } from "@/components/TrustScore";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Currency } from "@/lib/currency";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

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
  currency?: string;
  destinationImage?: string;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
  allowedItems?: string[];
  prohibitedItems?: string[];
  description?: string;
  index?: number;
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
  currency = "EUR",
  destinationImage,
  isFavorited = false,
  onFavoriteToggle,
  allowedItems = [],
  prohibitedItems = [],
  description,
  index = 0,
}: ListingCardProps) => {
  const [isVerified, setIsVerified] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });

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
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer group",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        "shadow-card hover:shadow-hover",
        "transition-shadow duration-300"
      )}
      onClick={() => navigate(`/listing/${id}`)}
    >
      {/* Glassmorphism overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Favorite Button */}
      {onFavoriteToggle && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          className={cn(
            "absolute top-3 right-3 z-20 p-2.5 rounded-full",
            "glass backdrop-blur-xl",
            "shadow-lg transition-all duration-200"
          )}
          onClick={handleFavoriteClick}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isFavorited 
                ? "fill-red-500 text-red-500 scale-110" 
                : "text-white/80 hover:text-white"
            )} 
          />
        </motion.button>
      )}

      {/* Image Section */}
      <div className="relative h-44 overflow-hidden">
        {destinationImage ? (
          <motion.img 
            src={destinationImage} 
            alt={arrival}
            className="w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Plane className="h-16 w-16 text-primary/40" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Weight Badge - Glassmorphism */}
        <motion.div 
          className="absolute top-3 left-3"
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: index * 0.08 + 0.2 }}
        >
          <Badge 
            className={cn(
              "glass backdrop-blur-xl px-3 py-1.5",
              "border-white/20 text-white font-semibold",
              "shadow-lg"
            )}
          >
            <Weight className="h-3.5 w-3.5 mr-1.5" />
            {availableKg} kg
          </Badge>
        </motion.div>

        {/* User Info Card - Glassmorphism */}
        <motion.div 
          className="absolute bottom-3 left-3 right-3"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: index * 0.08 + 0.3 }}
        >
          <div className={cn(
            "glass backdrop-blur-xl rounded-xl p-3",
            "border-white/20"
          )}>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg flex-shrink-0">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-bold">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm truncate">{userName}</p>
                  {isVerified && <VerifiedBadge verified={isVerified} size="sm" />}
                </div>
                <TrustScore score={trustScore} className="scale-75 origin-left opacity-90" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Route */}
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: index * 0.08 + 0.35 }}
        >
          <div className="p-1.5 rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 flex-1 text-sm">
            <span className="font-semibold text-foreground">{departure}</span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="h-4 w-4 text-accent" />
            </motion.div>
            <span className="font-semibold text-foreground">{arrival}</span>
          </div>
        </motion.div>

        {/* Date */}
        <motion.div 
          className="flex items-center gap-2 text-sm text-muted-foreground"
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: index * 0.08 + 0.4 }}
        >
          <div className="p-1.5 rounded-lg bg-muted">
            <Calendar className="h-4 w-4" />
          </div>
          <span>{departureDate}</span>
          <span className="text-border">→</span>
          <span>{arrivalDate}</span>
        </motion.div>

        {/* Price and CTA */}
        <motion.div 
          className="flex items-center justify-between pt-3 border-t border-border/50"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: index * 0.08 + 0.45 }}
        >
          <div>
          <div className="flex flex-col">
              <PriceDisplay 
                amount={pricePerKg} 
                currency={currency as Currency}
                className="text-2xl font-bold text-gradient"
                conversionClassName="text-[10px] text-muted-foreground/70"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-0.5">par kilo</p>
          </div>
          <Button 
            size="sm" 
            className={cn(
              "gap-2 rounded-xl px-4",
              "bg-gradient-to-r from-primary to-accent",
              "hover:opacity-90 transition-opacity",
              "shadow-lg shadow-primary/20"
            )}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/listing/${id}`);
            }}
          >
            Réserver
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      </div>
    </motion.div>
  );
};

export default ListingCard;
export { ListingCard };