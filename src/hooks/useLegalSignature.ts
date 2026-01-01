import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignatureData {
  signature: string;
  timestamp: string;
}

interface SaveSignatureParams {
  reservationId?: string;
  signatureType: "sender" | "transporter";
  signatureData: SignatureData;
  conditionsAccepted: string[];
}

interface SignatureRecord {
  id: string;
  user_id: string;
  reservation_id: string | null;
  signature_type: string;
  signature_data: string;
  ip_address: string | null;
  user_agent: string;
  conditions_accepted: object;
  signed_at: string;
}

export const useLegalSignature = () => {
  const [saving, setSaving] = useState(false);

  const getClientIP = async (): Promise<string | null> => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error("Could not get IP:", error);
      return null;
    }
  };

  const saveSignature = async ({
    reservationId,
    signatureType,
    signatureData,
    conditionsAccepted,
  }: SaveSignatureParams): Promise<SignatureRecord | null> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return null;
      }

      // Check if signature already exists for this reservation
      if (reservationId) {
        const { data: existingSignature } = await supabase
          .from("legal_signatures")
          .select("*")
          .eq("reservation_id", reservationId)
          .eq("user_id", user.id)
          .eq("signature_type", signatureType)
          .maybeSingle();

        if (existingSignature) {
          console.log("Signature already exists:", existingSignature.id);
          toast.info("Vous avez déjà signé pour cette réservation");
          return existingSignature as SignatureRecord;
        }
      }

      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      const { data, error } = await supabase
        .from("legal_signatures")
        .insert({
          user_id: user.id,
          reservation_id: reservationId || null,
          signature_type: signatureType,
          signature_data: signatureData.signature,
          ip_address: ipAddress,
          user_agent: userAgent,
          conditions_accepted: {
            conditions: conditionsAccepted,
            timestamp: signatureData.timestamp,
          },
          signed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505') {
          console.log("Signature already exists (constraint violation)");
          const { data: existingData } = await supabase
            .from("legal_signatures")
            .select("*")
            .eq("reservation_id", reservationId)
            .eq("user_id", user.id)
            .eq("signature_type", signatureType)
            .single();
          
          if (existingData) {
            toast.info("Vous avez déjà signé pour cette réservation");
            return existingData as SignatureRecord;
          }
        }
        console.error("Error saving signature:", error);
        toast.error("Erreur lors de l'enregistrement de la signature");
        return null;
      }

      return data as SignatureRecord;
    } catch (error) {
      console.error("Error saving signature:", error);
      toast.error("Erreur lors de l'enregistrement de la signature");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { saveSignature, saving };
};
