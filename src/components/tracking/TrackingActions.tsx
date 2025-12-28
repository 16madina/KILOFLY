import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plane, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Navigation,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TrackingActionsProps {
  reservationId: string;
  currentStatus: string;
  isSeller: boolean;
  onStatusUpdate: (newStatus: string) => void;
}

const SELLER_ACTIONS = [
  { 
    fromStatus: 'approved', 
    toStatus: 'pickup_scheduled', 
    label: 'Récupération prévue',
    description: 'Indiquer que la récupération du colis est programmée',
    icon: MapPin,
    color: 'bg-purple-500'
  },
  { 
    fromStatus: 'pickup_scheduled', 
    toStatus: 'picked_up', 
    label: 'Colis récupéré',
    description: 'Confirmer que vous avez récupéré le colis',
    icon: Package,
    color: 'bg-indigo-500'
  },
  { 
    fromStatus: 'picked_up', 
    toStatus: 'in_transit', 
    label: 'En vol',
    description: 'Indiquer que vous êtes en route',
    icon: Plane,
    color: 'bg-sky-500'
  },
  { 
    fromStatus: 'in_transit', 
    toStatus: 'arrived', 
    label: 'Arrivé à destination',
    description: 'Confirmer votre arrivée à destination',
    icon: Navigation,
    color: 'bg-teal-500'
  },
  { 
    fromStatus: 'arrived', 
    toStatus: 'out_for_delivery', 
    label: 'Livraison en cours',
    description: 'Vous êtes en route pour livrer le colis',
    icon: Truck,
    color: 'bg-orange-500'
  },
  { 
    fromStatus: 'out_for_delivery', 
    toStatus: 'delivered', 
    label: 'Colis livré',
    description: 'Confirmer que le colis a été remis',
    icon: CheckCircle2,
    color: 'bg-emerald-500'
  },
  // Handle old status
  { 
    fromStatus: 'in_progress', 
    toStatus: 'arrived', 
    label: 'Arrivé à destination',
    description: 'Confirmer votre arrivée à destination',
    icon: Navigation,
    color: 'bg-teal-500'
  },
];

export function TrackingActions({ 
  reservationId, 
  currentStatus, 
  isSeller,
  onStatusUpdate 
}: TrackingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<typeof SELLER_ACTIONS[0] | null>(null);
  const { toast } = useToast();

  const availableAction = SELLER_ACTIONS.find(a => a.fromStatus === currentStatus);

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  };

  const handleAction = async (action: typeof SELLER_ACTIONS[0], withLocation: boolean = false) => {
    setLoading(true);
    
    try {
      let location: { lat: number; lng: number } | null = null;
      
      if (withLocation) {
        try {
          const position = await getCurrentLocation();
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch (e) {
          console.log('Could not get location:', e);
        }
      }

      // Create tracking event
      const { error: trackingError } = await supabase
        .from('tracking_events')
        .insert({
          reservation_id: reservationId,
          status: action.toStatus,
          description: action.description,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_name: locationName || null,
          is_automatic: false,
        });

      if (trackingError) throw trackingError;

      // Update reservation status if it's a major status change
      const majorStatuses = ['in_progress', 'delivered'];
      const mappedStatus = action.toStatus === 'in_transit' ? 'in_progress' : 
                          action.toStatus === 'delivered' ? 'delivered' : null;
      
      if (mappedStatus && majorStatuses.includes(mappedStatus)) {
        const { error: reservationError } = await supabase
          .from('reservations')
          .update({ status: mappedStatus })
          .eq('id', reservationId);

        if (reservationError) throw reservationError;
      }

      toast({
        title: "Statut mis à jour",
        description: `Le colis est maintenant: ${action.label}`,
      });

      onStatusUpdate(action.toStatus);
      setDialogOpen(false);
      setLocationName('');
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSeller || !availableAction || currentStatus === 'delivered') {
    return null;
  }

  const Icon = availableAction.icon;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Button 
            className="w-full h-14 text-base gap-3"
            onClick={() => setSelectedAction(availableAction)}
          >
            <div className={`w-8 h-8 rounded-full ${availableAction.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {availableAction.label}
          </Button>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${availableAction.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {availableAction.label}
          </DialogTitle>
          <DialogDescription>
            {availableAction.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Lieu (optionnel)
            </label>
            <Input
              placeholder="Ex: Aéroport CDG, Terminal 2E"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleAction(availableAction, false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Sans position GPS"
              )}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => handleAction(availableAction, true)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Avec ma position
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
