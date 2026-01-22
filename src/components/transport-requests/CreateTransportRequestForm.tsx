import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Package, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { COUNTRIES } from "@/components/CountrySelect";

// Get all cities from all countries
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

interface CreateTransportRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateTransportRequestForm = ({ onSuccess, onCancel }: CreateTransportRequestFormProps) => {
  const { user } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Connectez-vous pour publier une demande");
      return;
    }

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

      const { data: insertedRequest, error } = await supabase
        .from("transport_requests")
        .insert({
          user_id: user.id,
          departure: validatedData.departure,
          arrival: validatedData.arrival,
          departure_date_start: validatedData.departureDateStart,
          departure_date_end: validatedData.departureDateEnd || null,
          requested_kg: validatedData.requestedKg,
          budget_max: validatedData.budgetMax || null,
          currency: formData.currency,
          description: validatedData.description || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Send push notifications to all users
      if (insertedRequest) {
        supabase.functions.invoke("notify-new-transport-request", {
          body: {
            request_id: insertedRequest.id,
            departure: validatedData.departure,
            arrival: validatedData.arrival,
            requested_kg: validatedData.requestedKg,
            poster_user_id: user.id,
          },
        }).catch((err) => {
          console.error("Error sending notifications:", err);
        });
      }

      toast.success("Votre demande a été publiée !");
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error creating transport request:", error);
        toast.error("Erreur lors de la publication");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Departure */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Ville de départ
          </Label>
          <Select
            value={formData.departure}
            onValueChange={(value) => setFormData(prev => ({ ...prev, departure: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {ALL_CITIES.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Arrival */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Ville d'arrivée
          </Label>
          <Select
            value={formData.arrival}
            onValueChange={(value) => setFormData(prev => ({ ...prev, arrival: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une ville" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {ALL_CITIES.map((city) => (
                <SelectItem key={`arrival-${city}`} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Start */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Date de départ (à partir de)
          </Label>
          <Input
            type="date"
            value={formData.departureDateStart}
            onChange={(e) => setFormData(prev => ({ ...prev, departureDateStart: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        {/* Date End */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Jusqu'au (optionnel)
          </Label>
          <Input
            type="date"
            value={formData.departureDateEnd}
            onChange={(e) => setFormData(prev => ({ ...prev, departureDateEnd: e.target.value }))}
            min={formData.departureDateStart || new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Requested Kg */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Kilos nécessaires
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="100"
            value={formData.requestedKg}
            onChange={(e) => setFormData(prev => ({ ...prev, requestedKg: e.target.value }))}
            placeholder="Ex: 5"
            required
          />
        </div>

        {/* Budget Max */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Budget max (optionnel)
          </Label>
          <Input
            type="number"
            step="1"
            min="0"
            value={formData.budgetMax}
            onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
            placeholder="Ex: 50"
          />
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label>Devise</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="XOF">XOF (CFA)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description (optionnel)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez ce que vous souhaitez envoyer, toute information utile pour les voyageurs..."
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.description.length}/500
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Publication...
            </>
          ) : (
            "Publier ma demande"
          )}
        </Button>
      </div>
    </form>
  );
};
