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
    const currentYear = new Date().getFullYear();

    // Build conditions list HTML
    const conditionsHtml = conditionsAccepted
      .map((c, i) => `<li style="margin-bottom: 6px; color: #4a5568; font-size: 13px;">${i + 1}. ${c}</li>`)
      .join("");

    // Build reservation details HTML if available
    let reservationHtml = "";
    if (reservationDetails) {
      reservationHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f7fafc; border-radius: 10px; padding: 15px;">
              <h3 style="color: #2d3748; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">📋 Détails de la réservation</h3>
              <table cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #718096; width: 40%;">Référence:</td>
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
            </td>
          </tr>
        </table>
      `;
    }

    // Logo as styled text
    const logoHtml = `
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
        <tr>
          <td style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 12px 20px; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">✈️ KiloFly</span>
          </td>
        </tr>
      </table>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Confirmation de signature - KiloFly</title>
      </head>
      <body style="margin: 0; padding: 0; width: 100%; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
          <tr>
            <td align="center" style="padding: 30px 15px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 40px 25px; text-align: center;">
                    ${logoHtml}
                    <div style="font-size: 50px; margin: 15px 0;">✍️</div>
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;">Confirmation de signature</h1>
                    <p style="color: #93c5fd; font-size: 14px; margin: 0; font-weight: 500;">Votre engagement est enregistré</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 35px 25px;">
                    <p style="color: #2d3748; font-size: 15px; margin: 0 0 15px 0; line-height: 1.6;">
                      Bonjour <strong>${userName}</strong>,
                    </p>
                    
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.7; margin: 0 0 20px 0;">
                      Votre signature électronique pour l'${actionLabel} a été enregistrée avec succès. Ce document constitue une preuve légale de votre acceptation des conditions d'utilisation de KiloFly.
                    </p>

                    <!-- Signature Info Box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 15px;">
                          <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Informations de signature</h3>
                          <p style="color: #2d3748; font-size: 13px; margin: 4px 0;"><strong>Type:</strong> ${typeLabel}</p>
                          <p style="color: #2d3748; font-size: 13px; margin: 4px 0;"><strong>Date et heure:</strong> ${signedAt}</p>
                          ${ipAddress ? `<p style="color: #2d3748; font-size: 13px; margin: 4px 0;"><strong>Adresse IP:</strong> ${ipAddress}</p>` : ""}
                        </td>
                      </tr>
                    </table>

                    ${reservationHtml}

                    <!-- Conditions Section -->
                    <div style="margin: 20px 0;">
                      <h3 style="color: #2d3748; font-size: 15px; margin: 0 0 12px 0; font-weight: 600;">✅ Conditions acceptées</h3>
                      <ul style="padding-left: 18px; margin: 0; line-height: 1.6;">
                        ${conditionsHtml}
                      </ul>
                    </div>

                    <!-- PDF Attachment Notice -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                      <tr>
                        <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 15px; text-align: center;">
                          <p style="color: #166534; font-size: 13px; margin: 0;">
                            📎 Le récapitulatif PDF complet est joint à cet email. Conservez-le précieusement.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #718096; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                      Si vous n'avez pas effectué cette action ou si vous avez des questions,<br>
                      contactez-nous à <a href="mailto:kiloflyapp@hotmail.com" style="color: #2563eb; text-decoration: none;">kiloflyapp@hotmail.com</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 25px 20px; background-color: #0f172a; text-align: center;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; line-height: 1.5;">
                      L'équipe KiloFly vous remercie de votre confiance ! ✈️
                    </p>
                    <p style="color: #475569; font-size: 11px; margin: 0; line-height: 1.5;">
                      © ${currentYear} KiloFly. Tous droits réservés.<br>
                      <span style="color: #64748b;">Plateforme de transport de colis entre particuliers</span>
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
