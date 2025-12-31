import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Package, Clock, Check, X, Truck, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
  id: string;
  requested_kg: number;
  total_price: number;
  status: string;
  created_at: string;
  buyer?: { full_name: string; avatar_url: string };
  seller?: { full_name: string; avatar_url: string };
  listing?: { departure: string; arrival: string; departure_date: string };
}

interface MyReservationsEmbedProps {
  type: 'seller' | 'buyer';
}

export const MyReservationsEmbed = ({ type }: MyReservationsEmbedProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user, type]);

  const fetchReservations = async () => {
    if (!user) return;

    let query = supabase.from("reservations").select(`
      id, requested_kg, total_price, status, created_at,
      buyer:profiles!buyer_id(full_name, avatar_url),
      seller:profiles!seller_id(full_name, avatar_url),
      listing:listings!listing_id(departure, arrival, departure_date)
    `);

    if (type === 'seller') {
      query = query.eq("seller_id", user.id);
    } else {
      query = query.eq("buyer_id", user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(5);

    if (error) {
      console.error(error);
    } else {
      setReservations((data as any) || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      pending: { label: 'En attente', icon: Clock, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      approved: { label: 'Approuvée', icon: Check, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      rejected: { label: 'Refusée', icon: X, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      in_progress: { label: 'En transit', icon: Truck, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      delivered: { label: 'Livrée', icon: CheckCircle2, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    };
    const config = statusConfig[status] || { label: status, icon: Clock, className: 'bg-muted text-muted-foreground' };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <Card className="p-6 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {type === 'seller' ? 'Aucune demande reçue' : 'Aucune réservation envoyée'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation) => {
        const otherUser = type === 'seller' ? reservation.buyer : reservation.seller;
        const listing = reservation.listing;

        return (
          <Card 
            key={reservation.id} 
            className="overflow-hidden backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/my-reservations?type=${type}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={otherUser?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {otherUser?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{otherUser?.full_name}</p>
                    {listing && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{listing.departure} → {listing.arrival}</span>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(reservation.status)}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{reservation.requested_kg} kg</span>
                </div>
                <span className="font-semibold text-primary">{reservation.total_price.toFixed(0)}€</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate(`/my-reservations?type=${type}`)}
      >
        Voir tout
      </Button>
    </div>
  );
};
