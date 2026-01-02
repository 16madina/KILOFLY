import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Package, 
  Calendar, 
  MapPin, 
  Plane, 
  Wallet,
  Check,
  X,
  Clock,
  Trash2,
  MessageSquare,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CURRENCY_SYMBOLS, Currency } from "@/lib/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditTransportRequestDialog } from "@/components/transport-requests/EditTransportRequestDialog";

interface TransportRequest {
  id: string;
  departure: string;
  arrival: string;
  departure_date_start: string;
  departure_date_end: string | null;
  requested_kg: number;
  budget_max: number | null;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface TransportOffer {
  id: string;
  request_id: string;
  traveler_id: string;
  listing_id: string | null;
  reservation_id: string | null;
  proposed_price: number | null;
  message: string | null;
  status: string;
  created_at: string;
  traveler: {
    full_name: string;
    avatar_url: string;
    id_verified: boolean;
  };
}

const MyTransportRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [offers, setOffers] = useState<Record<string, TransportOffer[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<TransportRequest | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    if (!user) return;

    const { data: requestsData, error: requestsError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      toast.error("Erreur lors du chargement des demandes");
      console.error(requestsError);
      setLoading(false);
      return;
    }

    setRequests(requestsData || []);

    // Fetch offers for each request
    if (requestsData && requestsData.length > 0) {
      const requestIds = requestsData.map(r => r.id);
      
      const { data: offersData, error: offersError } = await supabase
        .from('transport_offers')
        .select(`
          *,
          traveler:profiles!transport_offers_traveler_id_fkey(full_name, avatar_url, id_verified),
          reservation:reservations(id, status)
        `)
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });

      if (!offersError && offersData) {
        const offersMap: Record<string, TransportOffer[]> = {};
        offersData.forEach((offer: any) => {
          if (!offersMap[offer.request_id]) {
            offersMap[offer.request_id] = [];
          }
          offersMap[offer.request_id].push(offer);
        });
        setOffers(offersMap);
      }
    }

    setLoading(false);
  };

  const handleAcceptOffer = async (offerId: string, requestId: string) => {
    // First get the offer to check if it has a linked listing
    const { data: offer, error: offerError } = await supabase
      .from('transport_offers')
      .select('*, listing:listings(*)')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      toast.error("Erreur lors de la récupération de l'offre");
      return;
    }

    // If no listing is linked, we need to inform the user
    if (!offer.listing_id) {
      toast.error("Cette offre n'est pas liée à une annonce. Le voyageur doit d'abord créer une annonce pour son voyage.");
      return;
    }

    // Update the offer status to 'accepted' - this will trigger the database function
    // that automatically creates a reservation
    const { error } = await supabase
      .from('transport_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    if (error) {
      toast.error("Erreur lors de l'acceptation de l'offre");
      return;
    }

    // Update request status to fulfilled
    await supabase
      .from('transport_requests')
      .update({ status: 'fulfilled' })
      .eq('id', requestId);

    // Reject other pending offers
    await supabase
      .from('transport_offers')
      .update({ status: 'rejected' })
      .eq('request_id', requestId)
      .neq('id', offerId)
      .eq('status', 'pending');

    // Get the newly created reservation
    const { data: updatedOffer } = await supabase
      .from('transport_offers')
      .select('reservation_id')
      .eq('id', offerId)
      .single();

    toast.success("Offre acceptée ! Réservation créée automatiquement.");
    
    // Redirect to payment if reservation was created
    if (updatedOffer?.reservation_id) {
      toast.info("Redirection vers le paiement...");
      setTimeout(() => {
        navigate(`/payment?reservation=${updatedOffer.reservation_id}`);
      }, 1500);
    } else {
      fetchRequests();
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    const { error } = await supabase
      .from('transport_offers')
      .update({ status: 'rejected' })
      .eq('id', offerId);

    if (error) {
      toast.error("Erreur lors du refus de l'offre");
      return;
    }

    toast.success("Offre refusée");
    fetchRequests();
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    const { error } = await supabase
      .from('transport_requests')
      .delete()
      .eq('id', requestToDelete);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Demande supprimée");
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
    fetchRequests();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">Active</Badge>;
      case 'fulfilled':
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">Acceptée</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOfferStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"><Check className="h-3 w-3 mr-1" />Acceptée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"><X className="h-3 w-3 mr-1" />Refusée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeRequests = requests.filter(r => r.status === 'active');
  const fulfilledRequests = requests.filter(r => r.status === 'fulfilled');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Mes demandes</h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <Package className="h-4 w-4" />
              Actives ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger value="fulfilled" className="gap-2">
              <Check className="h-4 w-4" />
              Terminées ({fulfilledRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune demande active</p>
                <Button 
                  onClick={() => navigate('/')} 
                  className="mt-4"
                  variant="outline"
                >
                  Créer une demande
                </Button>
              </Card>
            ) : (
              activeRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  offers={offers[request.id] || []}
                  isExpanded={selectedRequest === request.id}
                  onToggle={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                  onDelete={() => {
                    setRequestToDelete(request.id);
                    setDeleteDialogOpen(true);
                  }}
                  onEdit={() => {
                    setRequestToEdit(request);
                    setEditDialogOpen(true);
                  }}
                  onAcceptOffer={(offerId) => handleAcceptOffer(offerId, request.id)}
                  onRejectOffer={handleRejectOffer}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  getOfferStatusBadge={getOfferStatusBadge}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="fulfilled" className="space-y-4">
            {fulfilledRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <Check className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune demande terminée</p>
              </Card>
            ) : (
              fulfilledRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  offers={offers[request.id] || []}
                  isExpanded={selectedRequest === request.id}
                  onToggle={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  getOfferStatusBadge={getOfferStatusBadge}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les propositions associées seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTransportRequestDialog
        request={requestToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchRequests}
      />
    </div>
  );
};

// Separate component for request card to keep things clean
interface RequestCardProps {
  request: TransportRequest;
  offers: TransportOffer[];
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onAcceptOffer?: (offerId: string) => void;
  onRejectOffer?: (offerId: string) => void;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  getOfferStatusBadge: (status: string) => JSX.Element;
}

const RequestCard = ({
  request,
  offers,
  isExpanded,
  onToggle,
  onDelete,
  onEdit,
  onAcceptOffer,
  onRejectOffer,
  formatDate,
  getStatusBadge,
  getOfferStatusBadge,
}: RequestCardProps) => {
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500 to-orange-500" />
              <div className="h-3 w-3 rounded-full bg-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{request.departure}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Plane className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{request.arrival}</span>
              </div>
            </div>
          </div>
          <div className="text-right space-y-1">
            {getStatusBadge(request.status)}
            {pendingOffers.length > 0 && (
              <Badge className="bg-primary text-primary-foreground ml-2">
                {pendingOffers.length} nouvelle{pendingOffers.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="border-t pt-4 space-y-4">
          {/* Request details */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(request.departure_date_start)}
              {request.departure_date_end && ` - ${formatDate(request.departure_date_end)}`}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Package className="h-3 w-3" />
              {request.requested_kg} kg
            </Badge>
            {request.budget_max && (
              <Badge variant="outline" className="gap-1">
                <Wallet className="h-3 w-3" />
                Max {request.budget_max} {CURRENCY_SYMBOLS[request.currency as Currency] || request.currency}
              </Badge>
            )}
          </div>

          {request.description && (
            <p className="text-sm text-muted-foreground">{request.description}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Créée {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
          </p>

          {/* Offers section */}
          {offers.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Propositions reçues ({offers.length})</h4>
              {offers.map((offer) => (
                <Card key={offer.id} className="p-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={offer.traveler.avatar_url} />
                        <AvatarFallback>
                          {offer.traveler.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{offer.traveler.full_name}</p>
                        {offer.proposed_price && (
                          <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                            {offer.proposed_price} {CURRENCY_SYMBOLS[request.currency as Currency] || request.currency}
                          </p>
                        )}
                        {offer.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getOfferStatusBadge(offer.status)}
                      {offer.status === 'pending' && onAcceptOffer && onRejectOffer && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRejectOffer(offer.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcceptOffer(offer.id);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {offer.status === 'accepted' && (
                        <div className="flex flex-col gap-2">
                          {offer.reservation_id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/reservation-chat/${offer.reservation_id}`);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Chat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/payment?reservation=${offer.reservation_id}`);
                                }}
                              >
                                <Wallet className="h-4 w-4 mr-1" />
                                Payer
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/${offer.traveler_id}`);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Contacter
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {offers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune proposition reçue pour le moment
            </p>
          )}

          {/* Actions */}
          {request.status === 'active' && (onDelete || onEdit) && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default MyTransportRequests;
