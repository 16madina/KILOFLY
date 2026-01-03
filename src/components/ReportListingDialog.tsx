import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReportListingDialogProps {
  listingId: string;
  listingRoute: string;
  ownerId: string;
  ownerName: string;
  trigger?: React.ReactNode;
}

export const ReportListingDialog = ({ 
  listingId, 
  listingRoute, 
  ownerId,
  ownerName,
  trigger 
}: ReportListingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un motif",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Report the listing owner with listing context
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: ownerId,
      reason,
      description: `[Annonce: ${listingRoute} - ID: ${listingId}] ${description}`.trim(),
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de soumettre le signalement",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Signalement envoyé",
      description: "Votre signalement a été transmis à notre équipe de modération",
    });

    setOpen(false);
    setReason("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-destructive">
            <AlertCircle className="w-4 h-4 mr-2" />
            Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler cette annonce</DialogTitle>
          <DialogDescription>
            Annonce: {listingRoute} par {ownerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motif du signalement</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fake_listing" id="fake_listing" />
                <Label htmlFor="fake_listing" className="font-normal">Annonce frauduleuse</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prohibited_items" id="prohibited_items" />
                <Label htmlFor="prohibited_items" className="font-normal">Propose des articles interdits</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scam" id="scam" />
                <Label htmlFor="scam" className="font-normal">Tentative d'arnaque</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate" className="font-normal">Contenu inapproprié</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="font-normal">Autre</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le problème..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Envoi..." : "Envoyer le signalement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};