import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Calendar, Package, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  destination_image: string | null;
  created_at: string;
}

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchListings();
  }, [user, navigate]);

  const fetchListings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des annonces");
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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Statut mis à jour");
      fetchListings();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Mes annonces</h1>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Aucune annonce pour le moment</p>
              <Button onClick={() => navigate('/post')}>
                Créer une annonce
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{listing.departure} → {listing.arrival}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(listing.departure_date), "d MMM", { locale: fr })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {listing.available_kg} kg disponibles
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={listing.status === 'active' ? 'default' : 'secondary'}
                    >
                      {listing.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {listing.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {listing.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-lg font-bold text-primary">
                      {listing.price_per_kg}€/kg
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/post?edit=${listing.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(
                          listing.id,
                          listing.status === 'active' ? 'inactive' : 'active'
                        )}
                      >
                        {listing.status === 'active' ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteListing(listing.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;
