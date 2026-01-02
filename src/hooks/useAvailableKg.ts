import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the real available kg for a listing
 * This calculates available_kg - sum of approved/in_progress reservations
 */
export function useAvailableKg(listingId: string) {
  const [availableKg, setAvailableKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    const fetchAvailableKg = async () => {
      setLoading(true);
      try {
        // Call the database function directly
        const { data, error } = await supabase
          .rpc('get_available_kg', { listing_id_param: listingId });

        if (error) {
          console.error('Error fetching available kg:', error);
          // Fallback to original available_kg
          const { data: listing } = await supabase
            .from('listings')
            .select('available_kg')
            .eq('id', listingId)
            .single();
          setAvailableKg(listing?.available_kg ?? 0);
        } else {
          setAvailableKg(data ?? 0);
        }
      } catch (error) {
        console.error('Error in useAvailableKg:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableKg();

    // Subscribe to reservation changes for this listing
    const channel = supabase
      .channel(`available-kg-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          // Refetch when reservations change
          fetchAvailableKg();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  return { availableKg, loading };
}

/**
 * Utility function to get available kg for a listing (non-hook version)
 */
export async function getAvailableKg(listingId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_available_kg', { listing_id_param: listingId });

  if (error) {
    console.error('Error fetching available kg:', error);
    // Fallback
    const { data: listing } = await supabase
      .from('listings')
      .select('available_kg')
      .eq('id', listingId)
      .single();
    return listing?.available_kg ?? 0;
  }

  return data ?? 0;
}
