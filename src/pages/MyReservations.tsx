import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, MapPin, User, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  status: "pending" | "approved" | "rejected" | "cancelled";
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

  useEffect(() => {
    if (user) {
      fetchReservations();
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

  const handleApprove = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "approved" })
        .eq("id", reservationId);

      if (error) throw error;

      toast.success("Réservation approuvée");
      fetchReservations();
    } catch (error) {
      console.error("Error approving reservation:", error);
      toast.error("Erreur lors de l'approbation");
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderReservationCard = (reservation: Reservation, isReceived: boolean) => {
    const otherUser = isReceived ? reservation.buyer : reservation.seller;
    const listing = reservation.listing;

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
          {isReceived && reservation.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleApprove(reservation.id)}
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
    </div>
  );
};

export default MyReservations;
