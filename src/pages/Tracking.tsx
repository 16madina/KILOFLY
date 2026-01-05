import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PackageTracker } from "@/components/tracking/PackageTracker";
import { TrackingCard } from "@/components/tracking/TrackingCard";
import { Package, Loader2, MapPin, Shield, Bell, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

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
      
      // Fetch latest tracking_event for each reservation
      const reservationsWithTracking = await Promise.all(
        (data || []).map(async (res) => {
          const { data: latestEvent } = await supabase
            .from("tracking_events")
            .select("status")
            .eq("reservation_id", res.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          return {
            ...res,
            latest_tracking_status: latestEvent?.status || res.status,
          };
        })
      );
      
      return reservationsWithTracking;
    },
    enabled: !!user,
  });

  // Filter reservations based on active filter (using latest_tracking_status)
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    if (activeFilter === "all") return reservations;
    
    // Group similar statuses
    const statusGroups: Record<string, string[]> = {
      picked_up: ["approved", "payment_received", "pickup_scheduled", "picked_up"],
      in_transit: ["in_progress", "in_transit"],
      arrived: ["arrived"],
      out_for_delivery: ["out_for_delivery"],
    };
    
    const targetStatuses = statusGroups[activeFilter] || [activeFilter];
    return reservations.filter(r => targetStatuses.includes(r.latest_tracking_status || r.status));
  }, [reservations, activeFilter]);

  // Count per filter (using latest_tracking_status)
  const filterCounts = useMemo(() => {
    if (!reservations) return {};
    
    const statusGroups: Record<string, string[]> = {
      picked_up: ["approved", "payment_received", "pickup_scheduled", "picked_up"],
      in_transit: ["in_progress", "in_transit"],
      arrived: ["arrived"],
      out_for_delivery: ["out_for_delivery"],
    };
    
    const counts: Record<string, number> = { all: reservations.length };
    
    Object.entries(statusGroups).forEach(([key, statuses]) => {
      counts[key] = reservations.filter(r => statuses.includes(r.latest_tracking_status || r.status)).length;
    });
    
    return counts;
  }, [reservations]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success("Données actualisées");
  }, [refetch]);

  // Resync selectedReservation when reservations data updates
  useEffect(() => {
    if (selectedReservation && reservations) {
      const updated = reservations.find((r: any) => r.id === selectedReservation.id);
      if (updated && updated !== selectedReservation) {
        setSelectedReservation(updated);
      }
    }
  }, [reservations, selectedReservation]);

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
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 py-4 pt-safe">
            <h1 className="text-xl font-bold">Suivi des colis</h1>
            <p className="text-sm text-muted-foreground">
              Suivez vos envois en temps réel
            </p>
          </div>
        </div>

        <div className="container px-4 py-8 max-w-lg mx-auto">
          {/* Hero CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              {/* Gradient Header */}
              <div className="bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"
                >
                  <Package className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Suivez vos colis
                </h2>
                <p className="text-white/80 text-sm">
                  Gardez un œil sur vos envois à chaque étape
                </p>
              </div>

              {/* Features */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Suivi en temps réel</h3>
                    <p className="text-xs text-muted-foreground">
                      Localisez vos colis à chaque étape du voyage
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Recevez des alertes à chaque mise à jour
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Sécurisé</h3>
                    <p className="text-xs text-muted-foreground">
                      Vos colis sont assurés pendant le transport
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="px-6 pb-6">
                <Button
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 text-base font-semibold"
                >
                  Créer un compte gratuit
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Déjà inscrit ?{" "}
                  <button 
                    onClick={() => navigate('/auth')}
                    className="text-primary font-medium hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </Card>
          </motion.div>
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
              <div className="space-y-3">
                {filteredReservations.map((reservation, index) => {
                  const listing = reservation.listing as {
                    departure: string;
                    arrival: string;
                    departure_date: string;
                    arrival_date: string;
                  } | null;

                  if (!listing) return null;

                  // Determine other user based on current user role
                  const isBuyer = reservation.buyer_id === user?.id;
                  const otherUser = isBuyer 
                    ? (reservation.seller as { full_name: string; avatar_url: string } | null)
                    : (reservation.buyer as { full_name: string; avatar_url: string } | null);

                    return (
                      <TrackingCard
                        key={reservation.id}
                        id={reservation.id}
                        departure={listing.departure}
                        arrival={listing.arrival}
                        status={(reservation as any).latest_tracking_status || reservation.status}
                        requestedKg={reservation.requested_kg}
                        arrivalDate={listing.arrival_date}
                        otherUserName={otherUser?.full_name}
                        otherUserAvatar={otherUser?.avatar_url}
                        index={index}
                        onClick={() => setSelectedReservation(reservation)}
                      />
                    );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Detail Sheet */}
        <Sheet open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">Suivi détaillé</SheetTitle>
            </SheetHeader>
            
            {selectedReservation && selectedReservation.listing && (
              <div className="overflow-y-auto max-h-[calc(85vh-80px)] pb-safe">
                <PackageTracker
                  reservationId={selectedReservation.id}
                  departure={(selectedReservation.listing as any).departure}
                  arrival={(selectedReservation.listing as any).arrival}
                  initialStatus={(selectedReservation as any).latest_tracking_status || selectedReservation.status}
                  sellerId={selectedReservation.seller_id}
                  buyerId={selectedReservation.buyer_id}
                  compact={false}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PullToRefresh>
  );
};

export default Tracking;
