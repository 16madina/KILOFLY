import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Weight, ArrowRight } from "lucide-react";

interface ListingCardProps {
  id: string;
  userName: string;
  userAvatar?: string;
  departure: string;
  arrival: string;
  departureDate: string;
  arrivalDate: string;
  availableKg: number;
  pricePerKg: number;
}

const ListingCard = ({
  userName,
  userAvatar,
  departure,
  arrival,
  departureDate,
  arrivalDate,
  availableKg,
  pricePerKg,
}: ListingCardProps) => {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-hover">
      <div className="relative h-40 bg-gradient-hero">
        <Avatar className="absolute inset-0 h-full w-full rounded-none">
          <AvatarImage src={userAvatar} className="object-cover" />
          <AvatarFallback className="bg-gradient-sky text-primary-foreground rounded-none text-6xl">
            {userName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="gap-1 bg-background/90 backdrop-blur-sm">
            <Weight className="h-3 w-3" />
            {availableKg} kg
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2">
            <p className="font-semibold text-foreground text-sm">{userName}</p>
            <p className="text-xs text-muted-foreground">Voyageur vérifié</p>
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
            <Button size="sm" className="gap-2 bg-gradient-sky hover:opacity-90 transition-opacity">
              Contacter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ListingCard;
