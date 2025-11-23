import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Weight, ArrowRight, User, Phone } from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";

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
  destinationImage?: string;
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
  destinationImage,
}: ListingCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
            <div>
              <p className="font-semibold text-lg">{userName}</p>
              <p className="text-sm text-muted-foreground">Voyageur vérifié</p>
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

          {/* Contact Button */}
          <Button className="w-full gap-2 bg-gradient-sky hover:opacity-90 transition-opacity" size="lg">
            <Phone className="h-5 w-5" />
            Contacter le voyageur
          </Button>
        </div>
      </BottomSheet>

      <Card className="overflow-hidden transition-all hover:shadow-hover group">
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
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-sky text-primary-foreground text-xs">
                {userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground">Voyageur vérifié</p>
            </div>
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
