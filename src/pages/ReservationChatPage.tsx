import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Package, ArrowRight, MoreVertical, Phone, Info, Truck, HandHeart, ChevronDown, ChevronUp, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReservationChat from "@/components/ReservationChat";
import { ReportDialog } from "@/components/ReportDialog";
import { BlockUserDialog } from "@/components/BlockUserDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
interface ReservationDetails {
  id: string;
  requested_kg: number;
  total_price: number;
  item_description: string;
  status: string;
  buyer_id: string;
  seller_id: string;
  pickup_address: string | null;
  pickup_notes: string | null;
  recipient_phone: string | null;
  delivery_method: string | null;
  listing?: {
    departure: string;
    arrival: string;
    departure_date: string;
    currency: string;
  };
  buyer?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  seller?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const ReservationChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryDetailsOpen, setDeliveryDetailsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchReservation();
  }, [id, user, navigate]);

  const fetchReservation = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        listing:listings(departure, arrival, departure_date, currency),
        buyer:profiles!reservations_buyer_id_fkey(id, full_name, avatar_url),
        seller:profiles!reservations_seller_id_fkey(id, full_name, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching reservation:", error);
      navigate("/messages");
      return;
    }

    setReservation(data as ReservationDetails);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      delivered: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      approved: "Approuvée",
      rejected: "Refusée",
      in_progress: "En cours",
      delivered: "Livrée",
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (!user) return null;

  // Determine the other user (the one we're chatting with)
  const otherUser = reservation?.buyer_id === user.id ? reservation?.seller : reservation?.buyer;

  return (
    <div className="h-screen bg-background flex flex-col pb-24 mb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe flex-shrink-0">
        <div className="container px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="transition-all duration-200 hover:scale-110"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Chat de la réservation</h1>
            </div>
            
            {/* Report/Block Menu */}
            {otherUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <ReportDialog
                      reportedUserId={otherUser.id}
                      reportedUserName={otherUser.full_name}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <BlockUserDialog
                      userId={otherUser.id}
                      userName={otherUser.full_name}
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="container px-4 sm:px-6 py-4 space-y-4 flex-1">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : reservation ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Reservation Context - compact */}
          <div className="container px-4 sm:px-6 py-3 flex-shrink-0 space-y-3">
            {/* Route and Status */}
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium">{reservation.listing?.departure}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{reservation.listing?.arrival}</span>
                </div>
                {getStatusBadge(reservation.status)}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{reservation.listing ? new Date(reservation.listing.departure_date).toLocaleDateString('fr-FR') : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{reservation.requested_kg} kg</span>
                </div>
                <span className="font-semibold text-primary">
                  {reservation.total_price} {reservation.listing?.currency}
                </span>
              </div>
              {/* Delivery method - clickable collapsible */}
              <Collapsible open={deliveryDetailsOpen} onOpenChange={setDeliveryDetailsOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full">
                  {reservation.delivery_method === "shipping" ? (
                    <>
                      <Truck className="h-3 w-3" />
                      <span>Envoi par transporteur</span>
                    </>
                  ) : (
                    <>
                      <HandHeart className="h-3 w-3" />
                      <span>Remise en main propre</span>
                    </>
                  )}
                  {deliveryDetailsOpen ? (
                    <ChevronUp className="h-3 w-3 ml-auto" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                  <div className="space-y-2 text-xs">
                    {/* Buyer name */}
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{reservation.buyer?.full_name}</span>
                    </div>
                    
                    {/* Requested kg */}
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{reservation.requested_kg} kg demandés</span>
                    </div>
                    
                    {/* Phone - masked if not paid */}
                    {reservation.recipient_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        {['paid', 'completed', 'delivered', 'payment_received', 'picked_up', 'in_transit', 'in_progress', 'arrived', 'out_for_delivery'].includes(reservation.status) ? (
                          <a 
                            href={`tel:${reservation.recipient_phone}`}
                            className="text-primary hover:underline"
                          >
                            {reservation.recipient_phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Visible après paiement
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Pickup address for handover */}
                    {reservation.delivery_method !== "shipping" && reservation.pickup_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>{reservation.pickup_address}</span>
                      </div>
                    )}
                    
                    {/* Pickup notes for handover */}
                    {reservation.delivery_method !== "shipping" && reservation.pickup_notes && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span className="italic">{reservation.pickup_notes}</span>
                      </div>
                    )}
                    
                    {/* Shipping notice */}
                    {reservation.delivery_method === "shipping" && (
                      <p className="text-muted-foreground p-2 bg-amber-500/10 rounded-lg">
                        <Truck className="h-3 w-3 inline mr-1" />
                        Convenez des détails d'envoi dans le chat.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* Chat - takes remaining space */}
          {otherUser && (
            <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4">
              <ReservationChat
                key={reservation.id}
                reservationId={reservation.id}
                otherUserId={otherUser.id}
                otherUserName={otherUser.full_name}
                otherUserAvatar={otherUser.avatar_url}
                reservationStatus={reservation.status}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ReservationChatPage;
