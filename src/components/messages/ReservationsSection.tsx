import { Package, Archive } from "lucide-react";
import SwipeableReservationCard from "./SwipeableReservationCard";
import ReservationCard from "./ReservationCard";

interface Reservation {
  id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  archived_by_buyer_at?: string | null;
  archived_by_seller_at?: string | null;
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
  activeTab: "messages" | "archived";
  onTabChange: (tab: "messages" | "archived") => void;
  loading: boolean;
  searchQuery: string;
  onReservationClick: (id: string) => void;
  onArchiveReservation: (id: string) => void;
}

const ReservationsSection = ({
  reservations,
  currentUserId,
  activeTab,
  onTabChange,
  loading,
  searchQuery,
  onReservationClick,
  onArchiveReservation,
}: ReservationsSectionProps) => {
  
  // Check if reservation is archived for current user (including cancelled status)
  const isArchivedForUser = (res: Reservation) => {
    // Cancelled reservations are automatically treated as archived
    if (res.reservation.status === 'cancelled') return true;
    if (res.buyer_id === currentUserId && res.archived_by_buyer_at) return true;
    if (res.seller_id === currentUserId && res.archived_by_seller_at) return true;
    return false;
  };

  // Split reservations into active and archived (cancelled goes to archived)
  const activeReservations = reservations.filter((r) => !isArchivedForUser(r));
  const archivedReservations = reservations.filter((r) => isArchivedForUser(r));
  
  const displayedReservations = activeTab === "messages" ? activeReservations : archivedReservations;

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

  // Calculate total unread for active messages only
  const activeUnreadCount = activeReservations.reduce((acc, res) => acc + getUnreadCount(res), 0);

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
          {reservations.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => onTabChange("messages")}
          className={`relative flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "messages" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Package className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Messages ({activeReservations.length})
          {activeUnreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center px-1.5 text-xs font-bold rounded-full ${
              activeTab === "messages" 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-primary text-primary-foreground"
            }`}>
              {activeUnreadCount > 99 ? "99+" : activeUnreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("archived")}
          className={`relative flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "archived" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Archive className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
          Archivées ({archivedReservations.length})
        </button>
      </div>

      {/* Swipe hint for messages tab */}
      {activeTab === "messages" && activeReservations.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          ← Glissez vers la gauche pour archiver
        </p>
      )}

      {/* List */}
      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-10 animate-fade-in">
            {activeTab === "archived" ? (
              <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            ) : (
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            )}
            <h3 className="text-base font-semibold mb-1">
              {activeTab === "archived" ? "Aucune archive" : "Aucune réservation"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? "Aucun résultat pour cette recherche" 
                : activeTab === "archived" 
                  ? "Glissez une conversation vers la gauche pour l'archiver"
                  : "Vos réservations apparaîtront ici"
              }
            </p>
          </div>
        ) : (
          filteredReservations.map((res) => {
            const otherUser = getOtherUser(res);
            
            // Use swipeable card only for active messages
            if (activeTab === "messages") {
              return (
                <SwipeableReservationCard
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
                  onArchive={() => onArchiveReservation(res.id)}
                />
              );
            }
            
            // Regular card for archived
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
