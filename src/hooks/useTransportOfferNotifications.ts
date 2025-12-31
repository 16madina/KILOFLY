import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';

export const useTransportOfferNotifications = () => {
  const { user } = useAuth();
  const { showNotification, permission } = usePushNotifications();

  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const channel = supabase
      .channel('transport-offer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transport_offers',
        },
        async (payload) => {
          const newOffer = payload.new as {
            id: string;
            request_id: string;
            traveler_id: string;
            proposed_price: number | null;
            message: string | null;
          };

          // Check if this offer is for one of our requests
          const { data: request } = await supabase
            .from('transport_requests')
            .select('user_id, departure, arrival')
            .eq('id', newOffer.request_id)
            .single();

          if (!request || request.user_id !== user.id) return;

          // Get traveler name
          const { data: traveler } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newOffer.traveler_id)
            .single();

          const travelerName = traveler?.full_name || 'Un voyageur';
          const route = `${request.departure} → ${request.arrival}`;

          showNotification('🚀 Nouvelle proposition de transport', {
            body: `${travelerName} peut transporter votre colis sur ${route}`,
            tag: `transport-offer-${newOffer.id}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission, showNotification]);
};
