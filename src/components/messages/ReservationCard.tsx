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
      className="w-full p-2.5 bg-card hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] text-left animate-fade-in border border-border/30"
    >
      {/* Row 1: Avatar + Name/Badge + Ref/Status */}
      <div className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9 border border-primary/20 flex-shrink-0">
          <AvatarImage src={otherUser.avatar_url || ""} />
          <AvatarFallback className="bg-gradient-sky text-primary-foreground text-xs">
            {otherUser.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <h3 className="font-medium truncate text-xs">{otherUser.full_name}</h3>
              <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[9px] text-muted-foreground font-mono">
                #{id.slice(0, 6).toUpperCase()}
              </span>
              <Badge
                variant="secondary"
                className={`text-[9px] px-1 py-0 h-4 border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Row 2: Date + Route */}
          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {new Date(updatedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })} à {new Date(updatedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div className="flex items-center gap-0.5">
              <Package className="h-2.5 w-2.5 text-primary flex-shrink-0" />
              <span className="text-[10px] text-primary font-medium">
                {departure} → {arrival} • {requestedKg} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Last message + Unread */}
      <div className="flex items-center justify-between gap-2 mt-1.5 pl-[46px]">
        <p className="text-[11px] text-muted-foreground truncate flex-1">{lastMessage}</p>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground text-[10px] h-4 min-w-4 px-1 flex items-center justify-center animate-scale-in">
            {unreadCount}
          </Badge>
        )}
      </div>
    </button>
  );
};

export default ReservationCard;
