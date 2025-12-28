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
  const logoUrl = "https://yuhbvzjniylkruaylxzz.supabase.co/storage/v1/object/public/assets/kilofly-logo.png";
  const currentYear = new Date().getFullYear();

  const baseStyles = {
    body: "margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;",
    container: "width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
  };

  switch (type) {
    case 'warning':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${baseStyles.body}">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="${baseStyles.container}">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
                      <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 10px;" />
                      <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 600;">⚠️ Avertissement</h1>
                      <p style="color: #fee2e2; font-size: 14px; margin: 5px 0 0 0;">Action requise</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #dc2626; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                      <div style="background-color: #fef2f2; padding: 24px; border-radius: 8px; border-left: 4px solid #dc2626;">
                        <p style="color: #991b1b; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                      </div>
                      <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <p style="color: #92400e; margin: 0; font-size: 14px;">
                          <strong>Important :</strong> Veuillez prendre en compte cet avertissement. Le non-respect des règles de la plateforme peut entraîner la suspension de votre compte.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                      <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                        Ceci est un message officiel de l'équipe KiloFly.
                      </p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        © ${currentYear} KiloFly. Tous droits réservés.
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

    case 'confirmation':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${baseStyles.body}">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="${baseStyles.container}">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px 12px 0 0;">
                      <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 10px;" />
                      <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 600;">✓ Confirmation</h1>
                      <p style="color: #d1fae5; font-size: 14px; margin: 5px 0 0 0;">Action confirmée avec succès</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #059669; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                      <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <p style="color: #065f46; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                      <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                        Ceci est un message officiel de l'équipe KiloFly.
                      </p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        © ${currentYear} KiloFly. Tous droits réservés.
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

    case 'welcome':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${baseStyles.body}">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="${baseStyles.container}">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px 12px 0 0;">
                      <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 10px;" />
                      <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 600;">🎉 Bienvenue sur KiloFly</h1>
                      <p style="color: #f3e8ff; font-size: 14px; margin: 5px 0 0 0;">Chaque Kilo compte</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #7c3aed; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                      <div style="background-color: #faf5ff; padding: 24px; border-radius: 8px; border-left: 4px solid #a855f7;">
                        <p style="color: #6b21a8; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                      </div>
                      <div style="margin-top: 30px; text-align: center;">
                        <a href="https://kiloflyapp.com" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                          Découvrir KiloFly
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                      <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                        Bienvenue dans la communauté KiloFly !
                      </p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        © ${currentYear} KiloFly. Tous droits réservés.
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

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${baseStyles.body}">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="${baseStyles.container}">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
                      <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 10px;" />
                      <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 600;">KiloFly</h1>
                      <p style="color: #e0e7ff; font-size: 14px; margin: 5px 0 0 0;">Chaque Kilo compte</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1e3a8a; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${subject}</h2>
                      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="color: #334155; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                      <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                        Ceci est un message officiel de l'équipe KiloFly.
                      </p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        © ${currentYear} KiloFly. Tous droits réservés.
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
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, template = 'default' }: EmailRequest = await req.json();

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
