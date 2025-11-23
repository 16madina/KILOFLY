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
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                {userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">Voyageur vérifié</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Weight className="h-3 w-3" />
            {availableKg} kg
          </Badge>
        </div>

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

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-2xl font-bold text-primary">
                {pricePerKg}€<span className="text-base text-muted-foreground">/kg</span>
              </p>
            </div>
            <Button className="gap-2 bg-gradient-sky hover:opacity-90 transition-opacity">
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
