import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import SwipeableCard from "@/components/mobile/SwipeableCard";

interface ConversationCardProps {
  id: string;
  otherUser: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  onClick: () => void;
  onDelete: () => void;
}

const ConversationCard = ({
  id,
  otherUser,
  lastMessage,
  unreadCount,
  updatedAt,
  onClick,
  onDelete,
}: ConversationCardProps) => {
  return (
    <SwipeableCard
      onSwipeLeft={onDelete}
      leftAction={
        <div className="flex items-center justify-center w-12 h-12 bg-destructive rounded-full">
          <Trash2 className="h-4 w-4 text-destructive-foreground" />
        </div>
      }
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] text-left animate-fade-in border border-border/30"
      >
        {/* Avatar */}
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={otherUser.avatar_url || ""} />
          <AvatarFallback className="bg-gradient-sky text-primary-foreground">
            {otherUser.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{otherUser.full_name}</h3>
            <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
              {new Date(updatedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground animate-scale-in">
            {unreadCount}
          </Badge>
        )}
      </button>
    </SwipeableCard>
  );
};

export default ConversationCard;
