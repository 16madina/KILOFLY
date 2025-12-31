import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TransportRequestCard } from "./TransportRequestCard";
import { TransportOfferDialog } from "./TransportOfferDialog";
import { CreateTransportRequestForm } from "./CreateTransportRequestForm";
import { Button } from "@/components/ui/button";
import { SkeletonShimmer } from "@/components/ui/skeleton-shimmer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TransportRequest {
  id: string;
  user_id: string;
  departure: string;
  arrival: string;
  departure_date_start: string;
  departure_date_end: string | null;
  requested_kg: number;
  budget_max: number | null;
  currency: string;
  description: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export const TransportRequestsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transport_requests")
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transport requests:", error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleOfferTransport = (request: TransportRequest) => {
    if (!user) {
      toast.error("Connectez-vous pour proposer votre aide");
      navigate("/auth");
      return;
    }

    if (request.user_id === user.id) {
      toast.error("Vous ne pouvez pas répondre à votre propre demande");
      return;
    }

    setSelectedRequest(request);
    setOfferDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchRequests();
  };

  const handleCardClick = (request: TransportRequest) => {
    navigate(`/request/${request.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-amber-500" />
            Demandes de transport
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Des expéditeurs recherchent des voyageurs
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => {
                if (!user) {
                  toast.error("Connectez-vous pour publier une demande");
                  navigate("/auth");
                  return;
                }
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Je recherche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                Publier une demande de transport
              </DialogTitle>
            </DialogHeader>
            <CreateTransportRequestForm 
              onSuccess={handleCreateSuccess}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-card shadow-card">
              <SkeletonShimmer className="h-24 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <SkeletonShimmer className="h-4 w-full" />
                <SkeletonShimmer className="h-4 w-2/3" />
                <SkeletonShimmer className="h-8 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
            <Package className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune demande pour le moment</h3>
          <p className="text-muted-foreground mb-4">
            Soyez le premier à publier une demande de transport !
          </p>
          <Button 
            onClick={() => {
              if (!user) {
                toast.error("Connectez-vous pour publier une demande");
                navigate("/auth");
                return;
              }
              setCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Publier une demande
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <TransportRequestCard
              key={request.id}
              id={request.id}
              userId={request.user_id}
              userName={request.profiles.full_name}
              userAvatar={request.profiles.avatar_url}
              departure={request.departure}
              arrival={request.arrival}
              departureDateStart={request.departure_date_start}
              departureDateEnd={request.departure_date_end}
              requestedKg={request.requested_kg}
              budgetMax={request.budget_max}
              currency={request.currency}
              description={request.description}
              createdAt={request.created_at}
              isOwnRequest={user?.id === request.user_id}
              onOfferTransport={() => handleOfferTransport(request)}
              onClick={() => handleCardClick(request)}
            />
          ))}
        </div>
      )}

      {/* Offer Dialog */}
      <TransportOfferDialog
        open={offerDialogOpen}
        onOpenChange={setOfferDialogOpen}
        request={selectedRequest}
        onSuccess={fetchRequests}
      />
    </div>
  );
};
