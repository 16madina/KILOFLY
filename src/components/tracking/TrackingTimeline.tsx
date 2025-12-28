import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Plane, 
  MapPin, 
  Truck, 
  PartyPopper,
  Circle,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  is_automatic: boolean;
  created_at: string;
}

interface TrackingTimelineProps {
  reservationId: string;
  currentStatus: string;
}

const TRACKING_STEPS = [
  { status: 'pending', label: 'Demande envoyée', icon: Clock, color: 'text-amber-500' },
  { status: 'approved', label: 'Approuvée', icon: CheckCircle2, color: 'text-green-500' },
  { status: 'payment_completed', label: 'Paiement reçu', icon: Package, color: 'text-blue-500' },
  { status: 'pickup_scheduled', label: 'Récupération prévue', icon: MapPin, color: 'text-purple-500' },
  { status: 'picked_up', label: 'Colis récupéré', icon: Package, color: 'text-indigo-500' },
  { status: 'in_transit', label: 'En vol', icon: Plane, color: 'text-sky-500' },
  { status: 'arrived', label: 'Arrivé à destination', icon: Navigation, color: 'text-teal-500' },
  { status: 'out_for_delivery', label: 'Livraison en cours', icon: Truck, color: 'text-orange-500' },
  { status: 'delivered', label: 'Livré', icon: PartyPopper, color: 'text-emerald-500' },
];

// Map old statuses to new steps
const STATUS_MAP: Record<string, string> = {
  'pending': 'pending',
  'approved': 'approved',
  'in_progress': 'in_transit',
  'delivered': 'delivered',
};

export function TrackingTimeline({ reservationId, currentStatus }: TrackingTimelineProps) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`tracking-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_events',
          filter: `reservation_id=eq.${reservationId}`,
        },
        (payload) => {
          console.log('New tracking event:', payload);
          setEvents(prev => [...prev, payload.new as TrackingEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const mappedStatus = STATUS_MAP[currentStatus] || currentStatus;
  const currentStepIndex = TRACKING_STEPS.findIndex(s => s.status === mappedStatus);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-muted to-muted" />
      
      <div className="space-y-0">
        {TRACKING_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPast = index < currentStepIndex;
          const event = events.find(e => e.status === step.status || (STATUS_MAP[e.status] === step.status));
          const Icon = step.icon;

          return (
            <motion.div
              key={step.status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-4 pb-8 last:pb-0"
            >
              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-muted text-muted-foreground"
                )}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                    >
                      <Circle className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Pulse animation for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={cn(
                      "font-medium transition-colors",
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </h4>
                  {event && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.created_at)}
                    </span>
                  )}
                </div>
                
                {event?.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {event.description}
                  </p>
                )}
                
                {event?.location_name && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location_name}</span>
                  </div>
                )}

                {/* GPS coordinates if available */}
                {event?.location_lat && event?.location_lng && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-2 rounded-lg bg-muted/50 text-xs"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Navigation className="w-3 h-3" />
                      <span>
                        {event.location_lat.toFixed(4)}°, {event.location_lng.toFixed(4)}°
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
