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
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Calendar className="w-5 h-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Membre depuis</p>
          <p className="text-sm font-semibold">
            {formatDistanceToNow(new Date(memberSince), { locale: fr })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Luggage className="w-5 h-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Voyages complétés</p>
          <p className="text-sm font-semibold">{completedTrips}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <MessageCircle className="w-5 h-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Taux de réponse</p>
          <p className="text-sm font-semibold">{responseRate}%</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Clock className="w-5 h-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Temps de réponse</p>
          <p className="text-sm font-semibold">{formatResponseTime(avgResponseTime)}</p>
        </div>
      </div>
    </div>
  );
};
