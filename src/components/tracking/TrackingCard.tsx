import { motion } from "framer-motion";
import { Package, Plane, MapPin, Clock, CheckCircle, Loader2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TrackingCardProps {
  id: string;
  departure: string;
  arrival: string;
  status: string;
  requestedKg: number;
  arrivalDate: string;
  index: number;
  onClick: () => void;
}

const STATUS_CONFIG: Record<string, { 
  label: string; 
  icon: React.ElementType;
  color: string;
  progress: number;
}> = {
  approved: { 
    label: "En attente", 
    icon: Clock,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    progress: 10
  },
  payment_received: { 
    label: "Paiement reçu", 
    icon: CreditCard,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    progress: 15
  },
  pickup_scheduled: { 
    label: "Prévu", 
    icon: Clock,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    progress: 20
  },
  picked_up: { 
    label: "Récupéré", 
    icon: Package,
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
    progress: 35
  },
  in_progress: { 
    label: "En transit", 
    icon: Plane,
    color: "bg-sky-500/10 text-sky-500 border-sky-500/30",
    progress: 50
  },
  in_transit: { 
    label: "En vol", 
    icon: Plane,
    color: "bg-sky-500/10 text-sky-500 border-sky-500/30",
    progress: 60
  },
  arrived: { 
    label: "Arrivé", 
    icon: MapPin,
    color: "bg-teal-500/10 text-teal-500 border-teal-500/30",
    progress: 80
  },
  out_for_delivery: { 
    label: "Livraison", 
    icon: Loader2,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    progress: 90
  },
  delivered: { 
    label: "Livré", 
    icon: CheckCircle,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    progress: 100
  },
};

export function TrackingCard({
  id,
  departure,
  arrival,
  status,
  requestedKg,
  arrivalDate,
  index,
  onClick,
}: TrackingCardProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.approved;
  const StatusIcon = config.icon;
  const refCode = `KF-${id.slice(0, 4).toUpperCase()}-${id.slice(4, 7).toUpperCase()}`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-4 bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 text-left transition-all hover:border-primary/30 hover:bg-card"
    >
      {/* Header: Icon + Ref + Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Colis</p>
            <p className="font-bold text-sm">{refCode}</p>
          </div>
        </div>
        
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-2 py-0.5 h-5 font-medium border", config.color)}
        >
          <StatusIcon className={cn("w-3 h-3 mr-1", status === "out_for_delivery" && "animate-spin")} />
          {config.label}
        </Badge>
      </div>

      {/* Route visualization */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-medium">{departure}</span>
        </div>
        
        <div className="flex-1 flex items-center gap-1 px-2">
          <div className="flex-1 h-px bg-border" />
          <Plane className="w-3.5 h-3.5 text-muted-foreground -rotate-45" />
          <div className="flex-1 h-px bg-border" />
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{arrival}</span>
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${config.progress}%` }}
          transition={{ duration: 0.8, delay: index * 0.08 + 0.2 }}
          className="h-full bg-primary rounded-full"
        />
      </div>

      {/* Footer: Weight + Date */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{requestedKg} kg</span>
        <span>
          {format(new Date(arrivalDate), "d MMM yyyy", { locale: fr })}
        </span>
      </div>
    </motion.button>
  );
}
