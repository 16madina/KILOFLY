import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  template?: 'warning' | 'confirmation' | 'welcome' | 'default';
}

const getEmailTemplate = (type: string, message: string, subject: string) => {
  const currentYear = new Date().getFullYear();

  // Logo as styled text with icon for better email compatibility
  const logoHtml = `
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
      <tr>
        <td style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 12px 20px; border-radius: 12px;">
          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">✈️ KiloFly</span>
        </td>
      </tr>
    </table>
  `;

  const baseStyles = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>KiloFly</title>
    </head>
    <body style="margin: 0; padding: 0; width: 100%; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  `;

  const baseFooter = `
              <!-- Footer -->
              <tr>
                <td style="padding: 25px 20px; background-color: #0f172a; text-align: center;">
                  <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
                    Envoyé avec ❤️ par l'équipe KiloFly
                  </p>
                  <p style="margin: 0 0 12px 0;">
                    <a href="https://kiloflyapp.com" style="color: #60a5fa; text-decoration: none; font-size: 12px; margin: 0 8px;">Site web</a>
                    <span style="color: #475569;">•</span>
                    <a href="mailto:kiloflyapp@hotmail.com" style="color: #60a5fa; text-decoration: none; font-size: 12px; margin: 0 8px;">Support</a>
                  </p>
                  <p style="color: #475569; font-size: 11px; margin: 0; line-height: 1.5;">
                    © ${currentYear} KiloFly. Tous droits réservés.<br>
                    <span style="color: #64748b;">Chaque Kilo compte</span>
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

  switch (type) {
    case 'warning':
      return `${baseStyles}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 50px; margin: 15px 0;">⚠️</div>
                  <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;">Avertissement Important</h1>
                  <p style="color: #fecaca; font-size: 14px; margin: 0; font-weight: 500;">Action requise de votre part</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                    <tr>
                      <td style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 10px 10px 0; padding: 20px;">
                        <p style="color: #7f1d1d; line-height: 1.7; margin: 0; font-size: 14px;">${message.replace(/\n/g, '<br>')}</p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 10px 10px 0; padding: 15px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="30" valign="top" style="padding-right: 10px;">
                              <span style="font-size: 18px;">📋</span>
                            </td>
                            <td>
                              <p style="color: #78350f; margin: 0; font-size: 13px; line-height: 1.6;">
                                <strong>Important :</strong> Le non-respect des règles peut entraîner la suspension de votre compte.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${baseFooter}`;

    case 'confirmation':
      return `${baseStyles}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 50px; margin: 15px 0;">✅</div>
                  <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;">Action Confirmée</h1>
                  <p style="color: #a7f3d0; font-size: 14px; margin: 0; font-weight: 500;">Tout s'est bien passé !</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                      <td style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 0 10px 10px 0; padding: 20px;">
                        <p style="color: #064e3b; line-height: 1.7; margin: 0; font-size: 14px;">${message.replace(/\n/g, '<br>')}</p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <a href="https://kiloflyapp.com" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                          Accéder à KiloFly →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${baseFooter}`;

    case 'welcome':
      return `${baseStyles}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 50px; margin: 15px 0;">🎉</div>
                  <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;">Bienvenue sur KiloFly !</h1>
                  <p style="color: #93c5fd; font-size: 15px; margin: 0; font-weight: 500;">Chaque Kilo compte</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                      <td style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 20px;">
                        <p style="color: #1e3a8a; line-height: 1.7; margin: 0; font-size: 14px;">${message.replace(/\n/g, '<br>')}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Features -->
                  <h3 style="color: #1e293b; font-size: 15px; margin: 0 0 15px 0; font-weight: 600;">Ce que vous pouvez faire :</h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="35" valign="top"><span style="font-size: 22px;">✈️</span></td>
                            <td><strong style="color: #1e293b; font-size: 14px;">Proposer vos kilos</strong><br><span style="color: #64748b; font-size: 12px;">Rentabilisez l'espace libre dans vos bagages</span></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height: 8px;"></td></tr>
                    <tr>
                      <td style="padding: 12px; background-color: #f8fafc; border-radius: 8px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="35" valign="top"><span style="font-size: 22px;">📦</span></td>
                            <td><strong style="color: #1e293b; font-size: 14px;">Envoyer des colis</strong><br><span style="color: #64748b; font-size: 12px;">Trouvez des voyageurs pour vos envois</span></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                    <tr>
                      <td align="center">
                        <a href="https://kiloflyapp.com" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                          Commencer maintenant →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${baseFooter}`;

    default:
      return `${baseStyles}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 700;">KiloFly</h1>
                  <p style="color: #93c5fd; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Chaque Kilo compte</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 20px;">
                        <p style="color: #334155; line-height: 1.7; margin: 0; font-size: 14px;">${message.replace(/\n/g, '<br>')}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${baseFooter}`;
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-admin-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, template = 'default' }: EmailRequest = await req.json();

    console.log(`Sending ${template} email to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "KiloFly <noreply@kiloflyapp.com>",
      to: [to],
      subject: subject,
      html: getEmailTemplate(template, message, subject),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-email function:", error);
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
