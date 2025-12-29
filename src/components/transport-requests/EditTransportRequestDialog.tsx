import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Package, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { COUNTRIES } from "@/components/CountrySelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL_CITIES = COUNTRIES.flatMap(country => country.cities);

const transportRequestSchema = z.object({
  departure: z.string().min(2, "Sélectionnez une ville de départ"),
  arrival: z.string().min(2, "Sélectionnez une ville d'arrivée"),
  departureDateStart: z.string().min(1, "Date de départ requise"),
  departureDateEnd: z.string().optional(),
  requestedKg: z.number().min(0.5, "Minimum 0.5 kg").max(100, "Maximum 100 kg"),
  budgetMax: z.number().min(0).optional(),
  description: z.string().max(500, "Maximum 500 caractères").optional(),
});

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
}

interface EditTransportRequestDialogProps {
  request: TransportRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditTransportRequestDialog = ({
  request,
  open,
  onOpenChange,
  onSuccess,
}: EditTransportRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    departure: "",
    arrival: "",
    departureDateStart: "",
    departureDateEnd: "",
    requestedKg: "",
    budgetMax: "",
    currency: "EUR",
    description: "",
  });

  useEffect(() => {
    if (request) {
      setFormData({
        departure: request.departure,
        arrival: request.arrival,
        departureDateStart: request.departure_date_start,
        departureDateEnd: request.departure_date_end || "",
        requestedKg: request.requested_kg.toString(),
        budgetMax: request.budget_max?.toString() || "",
        currency: request.currency,
        description: request.description || "",
      });
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request) return;

    try {
      const validatedData = transportRequestSchema.parse({
        departure: formData.departure,
        arrival: formData.arrival,
        departureDateStart: formData.departureDateStart,
        departureDateEnd: formData.departureDateEnd || undefined,
        requestedKg: parseFloat(formData.requestedKg) || 0,
        budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
        description: formData.description || undefined,
      });

      setLoading(true);

      const { error } = await supabase
        .from("transport_requests")
        .update({
          departure: validatedData.departure,
          arrival: validatedData.arrival,
          departure_date_start: validatedData.departureDateStart,
          departure_date_end: validatedData.departureDateEnd || null,
          requested_kg: validatedData.requestedKg,
          budget_max: validatedData.budgetMax || null,
          currency: formData.currency,
          description: validatedData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success("Votre demande a été mise à jour !");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error updating transport request:", error);
        toast.error("Erreur lors de la mise à jour");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier ma demande</DialogTitle>
          <DialogDescription>
            Mettez à jour les détails de votre demande de transport
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Départ
              </Label>
              <Select
                value={formData.departure}
                onValueChange={(value) => setFormData(prev => ({ ...prev, departure: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {ALL_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Arrivée
              </Label>
              <Select
                value={formData.arrival}
                onValueChange={(value) => setFormData(prev => ({ ...prev, arrival: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {ALL_CITIES.map((city) => (
                    <SelectItem key={`arrival-${city}`} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                À partir de
              </Label>
              <Input
                type="date"
                value={formData.departureDateStart}
                onChange={(e) => setFormData(prev => ({ ...prev, departureDateStart: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Jusqu'au
              </Label>
              <Input
                type="date"
                value={formData.departureDateEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, departureDateEnd: e.target.value }))}
                min={formData.departureDateStart || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Package className="h-3.5 w-3.5 text-primary" />
                Kilos
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={formData.requestedKg}
                onChange={(e) => setFormData(prev => ({ ...prev, requestedKg: e.target.value }))}
                placeholder="5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                Budget max
              </Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={formData.budgetMax}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                placeholder="50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Devise</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="XOF">XOF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez ce que vous souhaitez envoyer..."
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.description.length}/500
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};