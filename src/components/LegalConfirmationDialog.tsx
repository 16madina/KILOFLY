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
import { ShieldAlert, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface LegalConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: "sender" | "transporter";
  loading?: boolean;
}

const LegalConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  type,
  loading = false,
}: LegalConfirmationDialogProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = () => {
    if (accepted) {
      onConfirm();
      setAccepted(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAccepted(false);
    }
    onOpenChange(newOpen);
  };

  const senderContent = {
    title: "Confirmation de responsabilité - Expéditeur",
    icon: <Package className="h-6 w-6 text-primary" />,
    description: "Avant de procéder au paiement, veuillez lire et accepter les conditions suivantes :",
    points: [
      "Je certifie que les articles que j'envoie sont conformes aux réglementations aéroportuaires (IATA/TSA) et ne contiennent aucun objet interdit ou dangereux.",
      "Je comprends que je suis entièrement responsable du contenu des colis que j'envoie et que KiloFly n'est pas responsable des objets transportés.",
      "Je m'engage à fournir une description exacte et honnête des articles envoyés.",
      "Je comprends qu'en cas de fausse déclaration ou d'envoi d'objets interdits, je m'expose à des poursuites légales et à une exclusion définitive de la plateforme.",
      "J'accepte que le transporteur puisse refuser le colis s'il semble ne pas correspondre à la description fournie.",
    ],
    checkboxLabel: "J'ai lu et j'accepte les conditions ci-dessus. Je confirme être entièrement responsable des articles que j'envoie.",
    confirmButton: "Confirmer et payer",
  };

  const transporterContent = {
    title: "Confirmation de responsabilité - Transporteur",
    icon: <ShieldAlert className="h-6 w-6 text-primary" />,
    description: "Avant d'accepter cette réservation, veuillez lire et accepter les conditions suivantes :",
    points: [
      "Je comprends que je suis responsable de vérifier visuellement le contenu des colis avant de les accepter.",
      "Je m'engage à refuser tout colis qui semble contenir des objets interdits ou dangereux selon les réglementations aéroportuaires (IATA/TSA).",
      "Je comprends que je suis responsable des objets que je transporte et que je peux être tenu pour responsable en cas de transport d'objets illégaux.",
      "Je m'engage à prendre soin des articles transportés et à les livrer en bon état au destinataire.",
      "Je comprends que KiloFly n'assume aucune responsabilité quant au contenu des colis transportés.",
      "J'accepte de signaler tout comportement suspect ou toute tentative de transport d'objets interdits.",
    ],
    checkboxLabel: "J'ai lu et j'accepte les conditions ci-dessus. Je confirme être entièrement responsable des articles que je transporte.",
    confirmButton: "Accepter la réservation",
  };

  const content = type === "sender" ? senderContent : transporterContent;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            {content.icon}
            <span className="text-lg">{content.title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {content.points.map((point, index) => (
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
        </ScrollArea>

        <div className="flex items-start gap-3 pt-4 border-t">
          <Checkbox
            id="legal-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="legal-accept"
            className="text-sm font-medium leading-snug cursor-pointer"
          >
            {content.checkboxLabel}
          </label>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!accepted || loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? "Chargement..." : content.confirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LegalConfirmationDialog;
