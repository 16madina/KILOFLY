import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackingTimeline } from './TrackingTimeline';
import { TrackingMap } from './TrackingMap';
import { TrackingActions } from './TrackingActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PackageTrackerProps {
  reservationId: string;
  departure: string;
  arrival: string;
  initialStatus: string;
  sellerId: string;
  compact?: boolean;
}

export function PackageTracker({ 
  reservationId, 
  departure, 
  arrival, 
  initialStatus,
  sellerId,
  compact = false 
}: PackageTrackerProps) {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [expanded, setExpanded] = useState(!compact);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  
  const isSeller = user?.id === sellerId;

  // Check if payment has been made
  useEffect(() => {
    const checkPaymentStatus = async () => {
      setCheckingPayment(true);
      try {
        // Check if there's a completed transaction for this reservation
        const { data: transaction } = await supabase
          .from('transactions')
          .select('id, payment_status')
          .eq('listing_id', reservationId)
          .in('payment_status', ['completed', 'captured', 'authorized'])
          .maybeSingle();

        if (transaction) {
          setIsPaid(true);
        } else {
          // Also check by looking at reservation's linked listing
          const { data: reservationData } = await supabase
            .from('reservations')
            .select('listing_id')
            .eq('id', reservationId)
            .single();

          if (reservationData) {
            const { data: txByListing } = await supabase
              .from('transactions')
              .select('id, payment_status')
              .eq('listing_id', reservationData.listing_id)
              .in('payment_status', ['completed', 'captured', 'authorized'])
              .limit(1)
              .maybeSingle();

            setIsPaid(!!txByListing);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [reservationId]);

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
      'payment_completed': 'Paiement reçu',
      'pickup_scheduled': 'Récupération prévue',
      'picked_up': 'Colis récupéré',
      'in_transit': 'En vol',
      'in_progress': 'En transit',
      'arrived': 'Arrivé',
      'out_for_delivery': 'Livraison en cours',
      'delivered': 'Livré',
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

          {/* Payment warning for seller if not paid */}
          {isSeller && !isPaid && !checkingPayment && currentStatus === 'approved' && (
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                En attente du paiement de l'expéditeur. Vous pourrez récupérer le colis une fois le paiement effectué.
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
