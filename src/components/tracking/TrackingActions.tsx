import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plane, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Navigation,
  Loader2,
  Camera,
  User
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
    toStatus: 'payment_received', 
    label: 'Paiement reçu',
    description: 'Confirmer la réception du paiement',
    icon: CheckCircle2,
    color: 'bg-emerald-500'
  },
  { 
    fromStatus: 'payment_received', 
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
    color: 'bg-emerald-500',
    requiresDeliveryInfo: true
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const availableAction = SELLER_ACTIONS.find(a => a.fromStatus === currentStatus);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimpleAction = async (action: typeof SELLER_ACTIONS[0]) => {
    setLoading(true);
    
    try {
      // Create tracking event
      const { error: trackingError } = await supabase
        .from('tracking_events')
        .insert({
          reservation_id: reservationId,
          status: action.toStatus,
          description: action.description,
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

  const handleDeliveryConfirmation = async () => {
    if (!availableAction) return;
    
    if (!recipientName.trim()) {
      toast({
        title: "Destinataire requis",
        description: "Veuillez indiquer à qui vous avez remis le colis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (proofPhoto) {
        const fileExt = proofPhoto.name.split('.').pop();
        const fileName = `delivery-${reservationId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('id-documents')
          .upload(`delivery-proofs/${fileName}`, proofPhoto);

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
        } else {
          const { data } = supabase.storage
            .from('id-documents')
            .getPublicUrl(`delivery-proofs/${fileName}`);
          photoUrl = data.publicUrl;
        }
      }

      // Create tracking event with delivery info
      const { error: trackingError } = await supabase
        .from('tracking_events')
        .insert({
          reservation_id: reservationId,
          status: 'delivered',
          description: `Remis à: ${recipientName}${photoUrl ? ' (photo de confirmation)' : ''}`,
          is_automatic: false,
        });

      if (trackingError) throw trackingError;

      // Update reservation status
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ status: 'delivered' })
        .eq('id', reservationId);

      if (reservationError) throw reservationError;

      toast({
        title: "Livraison confirmée ! 🎉",
        description: `Colis remis à ${recipientName}`,
      });

      onStatusUpdate('delivered');
      setDialogOpen(false);
      setRecipientName('');
      setProofPhoto(null);
      setPhotoPreview(null);
      
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la livraison",
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
  const requiresDeliveryInfo = 'requiresDeliveryInfo' in availableAction && availableAction.requiresDeliveryInfo;

  // For delivery action, show dialog
  if (requiresDeliveryInfo) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Button 
            className="w-full h-14 text-base gap-3"
            onClick={() => setDialogOpen(true)}
            disabled={loading}
          >
            <div className={`w-8 h-8 rounded-full ${availableAction.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {availableAction.label}
          </Button>
        </motion.div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${availableAction.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                Confirmer la livraison
              </DialogTitle>
              <DialogDescription>
                Indiquez à qui vous avez remis le colis et prenez une photo comme preuve
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Recipient Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Remis à *
                </label>
                <Input
                  placeholder="Nom du destinataire"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              {/* Photo Capture */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Photo de confirmation (optionnel)
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preuve de livraison" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Reprendre
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-6 h-6" />
                    <span>Prendre une photo</span>
                  </Button>
                )}
              </div>

              <Button
                className="w-full h-12 gap-2"
                onClick={handleDeliveryConfirmation}
                disabled={loading || !recipientName.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmer la livraison
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // For simple actions, just a button with direct action
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Button 
        className="w-full h-14 text-base gap-3"
        onClick={() => handleSimpleAction(availableAction)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <div className={`w-8 h-8 rounded-full ${availableAction.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {availableAction.label}
          </>
        )}
      </Button>
    </motion.div>
  );
}
