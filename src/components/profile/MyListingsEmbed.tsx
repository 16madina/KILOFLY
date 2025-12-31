import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Package, Edit, Trash2, Archive, CheckCircle, Clock, RotateCcw, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface Listing {
  id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  price_per_kg: number;
  status: string;
  description: string | null;
  created_at: string;
}

type ListingStatus = 'active' | 'expired' | 'completed' | 'archived';

const getListingStatus = (listing: Listing): ListingStatus => {
  const arrivalDate = new Date(listing.arrival_date);
  const archiveDate = addDays(arrivalDate, 3);

  if (listing.status === 'archived') return 'archived';
  if (listing.status === 'completed') return 'completed';
  if (isPast(archiveDate)) return 'archived';
  if (isPast(arrivalDate)) return 'expired';
  return 'active';
};

const getStatusBadge = (status: ListingStatus) => {
  switch (status) {
    case 'active':
      return { label: 'Active', icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/20' };
    case 'expired':
      return { label: 'Expirée', icon: Clock, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
    case 'completed':
      return { label: 'Terminée', icon: CheckCircle, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    case 'archived':
      return { label: 'Archivée', icon: Archive, className: 'bg-muted text-muted-foreground' };
  }
};

export const MyListingsEmbed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Annonce supprimée");
      fetchListings();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <Card className="p-6 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">Aucune annonce de voyage</p>
        <Button size="sm" onClick={() => navigate('/post-listing')}>
          <Plus className="h-4 w-4 mr-1" />
          Créer une annonce
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const status = getListingStatus(listing);
        const statusInfo = getStatusBadge(status);
        const StatusIcon = statusInfo.icon;

        return (
          <Card key={listing.id} className={`overflow-hidden backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10 ${status === 'archived' ? 'opacity-60' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{listing.departure} → {listing.arrival}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(listing.departure_date), "d MMM", { locale: fr })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {listing.available_kg} kg
                    </div>
                    <span className="font-semibold text-primary">{listing.price_per_kg}€/kg</span>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/50">
                {status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/post-listing?edit=${listing.id}`)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                )}
                {status === 'archived' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/post-listing?edit=${listing.id}&reactivate=true`)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Réactiver
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => deleteListing(listing.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {listings.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate('/my-listings')}
        >
          Voir tout
        </Button>
      )}
    </div>
  );
};
