import { Package } from "lucide-react";
import ReservationCard from "./ReservationCard";

interface Reservation {
  id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  buyer: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  seller: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  messages: Array<{
    content: string;
    created_at: string;
    sender_id: string;
    read: boolean;
  }>;
  reservation: {
    requested_kg: number;
    status: string;
    listing?: {
      departure: string;
      arrival: string;
    };
  };
}

interface ReservationsSectionProps {
  reservations: Reservation[];
  currentUserId: string;
  activeTab: "received" | "sent";
  onTabChange: (tab: "received" | "sent") => void;
  loading: boolean;
  searchQuery: string;
  onReservationClick: (id: string) => void;
}

const ReservationsSection = ({
  reservations,
  currentUserId,
  activeTab,
  onTabChange,
  loading,
  searchQuery,
  onReservationClick,
}: ReservationsSectionProps) => {
  const receivedReservations = reservations.filter((r) => r.seller_id === currentUserId);
  const sentReservations = reservations.filter((r) => r.buyer_id === currentUserId);
  const displayedReservations = activeTab === "received" ? receivedReservations : sentReservations;

  const getOtherUser = (res: Reservation) => {
    return res.buyer_id === currentUserId ? res.seller : res.buyer;
  };

  const getLastMessage = (res: Reservation) => {
    if (!res.messages || res.messages.length === 0) return "Aucun message";
    const sorted = [...res.messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0].content;
  };

  const getUnreadCount = (res: Reservation) => {
    if (!res.messages) return 0;
    return res.messages.filter((msg) => msg.sender_id !== currentUserId && !msg.read).length;
  };

  const filteredReservations = displayedReservations.filter((res) => {
    const otherUser = getOtherUser(res);
    return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <section aria-label="Réservations">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-semibold text-foreground">Réservations</h2>
        <span className="text-xs text-muted-foreground">
          {receivedReservations.length + sentReservations.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => onTabChange("received")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "received" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Reçues ({receivedReservations.length})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("sent")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "sent" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Envoyées ({sentReservations.length})
        </button>
      </div>

      {/* List */}
      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-10 animate-fade-in">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">Aucune réservation</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Aucun résultat pour cette recherche" : "Vos réservations apparaîtront ici"}
            </p>
          </div>
        ) : (
          filteredReservations.map((res) => {
            const otherUser = getOtherUser(res);
            return (
              <ReservationCard
                key={res.id}
                id={res.id}
                otherUser={otherUser}
                status={res.reservation.status}
                departure={res.reservation.listing?.departure || ""}
                arrival={res.reservation.listing?.arrival || ""}
                requestedKg={res.reservation.requested_kg}
                lastMessage={getLastMessage(res)}
                unreadCount={getUnreadCount(res)}
                updatedAt={res.updated_at}
                onClick={() => onReservationClick(res.id)}
              />
            );
          })
        )}
      </div>
    </section>
  );
};

export default ReservationsSection;
