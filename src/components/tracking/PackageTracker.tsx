import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, CreditCard, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackingTimeline } from './TrackingTimeline';
import { TrackingMap } from './TrackingMap';
import { TrackingActions } from './TrackingActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PackageTrackerProps {
  reservationId: string;
  departure: string;
  arrival: string;
  initialStatus: string;
  sellerId: string;
  buyerId?: string;
  compact?: boolean;
}

export function PackageTracker({ 
  reservationId, 
  departure, 
  arrival, 
  initialStatus,
  sellerId,
  buyerId,
  compact = false 
}: PackageTrackerProps) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [expanded, setExpanded] = useState(!compact);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [listingId, setListingId] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [cancelling, setCancelling] = useState(false);
  
  const isSeller = user?.id === sellerId;
  const isBuyer = user?.id === buyerId;

  // Check if payment has been made and subscribe to realtime updates
  useEffect(() => {
    const checkPaymentStatus = async () => {
      setCheckingPayment(true);
      try {
        // First get the listing_id and total_price from the reservation
        const { data: reservationData } = await supabase
          .from('reservations')
          .select('listing_id, total_price, listing:listings(currency)')
          .eq('id', reservationId)
          .single();

        if (reservationData) {
          setListingId(reservationData.listing_id);
          setTotalPrice(reservationData.total_price);
          if (reservationData.listing && typeof reservationData.listing === 'object' && 'currency' in reservationData.listing) {
            setCurrency((reservationData.listing as any).currency || 'EUR');
          }
          
          const { data: txByListing } = await supabase
            .from('transactions')
            .select('id, payment_status')
            .eq('listing_id', reservationData.listing_id)
            .in('payment_status', ['completed', 'captured', 'authorized', 'paid'])
            .limit(1)
            .maybeSingle();

          setIsPaid(!!txByListing);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setCheckingPayment(false);
      }
    };

    checkPaymentStatus();

    // Subscribe to realtime transaction updates
    const transactionChannel = supabase
      .channel(`payment-status-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const transaction = payload.new as any;
          if (transaction && listingId && transaction.listing_id === listingId) {
            if (['completed', 'captured', 'authorized', 'paid'].includes(transaction.payment_status)) {
              setIsPaid(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
    };
  }, [reservationId, listingId]);

  const handlePayNow = () => {
    navigate(`/payment?reservation=${reservationId}`);
  };

  const handleCancelReservation = async () => {
    setCancelling(true);
    try {
      // Get a fresh access token
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Session expirée", {
          description: "Veuillez vous reconnecter pour effectuer cette action",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('cancel-reservation', {
        body: { reservationId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        // Parse the error response for specific status codes
        const errorMessage = error.message || "";
        if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
          toast.error("Session expirée", {
            description: "Veuillez vous reconnecter pour effectuer cette action",
          });
          return;
        }
        if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
          toast.error("Action non autorisée", {
            description: "Vous ne pouvez annuler que vos propres réservations",
          });
          return;
        }
        if (errorMessage.includes("409")) {
          toast.error("Annulation impossible", {
            description: "Le paiement a déjà été effectué pour cette réservation",
          });
          return;
        }
        throw error;
      }

      if (!data?.success) {
        // Handle 409 from data.error
        if (data?.error?.includes("Payment already")) {
          toast.error("Annulation impossible", {
            description: "Le paiement a déjà été effectué pour cette réservation",
          });
          return;
        }
        throw new Error(data?.error || "Annulation impossible");
      }

      toast.success("Réservation annulée", {
        description: "La réservation a été annulée et le voyageur a été notifié",
      });

      setCurrentStatus('cancelled');

      // Invalidate tracking reservations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tracking-reservations', user?.id] });
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      toast.error(error?.message || "Erreur lors de l'annulation");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    // Fetch latest tracking event with location
    const fetchLatestLocation = async () => {
      const { data } = await supabase
        .from('tracking_events')
        .select('location_lat, location_lng, location_name, status')
        .eq('reservation_id', reservationId)
        .not('location_lat', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.location_lat && data.location_lng) {
        setCurrentLocation({
          lat: Number(data.location_lat),
          lng: Number(data.location_lng),
          name: data.location_name || undefined,
        });
        setCurrentStatus(data.status);
      }
    };

    fetchLatestLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`tracker-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracking_events',
          filter: `reservation_id=eq.${reservationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new as any;
            setCurrentStatus(newEvent.status);
            if (newEvent.location_lat && newEvent.location_lng) {
              setCurrentLocation({
                lat: Number(newEvent.location_lat),
                lng: Number(newEvent.location_lng),
                name: newEvent.location_name || undefined,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId]);

  const handleStatusUpdate = (newStatus: string) => {
    setCurrentStatus(newStatus);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'approved': 'Approuvée',
      'payment_received': 'Paiement confirmé',
      'payment_completed': 'Paiement reçu',
      'pickup_scheduled': 'Récupération prévue',
      'picked_up': 'Colis récupéré',
      'in_transit': 'En vol',
      'in_progress': 'En transit',
      'arrived': 'Arrivé',
      'out_for_delivery': 'Livraison en cours',
      'delivered': 'Livré',
      'cancelled': 'Annulée',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'text-emerald-500';
    if (status === 'rejected' || status === 'cancelled') return 'text-destructive';
    if (['in_transit', 'in_progress', 'arrived', 'out_for_delivery'].includes(status)) return 'text-primary';
    return 'text-amber-500';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/50",
          compact && "pb-3"
        )}
        onClick={() => compact && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span>Suivi du colis</span>
              <p className={cn("text-sm font-medium mt-0.5", getStatusColor(currentStatus))}>
                {getStatusLabel(currentStatus)}
              </p>
            </div>
          </CardTitle>
          
          {compact && (
            <Button variant="ghost" size="icon">
              {expanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <motion.div
        initial={compact ? { height: 0 } : { height: 'auto' }}
        animate={{ height: expanded ? 'auto' : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <CardContent className="space-y-6">
          {/* Map visualization */}
          <TrackingMap
            departure={departure}
            arrival={arrival}
            currentStatus={currentStatus}
            currentLocation={currentLocation || undefined}
          />

          {/* Payment status messages for seller */}
          {isSeller && !checkingPayment && currentStatus === 'approved' && !isPaid && (
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                En attente du paiement de l'expéditeur. Vous pourrez récupérer le colis une fois le paiement effectué.
              </AlertDescription>
            </Alert>
          )}

          {/* Seller sees payment received - needs to confirm */}
          {isSeller && isPaid && currentStatus === 'approved' && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400 font-medium">
                💰 Paiement reçu ! Confirmez la réception pour passer à l'étape suivante.
              </AlertDescription>
            </Alert>
          )}

          {/* Pay now button for buyer if not paid */}
          {isBuyer && !isPaid && !checkingPayment && currentStatus === 'approved' && (
            <Alert className="bg-primary/10 border-primary/20">
              <CreditCard className="h-4 w-4 text-primary" />
              <AlertDescription className="flex flex-col gap-3">
                <div className="text-foreground">
                  <p>Le voyageur a accepté votre réservation.</p>
                  {totalPrice && (
                    <p className="font-semibold text-lg mt-1">
                      Montant à payer : {totalPrice.toFixed(2)} {currency}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handlePayNow}
                    className="whitespace-nowrap flex-1"
                    size="sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer maintenant
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="whitespace-nowrap text-destructive border-destructive/50 hover:bg-destructive/10"
                        size="sm"
                        disabled={cancelling}
                      >
                        {cancelling ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Annuler
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir annuler cette réservation ? Le voyageur sera notifié de votre décision.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Non, garder</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCancelReservation}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Oui, annuler
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Buyer sees payment confirmation pending */}
          {isBuyer && isPaid && currentStatus === 'approved' && (
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-600 dark:text-blue-400">
                ✅ Paiement effectué ! En attente de confirmation du voyageur.
              </AlertDescription>
            </Alert>
          )}

          {/* Seller action button - only show if paid */}
          {isPaid && (
            <TrackingActions
              reservationId={reservationId}
              currentStatus={currentStatus}
              isSeller={isSeller}
              onStatusUpdate={handleStatusUpdate}
            />
          )}

          {/* Timeline */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">
              Historique du suivi
            </h4>
            <TrackingTimeline
              reservationId={reservationId}
              currentStatus={currentStatus}
            />
          </div>
        </CardContent>
      </motion.div>
    </Card>
  );
}
