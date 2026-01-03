import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Package, Wallet, Trash2, Pencil, Plus, Search, Check, Clock, Bell } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_SYMBOLS, Currency } from "@/lib/currency";
import { EditTransportRequestDialog } from "@/components/transport-requests/EditTransportRequestDialog";
import { useTransportOfferRealtime } from "@/hooks/useTransportOfferRealtime";
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
  offers_count?: number;
}

export const MyTransportRequestsEmbed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<TransportRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    // Get requests with pending offers count
    const { data, error } = await supabase
      .from('transport_requests')
      .select(`
        *,
        transport_offers(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
    } else {
      const requestsWithCount = (data || []).map(req => ({
        ...req,
        offers_count: req.transport_offers?.[0]?.count || 0
      }));
      setRequests(requestsWithCount);
    }
    setLoading(false);
  }, [user]);

  // Real-time updates for offers
  useTransportOfferRealtime(fetchRequests);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

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
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', icon: Clock, className: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'fulfilled':
        return { label: 'Acceptée', icon: Check, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      default:
        return { label: status, icon: Clock, className: 'bg-muted text-muted-foreground' };
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

  if (requests.length === 0) {
    return (
      <Card className="p-6 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">Aucune demande de transport</p>
        <Button size="sm" onClick={() => navigate('/post-request')}>
          <Plus className="h-4 w-4 mr-1" />
          Créer une demande
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const statusInfo = getStatusBadge(request.status);
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={request.id} className="overflow-hidden backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{request.departure} → {request.arrival}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(request.departure_date_start)}
                        {request.departure_date_end && ` - ${formatDate(request.departure_date_end)}`}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {request.requested_kg} kg
                      </div>
                      {request.budget_max && (
                        <div className="flex items-center gap-1">
                          <Wallet className="w-3 h-3" />
                          Max {request.budget_max} {CURRENCY_SYMBOLS[request.currency as Currency] || request.currency}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.offers_count > 0 && request.status === 'active' && (
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Bell className="w-3 h-3 mr-1" />
                        {request.offers_count} offre{request.offers_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                {request.status === 'active' && (
                  <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setRequestToEdit(request);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => {
                        setRequestToDelete(request.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {requests.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/my-transport-requests')}
          >
            Voir tout
          </Button>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
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
    </>
  );
};
