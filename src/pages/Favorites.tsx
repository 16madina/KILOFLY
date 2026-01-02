import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ListingCard from '@/components/ListingCard';
import { motion } from 'framer-motion';

export default function Favorites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      
      // First get favorites
      const { data: favoritesData, error: favError } = await supabase
        .from('favorites')
        .select('id, listing_id, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (favError) throw favError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Get listing IDs
      const listingIds = favoritesData.map(f => f.listing_id);

      // Fetch listings with real available kg from the view
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings_with_available_kg')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            id_verified
          )
        `)
        .in('id', listingIds);

      if (listingsError) throw listingsError;

      // Combine favorites with listings data
      const combinedData = favoritesData.map(fav => ({
        ...fav,
        listings: listingsData?.find(l => l.id === fav.listing_id)
      })).filter(fav => fav.listings); // Filter out any with missing listings

      setFavorites(combinedData);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      toast.error('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      toast.success('Favori retiré');
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mes Favoris</h1>
              <p className="text-sm text-muted-foreground">
                {favorites.length} annonce{favorites.length !== 1 ? 's' : ''} sauvegardée{favorites.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Aucun favori</h2>
            <p className="text-muted-foreground mb-6">
              Commencez à sauvegarder des annonces pour les retrouver facilement
            </p>
            <Button onClick={() => navigate('/')}>
              Explorer les annonces
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite, index) => {
              const listing = favorite.listings;
              const profile = favorite.listings.profiles;
              
              return (
                <ListingCard
                  key={favorite.id}
                  id={listing.id}
                  userId={listing.user_id}
                  userName={profile.full_name}
                  userAvatar={profile.avatar_url}
                  departure={listing.departure}
                  arrival={listing.arrival}
                  departureDate={new Date(listing.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  arrivalDate={new Date(listing.arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  availableKg={listing.real_available_kg ?? listing.available_kg}
                  originalKg={listing.available_kg}
                  pricePerKg={listing.price_per_kg}
                  currency={listing.currency}
                  destinationImage={listing.destination_image}
                  isFavorited={true}
                  onFavoriteToggle={() => handleRemoveFavorite(favorite.id)}
                  allowedItems={listing.allowed_items || []}
                  prohibitedItems={listing.prohibited_items || []}
                  description={listing.description}
                  index={index}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}