import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignatureEmailRequest {
  userEmail: string;
  userName: string;
  signatureType: "sender" | "transporter";
  signedAt: string;
  ipAddress: string | null;
  conditionsAccepted: string[];
  reservationDetails?: {
    id: string;
    departure: string;
    arrival: string;
    requestedKg: number;
    totalPrice: number;
    itemDescription: string;
  };
  pdfBase64: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-signature-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userEmail,
      userName,
      signatureType,
      signedAt,
      ipAddress,
      conditionsAccepted,
      reservationDetails,
      pdfBase64,
    }: SignatureEmailRequest = await req.json();

    console.log(`Sending signature confirmation email to ${userEmail}`);

    const typeLabel = signatureType === "sender" ? "Expéditeur" : "Transporteur";
    const actionLabel = signatureType === "sender" ? "envoi de colis" : "transport de colis";

    // Build conditions list HTML
    const conditionsHtml = conditionsAccepted
      .map((c, i) => `<li style="margin-bottom: 8px; color: #4a5568;">${i + 1}. ${c}</li>`)
      .join("");

    // Build reservation details HTML if available
    let reservationHtml = "";
    if (reservationDetails) {
      reservationHtml = `
        <div style="background-color: #f7fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin: 0 0 12px 0; font-size: 16px;">Détails de la réservation</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #718096;">Référence:</td>
              <td style="padding: 4px 0; color: #2d3748; font-weight: 600;">${reservationDetails.id.substring(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #718096;">Trajet:</td>
              <td style="padding: 4px 0; color: #2d3748;">${reservationDetails.departure} → ${reservationDetails.arrival}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #718096;">Poids:</td>
              <td style="padding: 4px 0; color: #2d3748;">${reservationDetails.requestedKg} kg</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #718096;">Montant:</td>
              <td style="padding: 4px 0; color: #2563eb; font-weight: 600;">${reservationDetails.totalPrice.toFixed(2)}€</td>
            </tr>
          </table>
        </div>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                    <img src="https://kiloflyappcom.lovable.app/lovable-uploads/kilofly-logo.png" alt="KiloFly" style="height: 40px; margin-bottom: 10px;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Confirmation de signature</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #2d3748; font-size: 16px; margin: 0 0 20px 0;">
                      Bonjour <strong>${userName}</strong>,
                    </p>
                    
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                      Votre signature électronique pour l'${actionLabel} a été enregistrée avec succès. Ce document constitue une preuve légale de votre acceptation des conditions d'utilisation de KiloFly.
                    </p>

                    <!-- Signature Info Box -->
                    <div style="background-color: #ebf8ff; border-left: 4px solid #2563eb; border-radius: 4px; padding: 16px; margin: 20px 0;">
                      <h3 style="color: #2563eb; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Informations de signature</h3>
                      <p style="color: #2d3748; font-size: 14px; margin: 4px 0;"><strong>Type:</strong> ${typeLabel}</p>
                      <p style="color: #2d3748; font-size: 14px; margin: 4px 0;"><strong>Date et heure:</strong> ${signedAt}</p>
                      ${ipAddress ? `<p style="color: #2d3748; font-size: 14px; margin: 4px 0;"><strong>Adresse IP:</strong> ${ipAddress}</p>` : ""}
                    </div>

                    ${reservationHtml}

                    <!-- Conditions Section -->
                    <div style="margin: 20px 0;">
                      <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 12px 0;">Conditions acceptées</h3>
                      <ul style="padding-left: 20px; margin: 0; font-size: 13px; line-height: 1.6;">
                        ${conditionsHtml}
                      </ul>
                    </div>

                    <!-- PDF Attachment Notice -->
                    <div style="background-color: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                      <p style="color: #276749; font-size: 14px; margin: 0;">
                        📎 Le récapitulatif PDF complet est joint à cet email. Conservez-le précieusement.
                      </p>
                    </div>

                    <p style="color: #718096; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
                      Si vous n'avez pas effectué cette action ou si vous avez des questions, contactez-nous immédiatement à <a href="mailto:support@kilofly.com" style="color: #2563eb;">support@kilofly.com</a>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; font-size: 12px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} KiloFly. Tous droits réservés.<br>
                      Plateforme de transport de colis entre particuliers.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Decode base64 PDF
    const pdfBuffer = Uint8Array.from(atob(pdfBase64.split(",")[1] || pdfBase64), (c) => c.charCodeAt(0));

    const { data, error } = await resend.emails.send({
      from: "KiloFly <noreply@kiloflyapp.com>",
      to: [userEmail],
      subject: `✅ Confirmation de signature - ${typeLabel}`,
      html: emailHtml,
      attachments: [
        {
          filename: `KiloFly_Confirmation_${signatureType}_${new Date().toISOString().split("T")[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-signature-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
