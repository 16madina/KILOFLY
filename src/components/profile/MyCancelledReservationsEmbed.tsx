import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, MapPin, Calendar, User, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CancelledReservation {
  id: string;
  listing_id: string;
  requested_kg: number;
  total_price: number;
  item_description: string;
  status: string;
  created_at: string;
  updated_at: string;
  buyer_id: string;
  seller_id: string;
  listing?: {
    departure: string;
    arrival: string;
    departure_date: string;
    currency: string;
  };
  buyer?: {
    full_name: string;
    avatar_url: string;
  };
  seller?: {
    full_name: string;
    avatar_url: string;
  };
}

export function MyCancelledReservationsEmbed() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<CancelledReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchCancelledReservations();
  }, [user]);

  const fetchCancelledReservations = async () => {
    if (!user) return;
    
    // Get cancelled reservations where user is buyer OR seller
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        listing:listings(departure, arrival, departure_date, currency),
        buyer:profiles!reservations_buyer_id_fkey(full_name, avatar_url),
        seller:profiles!reservations_seller_id_fkey(full_name, avatar_url)
      `)
      .eq('status', 'cancelled')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setReservations(data as CancelledReservation[]);
    }
    setLoading(false);
  };

  const getRoleLabel = (res: CancelledReservation) => {
    if (res.buyer_id === user?.id) {
      return { role: "Expéditeur", otherParty: res.seller?.full_name || "Voyageur" };
    }
    return { role: "Voyageur", otherParty: res.buyer?.full_name || "Expéditeur" };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <Card className="p-8 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucune réservation annulée</h3>
        <p className="text-sm text-muted-foreground">
          Vous n'avez pas encore de réservations annulées.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((res) => {
        const { role, otherParty } = getRoleLabel(res);
        const wasBuyer = res.buyer_id === user?.id;
        
        return (
          <Card
            key={res.id}
            className="p-4 backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10 opacity-80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Role badge */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">
                    {role}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                    <XCircle className="h-3 w-3 mr-1" />
                    Annulée
                  </Badge>
                </div>
                
                {/* Other party info */}
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {wasBuyer ? "Voyageur" : "Expéditeur"}: {otherParty}
                  </span>
                </div>
                
                {/* Route */}
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {res.listing?.departure} → {res.listing?.arrival}
                  </span>
                </div>
                
                {/* Item description */}
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {res.item_description}
                </p>
                
                {/* Details */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {res.listing?.departure_date && format(new Date(res.listing.departure_date), 'dd MMM yyyy', { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {res.requested_kg} kg
                  </span>
                  <span className="font-medium text-foreground line-through opacity-60">
                    {res.total_price} {res.listing?.currency || 'EUR'}
                  </span>
                </div>
                
                {/* Cancellation date */}
                <p className="text-xs text-muted-foreground mt-2">
                  Annulée le {format(new Date(res.updated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
