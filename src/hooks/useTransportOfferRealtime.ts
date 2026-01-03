import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

interface TransportOfferPayload {
  id: string;
  request_id: string;
  traveler_id: string;
  proposed_price: number | null;
  message: string | null;
  status: string;
  listing_id: string | null;
  reservation_id: string | null;
}

export const useTransportOfferRealtime = (onOfferUpdate?: () => void) => {
  const { user } = useAuth();
  const { showNotification, permission } = usePushNotifications();
  const userRequestsRef = useRef<Set<string>>(new Set());

  // Fetch user's transport requests to track
  const fetchUserRequests = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('transport_requests')
      .select('id')
      .eq('user_id', user.id);

    if (data) {
      userRequestsRef.current = new Set(data.map(r => r.id));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUserRequests();

    // Listen for new offers on user's requests
    const insertChannel = supabase
      .channel('transport-offers-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transport_offers',
        },
        async (payload) => {
          const newOffer = payload.new as TransportOfferPayload;

          // Check if this offer is for one of user's requests
          if (!userRequestsRef.current.has(newOffer.request_id)) return;

          // Get traveler info
          const { data: traveler } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newOffer.traveler_id)
            .single();

          // Get request route
          const { data: request } = await supabase
            .from('transport_requests')
            .select('departure, arrival')
            .eq('id', newOffer.request_id)
            .single();

          const travelerName = traveler?.full_name || 'Un voyageur';
          const route = request ? `${request.departure} → ${request.arrival}` : '';

          // Show in-app toast
          toast.success('🚀 Nouvelle proposition !', {
            description: `${travelerName} peut transporter votre colis${route ? ` sur ${route}` : ''}`,
          });

          // Show push notification
          if (permission === 'granted') {
            showNotification('🚀 Nouvelle proposition de transport', {
              body: `${travelerName} peut transporter votre colis${route ? ` sur ${route}` : ''}`,
              tag: `transport-offer-${newOffer.id}`,
            });
          }

          onOfferUpdate?.();
        }
      )
      .subscribe();

    // Listen for offer status updates
    const updateChannel = supabase
      .channel('transport-offers-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transport_offers',
        },
        async (payload) => {
          const updatedOffer = payload.new as TransportOfferPayload;
          const oldOffer = payload.old as Partial<TransportOfferPayload>;

          // Only notify on status change
          if (updatedOffer.status === oldOffer.status) return;

          // Check if this is user's request
          if (!userRequestsRef.current.has(updatedOffer.request_id)) return;

          // Get traveler info
          const { data: traveler } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', updatedOffer.traveler_id)
            .single();

          const travelerName = traveler?.full_name || 'Un voyageur';

          let title = '';
          let message = '';

          switch (updatedOffer.status) {
            case 'accepted':
              title = '✅ Offre acceptée';
              message = `Vous avez accepté l'offre de ${travelerName}. Procédez au paiement.`;
              break;
            case 'rejected':
              title = '❌ Offre refusée';
              message = `L'offre de ${travelerName} a été refusée.`;
              break;
            case 'cancelled':
              title = '🚫 Offre annulée';
              message = `${travelerName} a annulé son offre.`;
              break;
          }

          if (title) {
            toast.info(title, { description: message });

            if (permission === 'granted') {
              showNotification(title, {
                body: message,
                tag: `transport-offer-status-${updatedOffer.id}`,
              });
            }
          }

          onOfferUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [user, permission, showNotification, onOfferUpdate, fetchUserRequests]);

  // Re-fetch requests when user changes
  useEffect(() => {
    fetchUserRequests();
  }, [fetchUserRequests]);

  return { refetchRequests: fetchUserRequests };
};
