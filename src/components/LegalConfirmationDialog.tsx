import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Package, AlertTriangle, FileSignature, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

      // Generate PDF and send email automatically
      try {
        const pdfResult = await generateLegalPDF({
          type,
          userName: userName || user?.email || "Utilisateur",
          signatureData,
          timestamp: format(new Date(signatureRecord.signed_at), "PPPp", { locale: fr }),
          ipAddress: signatureRecord.ip_address,
          conditionsAccepted: conditions,
          reservationDetails,
        });

        // Send email with PDF
        const { error: emailError } = await supabase.functions.invoke("send-signature-email", {
          body: {
            userEmail: user?.email,
            userName: userName || user?.email || "Utilisateur",
            signatureType: type,
            signedAt: format(new Date(signatureRecord.signed_at), "PPPp", { locale: fr }),
            ipAddress: signatureRecord.ip_address,
            conditionsAccepted: conditions,
            reservationDetails,
            pdfBase64: pdfResult.base64,
          },
        });

        if (emailError) {
          console.error("Error sending email:", emailError);
          toast.warning("Signature enregistrée mais l'email n'a pas pu être envoyé");
        } else {
          toast.success("Email de confirmation envoyé");
        }
      } catch (error) {
        console.error("Error generating PDF or sending email:", error);
      }
      
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
        download: true,
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
      <AlertDialogContent className="!flex !flex-col max-w-md w-[min(92vw,28rem)] h-[85vh] overflow-hidden">
        <AlertDialogHeader className="shrink-0">
          <AlertDialogTitle className="flex items-center gap-3">
            {content.icon}
            <span className="text-lg">{content.title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4 touch-pan-y">
          <div className="pr-4">
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
                <a 
                  href="/prohibited-items" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  page des réglementations
                </a>{" "}
                et nos{" "}
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  conditions d'utilisation
                </a>
                .
              </p>
            </div>

            <div className="mt-4 space-y-4 pb-6">
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
                <SignaturePad onSignatureChange={handleSignatureChange} disabled={signatureSaved} />
                <p className="text-xs text-muted-foreground mt-2">
                  Votre signature électronique sera horodatée et enregistrée avec votre adresse IP comme preuve légale.
                </p>
              </div>

              <AnimatePresence>
                {signatureSaved && savedSignatureRecord && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 20,
                      duration: 0.5 
                    }}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3 overflow-hidden"
                  >
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                        delay: 0.2
                      }}
                      className="flex justify-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 300,
                            damping: 15,
                            delay: 0.4
                          }}
                        >
                          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-center"
                    >
                      <p className="font-semibold text-green-700 dark:text-green-300 text-lg">
                        Signature enregistrée !
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Votre confirmation a été validée avec succès
                      </p>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-xs text-muted-foreground space-y-1 bg-background/50 p-2 rounded"
                    >
                      <p className="flex items-center gap-1">
                        <FileSignature className="h-3 w-3" />
                        {format(new Date(savedSignatureRecord.signed_at), "PPPp", { locale: fr })}
                      </p>
                      {savedSignatureRecord.ip_address && (
                        <p>IP: {savedSignatureRecord.ip_address}</p>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
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
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="shrink-0 gap-2 sm:gap-0 pt-4 border-t mt-2 relative z-50 bg-background">
          <AlertDialogCancel disabled={isProcessing}>
            {signatureSaved ? "Fermer" : "Annuler"}
          </AlertDialogCancel>
          {!signatureSaved && (
            <Button
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
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LegalConfirmationDialog;
