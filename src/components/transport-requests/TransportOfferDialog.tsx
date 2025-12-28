import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plane, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TransportRequest {
  id: string;
  departure: string;
  arrival: string;
  departure_date_start: string;
  departure_date_end: string | null;
  requested_kg: number;
  profiles: {
    full_name: string;
  };
}

interface Listing {
  id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  available_kg: number;
  price_per_kg: number;
}

interface TransportOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TransportRequest | null;
  onSuccess?: () => void;
}

export const TransportOfferDialog = ({
  open,
  onOpenChange,
  request,
  onSuccess,
}: TransportOfferDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");

  useEffect(() => {
    if (open && user && request) {
      fetchMyListings();
    }
  }, [open, user, request]);

  const fetchMyListings = async () => {
    if (!user || !request) return;

    const { data, error } = await supabase
      .from("listings")
      .select("id, departure, arrival, departure_date, available_kg, price_per_kg")
      .eq("user_id", user.id)
      .eq("status", "active")
      .ilike("departure", `%${request.departure}%`)
      .ilike("arrival", `%${request.arrival}%`);

    if (!error && data) {
      setMyListings(data);
      if (data.length === 1) {
        setSelectedListingId(data[0].id);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || !request) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("transport_offers").insert({
        request_id: request.id,
        traveler_id: user.id,
        listing_id: selectedListingId || null,
        message: message || null,
        proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous avez déjà proposé votre aide pour cette demande");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Votre proposition a été envoyée !");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setMessage("");
      setProposedPrice("");
      setSelectedListingId("");
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Erreur lors de l'envoi de la proposition");
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", { 
      day: "numeric", 
      month: "short" 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-amber-500" />
            Proposer mon transport
          </DialogTitle>
          <DialogDescription>
            Proposez votre aide à {request.profiles.full_name} pour transporter son colis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{request.departure} → {request.arrival}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(request.departure_date_start)}
                {request.departure_date_end && ` - ${formatDate(request.departure_date_end)}`}
              </span>
              <span className="mx-2">•</span>
              <span>{request.requested_kg} kg recherchés</span>
            </div>
          </div>

          {/* My Matching Listings */}
          {myListings.length > 0 && (
            <div className="space-y-2">
              <Label>Lier à une de mes annonces (optionnel)</Label>
              <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une annonce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune annonce</SelectItem>
                  {myListings.map((listing) => (
                    <SelectItem key={listing.id} value={listing.id}>
                      {formatDate(listing.departure_date)} - {listing.available_kg} kg dispo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Proposed Price */}
          <div className="space-y-2">
            <Label>Prix proposé (optionnel)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              placeholder="Ex: 25"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour discuter du prix plus tard
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message (optionnel)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Présentez-vous, mentionnez vos dates de voyage, etc."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Plane className="h-4 w-4 mr-2" />
                Envoyer ma proposition
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
