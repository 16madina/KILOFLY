import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PackageTracker } from "@/components/tracking/PackageTracker";
import { Package, Loader2, MapPin, ArrowRight, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const IN_TRANSIT_STATUSES = [
  "approved",
  "in_progress", 
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "arrived",
  "out_for_delivery"
];

const STATUS_FILTERS = [
  { key: "all", label: "Tous" },
  { key: "picked_up", label: "Récupéré" },
  { key: "in_transit", label: "En vol" },
  { key: "arrived", label: "Arrivé" },
  { key: "out_for_delivery", label: "Livraison" },
];

const Tracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

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

  // Filter reservations based on active filter
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    if (activeFilter === "all") return reservations;
    
    // Group similar statuses
    const statusGroups: Record<string, string[]> = {
      picked_up: ["approved", "pickup_scheduled", "picked_up"],
      in_transit: ["in_progress", "in_transit"],
      arrived: ["arrived"],
      out_for_delivery: ["out_for_delivery"],
    };
    
    const targetStatuses = statusGroups[activeFilter] || [activeFilter];
    return reservations.filter(r => targetStatuses.includes(r.status));
  }, [reservations, activeFilter]);

  // Count per filter
  const filterCounts = useMemo(() => {
    if (!reservations) return {};
    
    const statusGroups: Record<string, string[]> = {
      picked_up: ["approved", "pickup_scheduled", "picked_up"],
      in_transit: ["in_progress", "in_transit"],
      arrived: ["arrived"],
      out_for_delivery: ["out_for_delivery"],
    };
    
    const counts: Record<string, number> = { all: reservations.length };
    
    Object.entries(statusGroups).forEach(([key, statuses]) => {
      counts[key] = reservations.filter(r => statuses.includes(r.status)).length;
    });
    
    return counts;
  }, [reservations]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success("Données actualisées");
  }, [refetch]);

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
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 py-4 pt-safe">
            <h1 className="text-xl font-bold">Suivi des colis</h1>
            <p className="text-sm text-muted-foreground">
              {filteredReservations?.length || 0} colis{activeFilter !== "all" ? ` (${STATUS_FILTERS.find(f => f.key === activeFilter)?.label})` : " en cours"}
            </p>
          </div>
          
          {/* Status Filters */}
          <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {STATUS_FILTERS.map((filter) => {
                const count = filterCounts[filter.key] || 0;
                const isActive = activeFilter === filter.key;
                
                return (
                  <motion.button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {filter.label}
                    {count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-xs min-w-[20px] text-center",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filteredReservations || filteredReservations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {activeFilter === "all" ? "Aucun colis en transit" : "Aucun colis dans cette catégorie"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeFilter === "all" 
                    ? "Vos colis en cours de livraison apparaîtront ici"
                    : "Essayez un autre filtre pour voir vos colis"}
                </p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {filteredReservations.map((reservation, index) => {
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
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
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

                        {/* Date info + Details link */}
                        <div className="flex items-center justify-between mt-2">
                          {listing?.arrival_date && (
                            <p className="text-xs text-muted-foreground">
                              Arrivée prévue: {format(new Date(listing.arrival_date), "d MMMM yyyy", { locale: fr })}
                            </p>
                          )}
                          <button
                            onClick={() => navigate("/profile?tab=rdv")}
                            className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                          >
                            Voir détails
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
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
            </AnimatePresence>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
};

export default Tracking;
