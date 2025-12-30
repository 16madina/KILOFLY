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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Package, AlertTriangle, FileSignature, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SignaturePad from "./SignaturePad";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLegalSignature } from "@/hooks/useLegalSignature";
import { generateLegalPDF } from "@/lib/generateLegalPDF";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LegalConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureData?: { signature: string; timestamp: string; signatureId?: string }) => void;
  type: "sender" | "transporter";
  loading?: boolean;
  reservationId?: string;
  reservationDetails?: {
    id: string;
    departure: string;
    arrival: string;
    requestedKg: number;
    totalPrice: number;
    itemDescription: string;
  };
}

const LegalConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  type,
  loading = false,
  reservationId,
  reservationDetails,
}: LegalConfirmationDialogProps) => {
  const { user } = useAuth();
  const { saveSignature, saving } = useLegalSignature();
  const [userName, setUserName] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [savedSignatureRecord, setSavedSignatureRecord] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch user profile name
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (data) {
          setUserName(data.full_name);
        }
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleSignatureChange = (hasSig: boolean, data: string | null) => {
    setHasSignature(hasSig);
    setSignatureData(data);
    setSignatureSaved(false);
    setSavedSignatureRecord(null);
  };

  const senderConditions = [
    "Je certifie que les articles que j'envoie sont conformes aux réglementations aéroportuaires (IATA/TSA) et ne contiennent aucun objet interdit ou dangereux.",
    "Je comprends que je suis entièrement responsable du contenu des colis que j'envoie et que KiloFly n'est pas responsable des objets transportés.",
    "Je m'engage à fournir une description exacte et honnête des articles envoyés.",
    "Je comprends qu'en cas de fausse déclaration ou d'envoi d'objets interdits, je m'expose à des poursuites légales et à une exclusion définitive de la plateforme.",
    "J'accepte que le transporteur puisse refuser le colis s'il semble ne pas correspondre à la description fournie.",
  ];

  const transporterConditions = [
    "Je comprends que je suis responsable de vérifier visuellement le contenu des colis avant de les accepter.",
    "Je m'engage à refuser tout colis qui semble contenir des objets interdits ou dangereux selon les réglementations aéroportuaires (IATA/TSA).",
    "Je comprends que je suis responsable des objets que je transporte et que je peux être tenu pour responsable en cas de transport d'objets illégaux.",
    "Je m'engage à prendre soin des articles transportés et à les livrer en bon état au destinataire.",
    "Je comprends que KiloFly n'assume aucune responsabilité quant au contenu des colis transportés.",
    "J'accepte de signaler tout comportement suspect ou toute tentative de transport d'objets interdits.",
  ];

  const conditions = type === "sender" ? senderConditions : transporterConditions;

  const handleConfirm = async () => {
    if (!accepted || !hasSignature || !signatureData) return;

    const timestamp = format(new Date(), "PPPp", { locale: fr });

    // Save signature to database
    const signatureRecord = await saveSignature({
      reservationId,
      signatureType: type,
      signatureData: { signature: signatureData, timestamp },
      conditionsAccepted: conditions,
    });

    if (signatureRecord) {
      setSavedSignatureRecord(signatureRecord);
      setSignatureSaved(true);
      toast.success("Signature enregistrée avec succès");
      
      onConfirm({ 
        signature: signatureData, 
        timestamp,
        signatureId: signatureRecord.id,
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!signatureData || !savedSignatureRecord) return;
    
    setGeneratingPDF(true);
    try {
      await generateLegalPDF({
        type,
        userName: userName || user?.email || "Utilisateur",
        signatureData,
        timestamp: format(new Date(savedSignatureRecord.signed_at), "PPPp", { locale: fr }),
        ipAddress: savedSignatureRecord.ip_address,
        conditionsAccepted: conditions,
        reservationDetails,
      });
      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const resetState = () => {
    setAccepted(false);
    setHasSignature(false);
    setSignatureData(null);
    setSignatureSaved(false);
    setSavedSignatureRecord(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const canConfirm = accepted && hasSignature && !signatureSaved;
  const isProcessing = loading || saving;

  const senderContent = {
    title: "Confirmation de responsabilité - Expéditeur",
    icon: <Package className="h-6 w-6 text-primary" />,
    description: "Avant de procéder au paiement, veuillez lire et accepter les conditions suivantes :",
    checkboxLabel: "J'ai lu et j'accepte les conditions ci-dessus. Je confirme être entièrement responsable des articles que j'envoie.",
    confirmButton: "Signer et confirmer",
  };

  const transporterContent = {
    title: "Confirmation de responsabilité - Transporteur",
    icon: <ShieldAlert className="h-6 w-6 text-primary" />,
    description: "Avant d'accepter cette réservation, veuillez lire et accepter les conditions suivantes :",
    checkboxLabel: "J'ai lu et j'accepte les conditions ci-dessus. Je confirme être entièrement responsable des articles que je transporte.",
    confirmButton: "Signer et accepter",
  };

  const content = type === "sender" ? senderContent : transporterContent;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            {content.icon}
            <span className="text-lg">{content.title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-3">
            {conditions.map((point, index) => (
              <div key={index} className="flex gap-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-foreground/80">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Pour plus d'informations sur les objets interdits, consultez notre{" "}
              <Link to="/prohibited-items" className="text-primary underline">
                page des réglementations
              </Link>{" "}
              et nos{" "}
              <Link to="/terms" className="text-primary underline">
                conditions d'utilisation
              </Link>
              .
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="legal-accept"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked === true)}
                className="mt-0.5"
                disabled={signatureSaved}
              />
              <label
                htmlFor="legal-accept"
                className="text-sm font-medium leading-snug cursor-pointer"
              >
                {content.checkboxLabel}
              </label>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <FileSignature className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Signature requise
                </p>
              </div>
              <SignaturePad 
                onSignatureChange={handleSignatureChange} 
                disabled={signatureSaved}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Votre signature électronique sera horodatée et enregistrée avec votre adresse IP comme preuve légale.
              </p>
            </div>

            {signatureSaved && savedSignatureRecord && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <FileSignature className="h-5 w-5" />
                  <p className="font-medium">Signature enregistrée avec succès</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Horodatage: {format(new Date(savedSignatureRecord.signed_at), "PPPp", { locale: fr })}</p>
                  {savedSignatureRecord.ip_address && (
                    <p>Adresse IP: {savedSignatureRecord.ip_address}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDownloadPDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le récapitulatif PDF
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4">
          <AlertDialogCancel disabled={isProcessing}>
            {signatureSaved ? "Fermer" : "Annuler"}
          </AlertDialogCancel>
          {!signatureSaved && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!canConfirm || isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                content.confirmButton
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LegalConfirmationDialog;
