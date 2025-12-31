import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
  id: string;
  listing_id: string;
  requested_kg: number;
  total_price: number;
  item_description: string;
  status: string;
  created_at: string;
  listing?: {
    departure: string;
    arrival: string;
    departure_date: string;
    currency: string;
  };
  seller?: {
    full_name: string;
    avatar_url: string;
  };
}

export function MyReservationsEmbed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchReservations();
  }, [user]);

  const fetchReservations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        listing:listings(departure, arrival, departure_date, currency),
        seller:profiles!reservations_seller_id_fkey(full_name, avatar_url)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setReservations(data as Reservation[]);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      delivered: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      approved: "Approuvée",
      rejected: "Refusée",
      in_progress: "En cours",
      delivered: "Livrée",
      cancelled: "Annulée",
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
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
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucune réservation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vous n'avez pas encore fait de réservation.
        </p>
        <Button onClick={() => navigate('/')} size="sm">
          Trouver un voyageur
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reservations.map((res) => (
        <Card
          key={res.id}
          className="p-4 backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium text-sm truncate">
                  {res.listing?.departure} → {res.listing?.arrival}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                {res.item_description}
              </p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {res.listing?.departure_date && format(new Date(res.listing.departure_date), 'dd MMM yyyy', { locale: fr })}
                </span>
                <span>{res.requested_kg} kg</span>
                <span className="font-medium text-foreground">
                  {res.total_price} {res.listing?.currency || 'EUR'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(res.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/my-reservations`)}
                className="h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Détails
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {reservations.length >= 10 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/my-reservations?type=buyer')}
        >
          Voir toutes mes réservations
        </Button>
      )}
    </div>
  );
}
