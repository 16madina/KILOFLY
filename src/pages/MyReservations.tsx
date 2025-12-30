import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, MapPin, User, Check, X, Clock, Truck, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReservationTimeline from "@/components/ReservationTimeline";
import ReservationChat from "@/components/ReservationChat";
import { PackageTracker } from "@/components/tracking/PackageTracker";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Reservation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  requested_kg: number;
  total_price: number;
  item_description: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "in_progress" | "delivered";
  created_at: string;
  buyer?: {
    full_name: string;
    avatar_url: string;
  };
  seller?: {
    full_name: string;
    avatar_url: string;
  };
  listing?: {
    departure: string;
    arrival: string;
    departure_date: string;
    arrival_date: string;
  };
}

const MyReservations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receivedReservations, setReceivedReservations] = useState<Reservation[]>([]);
  const [sentReservations, setSentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReservations();
      
      // Setup real-time subscription for reservations
      const channel = supabase
        .channel('reservations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
            filter: `buyer_id=eq.${user.id},seller_id=eq.${user.id}`,
          },
          () => {
            // Refetch when any reservation changes
            fetchReservations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchReservations = async () => {
    try {
      // Fetch received reservations (as seller)
      const { data: received, error: receivedError } = await supabase
        .from("reservations")
        .select(`
          *,
          buyer:profiles!buyer_id(full_name, avatar_url),
          listing:listings!listing_id(departure, arrival, departure_date, arrival_date)
        `)
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch sent reservations (as buyer)
      const { data: sent, error: sentError } = await supabase
        .from("reservations")
        .select(`
          *,
          seller:profiles!seller_id(full_name, avatar_url),
          listing:listings!listing_id(departure, arrival, departure_date, arrival_date)
        `)
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      setReceivedReservations((received as any) || []);
      setSentReservations((sent as any) || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (reservationId: string) => {
    setPendingApprovalId(reservationId);
    setLegalDialogOpen(true);
  };

  const handleApproveConfirmed = async () => {
    if (!pendingApprovalId) return;
    
    setApproving(true);
    try {
      // First approve the reservation
      const { error } = await supabase
        .from("reservations")
        .update({ status: "approved" })
        .eq("id", pendingApprovalId);

      if (error) throw error;

      // Then trigger payment process
      toast.success("Réservation approuvée");
      toast.info("Demande de paiement envoyée à l'acheteur...");

      // Call the payment processing edge function
      const { error: paymentError } = await supabase.functions.invoke('process-stripe-payment', {
        body: { reservationId: pendingApprovalId },
      });

      if (paymentError) {
        console.error("Error processing payment:", paymentError);
        toast.error("Erreur lors de l'envoi de la demande de paiement");
      } else {
        toast.success("Demande de paiement envoyée avec succès");
      }

      fetchReservations();
    } catch (error) {
      console.error("Error approving reservation:", error);
      toast.error("Erreur lors de l'approbation");
    } finally {
      setApproving(false);
      setLegalDialogOpen(false);
      setPendingApprovalId(null);
    }
  };

  const handleReject = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "rejected" })
        .eq("id", reservationId);

      if (error) throw error;

      toast.success("Réservation refusée");
      fetchReservations();
    } catch (error) {
      console.error("Error rejecting reservation:", error);
      toast.error("Erreur lors du refus");
    }
  };

  const handleMarkInProgress = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "in_progress" })
        .eq("id", reservationId);

      if (error) throw error;

      toast.success("Réservation marquée en cours de transport");
      fetchReservations();
    } catch (error) {
      console.error("Error marking in progress:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleOpenChat = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setChatOpen(true);
  };

  const handleMarkDelivered = async (reservationId: string) => {
    try {
      // Find the reservation to get listing_id
      const allReservations = [...receivedReservations, ...sentReservations];
      const currentReservation = allReservations.find(r => r.id === reservationId);
      
      if (!currentReservation) {
        toast.error("Réservation introuvable");
        return;
      }

      // Mark as delivered
      const { error } = await supabase
        .from("reservations")
        .update({ status: "delivered" })
        .eq("id", reservationId);

      if (error) throw error;

      // Get transaction with payment intent
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .select("stripe_payment_intent_id")
        .eq("listing_id", currentReservation.listing_id)
        .single();

      if (!transactionError && transaction?.stripe_payment_intent_id) {
        // Capture the payment (transfer money to seller)
        const { error: captureError } = await supabase.functions.invoke('capture-payment', {
          body: { 
            paymentIntentId: transaction.stripe_payment_intent_id,
            reservationId,
          },
        });

        if (captureError) {
          console.error("Error capturing payment:", captureError);
          toast.warning("Livraison confirmée mais erreur lors du transfert de paiement");
        } else {
          toast.success("Livraison confirmée et paiement transféré ! 🎉");
        }
      } else {
        toast.success("Livraison confirmée ! 🎉");
      }

      fetchReservations();
    } catch (error) {
      console.error("Error marking delivered:", error);
      toast.error("Erreur lors de la confirmation");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"><Check className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"><X className="h-3 w-3 mr-1" />Refusée</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20">Annulée</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"><Truck className="h-3 w-3 mr-1" />En transit</Badge>;
      case "delivered":
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Livrée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderReservationCard = (reservation: Reservation, isReceived: boolean) => {
    const otherUser = isReceived ? reservation.buyer : reservation.seller;
    const listing = reservation.listing;
    const UnreadBadge = () => {
      const unreadCount = useUnreadMessages(reservation.id);
      if (unreadCount === 0) return null;
      return (
        <Badge variant="destructive" className="ml-2">
          {unreadCount}
        </Badge>
      );
    };

    return (
      <Card key={reservation.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={otherUser?.avatar_url} />
                <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                  {otherUser?.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{otherUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(reservation.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            {getStatusBadge(reservation.status)}
          </div>

          <Separator />

          {/* Listing Info */}
          {listing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{listing.departure} → {listing.arrival}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(listing.departure_date).toLocaleDateString("fr-FR")} - {new Date(listing.arrival_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Reservation Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quantité</span>
              <span className="font-semibold">{reservation.requested_kg} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prix total</span>
              <span className="font-bold text-primary">{reservation.total_price.toFixed(2)}€</span>
            </div>
          </div>

          <Separator />

          {/* Package Tracker - Only show for approved, in_progress, or delivered reservations */}
          {["approved", "in_progress", "delivered", "pickup_scheduled", "picked_up", "in_transit", "arrived", "out_for_delivery"].includes(reservation.status) && listing && (
            <PackageTracker
              reservationId={reservation.id}
              departure={listing.departure}
              arrival={listing.arrival}
              initialStatus={reservation.status}
              sellerId={reservation.seller_id}
              compact={true}
            />
          )}

          {/* Reservation Timeline - Show for pending/rejected only */}
          {["pending", "rejected", "cancelled"].includes(reservation.status) && (
            <div>
              <h4 className="text-sm font-medium mb-3">Suivi de la réservation</h4>
              <ReservationTimeline status={reservation.status} />
            </div>
          )}

          <Separator />

          {/* Item Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Description des articles</span>
            </div>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-wrap">
              {reservation.item_description}
            </p>
          </div>

          {/* Actions */}
          {!isReceived && (
            <>
              {/* Buyer actions - Show payment button if approved */}
              {reservation.status === "approved" && (
                <Button
                  className="w-full bg-gradient-sky hover:opacity-90"
                  onClick={() => navigate(`/payment?reservation=${reservation.id}`)}
                >
                  💳 Procéder au paiement
                </Button>
              )}
            </>
          )}

          {isReceived && (
            <>
              {reservation.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApproveClick(reservation.id)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(reservation.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                </div>
              )}
              
              {reservation.status === "approved" && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleMarkInProgress(reservation.id)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Marquer "En cours de transport"
                </Button>
              )}
              
              {reservation.status === "in_progress" && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleMarkDelivered(reservation.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer la livraison
                </Button>
              )}
            </>
          )}

          {/* Chat Button - Available for all statuses except cancelled/rejected */}
          {!["rejected", "cancelled"].includes(reservation.status) && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => handleOpenChat(reservation)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Discuter sur cette réservation
              <UnreadBadge />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayedReservations = activeTab === "received" ? receivedReservations : sentReservations;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-sky text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Mes Réservations</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "received"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("received")}
        >
          Reçues ({receivedReservations.length})
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "sent"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("sent")}
        >
          Envoyées ({sentReservations.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {displayedReservations.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune réservation</h3>
            <p className="text-muted-foreground">
              {activeTab === "received"
                ? "Vous n'avez pas encore reçu de demande de réservation"
                : "Vous n'avez pas encore envoyé de demande de réservation"}
            </p>
          </div>
        ) : (
          displayedReservations.map((reservation) =>
            renderReservationCard(reservation, activeTab === "received")
          )
        )}
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discussion - Réservation</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <ReservationChat
              reservationId={selectedReservation.id}
              otherUserId={
                activeTab === "received"
                  ? selectedReservation.buyer_id
                  : selectedReservation.seller_id
              }
              otherUserName={
                activeTab === "received"
                  ? selectedReservation.buyer?.full_name || "Acheteur"
                  : selectedReservation.seller?.full_name || "Vendeur"
              }
              otherUserAvatar={
                activeTab === "received"
                  ? selectedReservation.buyer?.avatar_url
                  : selectedReservation.seller?.avatar_url
              }
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Legal Confirmation Dialog for Transporter */}
      <LegalConfirmationDialog
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
        onConfirm={handleApproveConfirmed}
        type="transporter"
        loading={approving}
      />
    </div>
  );
};

export default MyReservations;
