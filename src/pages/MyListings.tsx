import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, MapPin, Calendar, Package, Trash2, Edit, Archive, CheckCircle, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isPast, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface Listing {
  id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  real_available_kg: number | null;
  price_per_kg: number;
  status: string;
  description: string | null;
  destination_image: string | null;
  created_at: string;
}

type ListingStatus = 'active' | 'expired' | 'completed' | 'archived';

const getListingStatus = (listing: Listing): ListingStatus => {
  const arrivalDate = new Date(listing.arrival_date);
  const archiveDate = addDays(arrivalDate, 3);
  const now = new Date();

  // Si le statut est déjà archived dans la DB
  if (listing.status === 'archived') return 'archived';
  
  // Si le statut est completed
  if (listing.status === 'completed') return 'completed';
  
  // Si 3 jours après l'arrivée → archived
  if (isPast(archiveDate)) return 'archived';
  
  // Si la date d'arrivée est passée → expired
  if (isPast(arrivalDate)) return 'expired';
  
  // Sinon active
  return 'active';
};

const getStatusBadge = (status: ListingStatus) => {
  switch (status) {
    case 'active':
      return { label: 'Active', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/20' };
    case 'expired':
      return { label: 'Expirée', variant: 'secondary' as const, icon: Clock, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
    case 'completed':
      return { label: 'Terminée', variant: 'secondary' as const, icon: CheckCircle, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    case 'archived':
      return { label: 'Archivée', variant: 'outline' as const, icon: Archive, className: 'bg-muted text-muted-foreground' };
  }
};

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchListings();
  }, [user, navigate]);

  const fetchListings = async () => {
    if (!user) return;

    // Use view with dynamic available kg calculation
    const { data, error } = await supabase
      .from('listings_with_available_kg')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des annonces");
      console.error(error);
    } else {
      // Auto-archive listings that are 3 days past arrival date
      const listingsToArchive = (data || []).filter(listing => {
        const arrivalDate = new Date(listing.arrival_date);
        const archiveDate = addDays(arrivalDate, 3);
        return isPast(archiveDate) && listing.status !== 'archived';
      });

      // Update archived listings in database
      if (listingsToArchive.length > 0) {
        await Promise.all(
          listingsToArchive.map(listing =>
            supabase
              .from('listings')
              .update({ status: 'archived' })
              .eq('id', listing.id)
          )
        );
        // Refetch after archiving
        const { data: refreshedData } = await supabase
          .from('listings_with_available_kg')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setListings(refreshedData || []);
      } else {
        setListings(data || []);
      }
    }
    setLoading(false);
  };

  // Filter listings based on tab
  const activeListings = listings.filter(listing => {
    const status = getListingStatus(listing);
    return status === 'active' || status === 'expired' || status === 'completed';
  });

  const archivedListings = listings.filter(listing => {
    const status = getListingStatus(listing);
    return status === 'archived';
  });

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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Actives ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archivées ({archivedListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeListings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">Aucune annonce active</p>
                  <Button onClick={() => navigate('/post')}>
                    Créer une annonce
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeListings.map((listing) => {
                  const status = getListingStatus(listing);
                  const statusInfo = getStatusBadge(status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
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
                                {listing.real_available_kg ?? listing.available_kg} kg disponibles
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={statusInfo.variant}
                            className={statusInfo.className}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
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
                            {status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/post-listing?edit=${listing.id}`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateStatus(listing.id, 'inactive')}
                                >
                                  Désactiver
                                </Button>
                              </>
                            )}
                            {status === 'expired' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus(listing.id, 'archived')}
                              >
                                <Archive className="w-4 h-4 mr-1" />
                                Archiver
                              </Button>
                            )}
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
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedListings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune annonce archivée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {archivedListings.map((listing) => {
                  const statusInfo = getStatusBadge('archived');
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <Card key={listing.id} className="overflow-hidden opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold text-muted-foreground">{listing.departure} → {listing.arrival}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(listing.departure_date), "d MMM yyyy", { locale: fr })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {listing.real_available_kg ?? listing.available_kg} kg
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={statusInfo.variant}
                            className={statusInfo.className}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <span className="text-lg font-bold text-muted-foreground">
                            {listing.price_per_kg}€/kg
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/post-listing?edit=${listing.id}&reactivate=true`)}
                              className="gap-1"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Réactiver
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
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyListings;
