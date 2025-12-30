import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface GeneratePDFParams {
  type: "sender" | "transporter";
  userName: string;
  signatureData: string;
  timestamp: string;
  ipAddress?: string;
  conditionsAccepted: string[];
  reservationDetails?: {
    id: string;
    departure: string;
    arrival: string;
    requestedKg: number;
    totalPrice: number;
    itemDescription: string;
  };
}

export interface GeneratePDFResult {
  base64: string;
  fileName: string;
}

export const generateLegalPDF = async ({
  type,
  userName,
  signatureData,
  timestamp,
  ipAddress,
  conditionsAccepted,
  reservationDetails,
}: GeneratePDFParams): Promise<GeneratePDFResult> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header with logo
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("KiloFly", margin, 25);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Attestation d'acceptation des conditions", margin, 35);

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Document title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const title = type === "sender" 
    ? "Confirmation de responsabilité - Expéditeur" 
    : "Confirmation de responsabilité - Transporteur";
  doc.text(title, margin, yPos);
  yPos += 15;

  // Document metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Document généré le ${format(new Date(), "PPPp", { locale: fr })}`, margin, yPos);
  yPos += 5;
  doc.text(`Référence: KF-${type.toUpperCase()}-${Date.now()}`, margin, yPos);
  yPos += 15;

  // User information
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Informations du signataire", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nom: ${userName}`, margin, yPos);
  yPos += 6;
  doc.text(`Date de signature: ${timestamp}`, margin, yPos);
  yPos += 6;
  if (ipAddress) {
    doc.text(`Adresse IP: ${ipAddress}`, margin, yPos);
    yPos += 6;
  }
  yPos += 10;

  // Reservation details if available
  if (reservationDetails) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Détails de la réservation", margin, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Référence: ${reservationDetails.id.substring(0, 8).toUpperCase()}`, margin, yPos);
    yPos += 6;
    doc.text(`Trajet: ${reservationDetails.departure} → ${reservationDetails.arrival}`, margin, yPos);
    yPos += 6;
    doc.text(`Poids: ${reservationDetails.requestedKg} kg`, margin, yPos);
    yPos += 6;
    doc.text(`Montant: ${reservationDetails.totalPrice.toFixed(2)}€`, margin, yPos);
    yPos += 6;
    
    // Item description with word wrap
    const descriptionLines = doc.splitTextToSize(
      `Description: ${reservationDetails.itemDescription}`,
      pageWidth - margin * 2
    );
    doc.text(descriptionLines, margin, yPos);
    yPos += descriptionLines.length * 5 + 10;
  }

  // Conditions accepted
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Conditions acceptées", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  conditionsAccepted.forEach((condition, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    const lines = doc.splitTextToSize(`${index + 1}. ${condition}`, pageWidth - margin * 2 - 5);
    doc.text(lines, margin + 5, yPos);
    yPos += lines.length * 4 + 3;
  });

  yPos += 10;

  // Check if we need a new page for signature
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // Signature section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Signature électronique", margin, yPos);
  yPos += 10;

  // Add signature image
  if (signatureData) {
    try {
      doc.addImage(signatureData, "PNG", margin, yPos, 80, 30);
      yPos += 35;
    } catch (error) {
      console.error("Error adding signature to PDF:", error);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("[Signature enregistrée numériquement]", margin, yPos);
      yPos += 10;
    }
  }

  // Legal footer
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  const legalText = [
    "Ce document constitue une preuve légale de l'acceptation des conditions d'utilisation de KiloFly.",
    "La signature électronique ci-dessus a été capturée avec horodatage et adresse IP pour garantir son authenticité.",
    "En cas de litige, ce document pourra être utilisé comme preuve de l'engagement du signataire.",
    "",
    "KiloFly - Plateforme de transport de colis entre particuliers",
    "Pour toute question, contactez-nous à support@kilofly.com",
  ];

  legalText.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += 4;
  });

  // Get PDF as base64 and save
  const fileName = `KiloFly_Confirmation_${type}_${format(new Date(), "yyyy-MM-dd_HHmmss")}.pdf`;
  const pdfBase64 = doc.output("datauristring");
  doc.save(fileName);

  return {
    base64: pdfBase64,
    fileName,
  };
};
