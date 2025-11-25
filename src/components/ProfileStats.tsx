import { Calendar, MessageCircle, Clock, Luggage } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ProfileStatsProps {
  memberSince: string;
  completedTrips: number;
  responseRate: number;
  avgResponseTime: number | null;
}

export const ProfileStats = ({ memberSince, completedTrips, responseRate, avgResponseTime }: ProfileStatsProps) => {
  const formatResponseTime = (minutes: number | null) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="p-2 rounded-md bg-primary/10">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">Membre depuis</p>
          <p className="text-sm font-semibold truncate">
            {formatDistanceToNow(new Date(memberSince), { locale: fr })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="p-2 rounded-md bg-primary/10">
          <Luggage className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">Voyages complétés</p>
          <p className="text-sm font-semibold">{completedTrips}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="p-2 rounded-md bg-primary/10">
          <MessageCircle className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">Taux de réponse</p>
          <p className="text-sm font-semibold">{responseRate}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="p-2 rounded-md bg-primary/10">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">Temps de réponse</p>
          <p className="text-sm font-semibold">{formatResponseTime(avgResponseTime)}</p>
        </div>
      </div>
    </div>
  );
};
