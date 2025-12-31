import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Package, Wallet, Plane, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { formatPrice, Currency, CURRENCY_SYMBOLS } from "@/lib/currency";
import { useHaptics } from "@/hooks/useHaptics";

interface TransportRequestCardProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  departure: string;
  arrival: string;
  departureDateStart: string;
  departureDateEnd: string | null;
  requestedKg: number;
  budgetMax: number | null;
  currency: string;
  description: string | null;
  createdAt: string;
  onOfferTransport?: () => void;
  onClick?: () => void;
  isOwnRequest?: boolean;
  offersCount?: number;
}

export const TransportRequestCard = ({
  id,
  userId,
  userName,
  userAvatar,
  departure,
  arrival,
  departureDateStart,
  departureDateEnd,
  requestedKg,
  budgetMax,
  currency,
  description,
  createdAt,
  onOfferTransport,
  onClick,
  isOwnRequest = false,
  offersCount = 0,
}: TransportRequestCardProps) => {
  const { impact, ImpactStyle } = useHaptics();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr });

  const handleCardClick = () => {
    if (onClick) {
      impact(ImpactStyle.Light);
      onClick();
    }
  };

  return (
    <Card 
      className={`group overflow-hidden border-0 shadow-card hover:shadow-elegant transition-all duration-300 bg-card ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-amber-500/20">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  {userName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{userName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
              <Package className="h-3 w-3 mr-1" />
              Recherche
            </Badge>
          </div>
        </div>

        {/* Route */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500 to-orange-500" />
              <div className="h-3 w-3 rounded-full bg-orange-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{departure}</span>
              </div>
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{arrival}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(departureDateStart)}
              {departureDateEnd && ` - ${formatDate(departureDateEnd)}`}
            </Badge>
            <Badge variant="outline" className="gap-1 bg-primary/5">
              <Package className="h-3 w-3" />
              {requestedKg} kg
            </Badge>
            {budgetMax && (
              <Badge variant="outline" className="gap-1 bg-green-500/5 text-green-700 dark:text-green-300">
                <Wallet className="h-3 w-3" />
                Max {budgetMax} {CURRENCY_SYMBOLS[currency as Currency] || currency}
              </Badge>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {isOwnRequest ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{offersCount}</span>
                proposition{offersCount !== 1 ? 's' : ''} reçue{offersCount !== 1 ? 's' : ''}
              </div>
            ) : (
              <div />
            )}
            {!isOwnRequest && onOfferTransport && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOfferTransport();
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                size="sm"
              >
                <Plane className="h-4 w-4 mr-2" />
                Je peux transporter
              </Button>
            )}
            {onClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
