import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PackageTracker } from "@/components/tracking/PackageTracker";
import { Package, Loader2, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect } from "react";

const IN_TRANSIT_STATUSES = [
  "approved",
  "in_progress", 
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "arrived",
  "out_for_delivery"
];

const Tracking = () => {
  const { user } = useAuth();

  const { data: reservations, isLoading, refetch } = useQuery({
    queryKey: ["tracking-reservations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          listing:listings(
            departure,
            arrival,
            departure_date,
            arrival_date
          ),
          seller:profiles!reservations_seller_id_fkey(full_name, avatar_url),
          buyer:profiles!reservations_buyer_id_fkey(full_name, avatar_url)
        `)
        .in("status", IN_TRANSIT_STATUSES)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Real-time subscription for reservation updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tracking-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracking_events",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      approved: "Approuvée",
      in_progress: "En transit",
      pickup_scheduled: "Récupération prévue",
      picked_up: "Colis récupéré",
      in_transit: "En vol",
      arrived: "Arrivé à destination",
      out_for_delivery: "Livraison en cours",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      approved: "bg-green-500/10 text-green-500",
      in_progress: "bg-blue-500/10 text-blue-500",
      pickup_scheduled: "bg-purple-500/10 text-purple-500",
      picked_up: "bg-indigo-500/10 text-indigo-500",
      in_transit: "bg-sky-500/10 text-sky-500",
      arrived: "bg-teal-500/10 text-teal-500",
      out_for_delivery: "bg-orange-500/10 text-orange-500",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-24">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Connectez-vous pour voir vos colis en cours
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 pt-safe">
          <h1 className="text-xl font-bold">Suivi des colis</h1>
          <p className="text-sm text-muted-foreground">
            {reservations?.length || 0} colis en cours
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !reservations || reservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Aucun colis en transit</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vos colis en cours de livraison apparaîtront ici
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation, index) => {
              const listing = reservation.listing as {
                departure: string;
                arrival: string;
                departure_date: string;
                arrival_date: string;
              } | null;
              
              const isBuyer = reservation.buyer_id === user.id;
              const otherParty = isBuyer 
                ? reservation.seller as { full_name: string; avatar_url: string } | null
                : reservation.buyer as { full_name: string; avatar_url: string } | null;

              return (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Reservation Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Route */}
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{listing?.departure}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{listing?.arrival}</span>
                        </div>

                        {/* Item description */}
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {reservation.item_description}
                        </p>

                        {/* Party info */}
                        <p className="text-xs text-muted-foreground">
                          {isBuyer ? "Voyageur" : "Client"}: {otherParty?.full_name || "Inconnu"}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusColor(reservation.status)}`}>
                        {getStatusLabel(reservation.status)}
                      </span>
                    </div>

                    {/* Date info */}
                    {listing?.arrival_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Arrivée prévue: {format(new Date(listing.arrival_date), "d MMMM yyyy", { locale: fr })}
                      </p>
                    )}
                  </div>

                  {/* Package Tracker */}
                  {listing && (
                    <PackageTracker
                      reservationId={reservation.id}
                      departure={listing.departure}
                      arrival={listing.arrival}
                      initialStatus={reservation.status}
                      sellerId={reservation.seller_id}
                      compact={true}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
