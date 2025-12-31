import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

interface ReservationCardProps {
  id: string;
  otherUser: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  status: string;
  departure: string;
  arrival: string;
  requestedKg: number;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approuvée", className: "bg-success/10 text-success border-success/20" },
  in_progress: { label: "En cours", className: "bg-accent/10 text-accent border-accent/20" },
  delivered: { label: "Livrée", className: "bg-success/10 text-success border-success/20" },
};

const ReservationCard = ({
  id,
  otherUser,
  status,
  departure,
  arrival,
  requestedKg,
  lastMessage,
  unreadCount,
  updatedAt,
  onClick,
}: ReservationCardProps) => {
  const statusInfo = statusConfig[status] || { label: status, className: "bg-secondary text-secondary-foreground border-border/50" };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] text-left animate-fade-in relative border border-border/30"
    >
      {/* ID + Status badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-mono">
          #{id.slice(0, 6).toUpperCase()}
        </span>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0.5 border ${statusInfo.className}`}
        >
          {statusInfo.label}
        </Badge>
      </div>

      {/* Avatar */}
      <Avatar className="h-12 w-12 border-2 border-primary/20">
        <AvatarImage src={otherUser.avatar_url || ""} />
        <AvatarFallback className="bg-gradient-sky text-primary-foreground">
          {otherUser.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-24">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{otherUser.full_name}</h3>
          <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
            {new Date(updatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Route info */}
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-3 w-3 text-primary flex-shrink-0" />
          <p className="text-xs text-primary truncate">
            {departure} → {arrival} • {requestedKg} kg
          </p>
        </div>

        <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <Badge className="bg-primary text-primary-foreground animate-scale-in absolute bottom-3 right-3">
          {unreadCount}
        </Badge>
      )}
    </button>
  );
};

export default ReservationCard;
