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

  const baseWrapper = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);">
        <tr>
          <td align="center" style="padding: 40px 20px;">
  `;

  const baseFooter = `
            <!-- Footer -->
            <tr>
              <td style="padding: 30px 40px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 0 0 16px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <p style="color: #64748b; font-size: 13px; margin: 0 0 15px 0;">
                        Envoyé avec ❤️ par l'équipe KiloFly
                      </p>
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://kiloflyapp.com" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Site web</a>
                          </td>
                          <td style="color: #475569;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="mailto:support@kiloflyapp.com" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Support</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #475569; font-size: 11px; margin: 15px 0 0 0;">
                        © ${currentYear} KiloFly. Tous droits réservés.<br>
                        <span style="color: #334155;">Chaque Kilo compte</span>
                      </p>
                    </td>
                  </tr>
                </table>
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
      return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); padding: 40px 40px 50px 40px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"0\" r=\"40\" fill=\"rgba(255,255,255,0.05)\"/></svg>'); background-size: 200px;"></div>
                    <img src="${logoUrl}" alt="KiloFly" style="height: 50px; width: auto; margin-bottom: 20px; position: relative;" />
                    <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 40px;">⚠️</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">Avertissement Important</h1>
                    <p style="color: #fecaca; font-size: 14px; margin: 10px 0 0 0; font-weight: 500;">Action requise de votre part</p>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 25px 0; font-weight: 600;">${subject}</h2>
                  <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #dc2626; margin-bottom: 25px;">
                    <p style="color: #7f1d1d; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                  </div>
                  <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="font-size: 20px;">📋</span>
                        </td>
                        <td>
                          <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
                            <strong>Important :</strong> Le non-respect des règles de la plateforme peut entraîner la suspension temporaire ou permanente de votre compte.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              ${baseFooter}`;

    case 'confirmation':
      return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%); padding: 40px 40px 50px 40px; text-align: center;">
                    <img src="${logoUrl}" alt="KiloFly" style="height: 50px; width: auto; margin-bottom: 20px;" />
                    <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 15px auto; line-height: 80px;">
                      <span style="font-size: 40px;">✅</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">Action Confirmée</h1>
                    <p style="color: #a7f3d0; font-size: 14px; margin: 10px 0 0 0; font-weight: 500;">Tout s'est bien passé !</p>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 25px 0; font-weight: 600;">${subject}</h2>
                  <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #10b981;">
                    <p style="color: #064e3b; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                  </div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://kiloflyapp.com" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);">
                      Accéder à KiloFly →
                    </a>
                  </div>
                </td>
              </tr>
              ${baseFooter}`;

    case 'welcome':
      return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%); padding: 50px 40px 60px 40px; text-align: center;">
                    <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 25px;" />
                    <div style="background: rgba(255,255,255,0.15); border-radius: 50%; width: 90px; height: 90px; margin: 0 auto 20px auto; line-height: 90px;">
                      <span style="font-size: 45px;">🎉</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">Bienvenue sur KiloFly !</h1>
                    <p style="color: #93c5fd; font-size: 16px; margin: 12px 0 0 0; font-weight: 500;">Chaque Kilo compte</p>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 25px 0; font-weight: 600;">${subject}</h2>
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #2563eb; margin-bottom: 30px;">
                    <p style="color: #1e3a8a; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                  </div>
                  
                  <!-- Features -->
                  <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 20px 0; font-weight: 600;">Ce que vous pouvez faire :</h3>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right: 12px; vertical-align: top;"><span style="font-size: 24px;">✈️</span></td>
                            <td><strong style="color: #1e293b;">Proposer vos kilos</strong><br><span style="color: #64748b; font-size: 13px;">Rentabilisez l'espace libre dans vos bagages</span></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height: 10px;"></td></tr>
                    <tr>
                      <td style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right: 12px; vertical-align: top;"><span style="font-size: 24px;">📦</span></td>
                            <td><strong style="color: #1e293b;">Envoyer des colis</strong><br><span style="color: #64748b; font-size: 13px;">Trouvez des voyageurs pour vos envois</span></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <div style="text-align: center; margin-top: 35px;">
                    <a href="https://kiloflyapp.com" style="display: inline-block; padding: 16px 50px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);">
                      Commencer maintenant →
                    </a>
                  </div>
                </td>
              </tr>
              ${baseFooter}`;

    default:
      return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%); padding: 40px 40px 50px 40px; text-align: center;">
                    <img src="${logoUrl}" alt="KiloFly" style="height: 55px; width: auto; margin-bottom: 20px;" />
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">KiloFly</h1>
                    <p style="color: #93c5fd; font-size: 15px; margin: 10px 0 0 0; font-weight: 500;">Chaque Kilo compte</p>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 25px 0; font-weight: 600;">${subject}</h2>
                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px; border-radius: 12px; border-left: 5px solid #2563eb;">
                    <p style="color: #334155; line-height: 1.8; margin: 0; font-size: 15px;">${message.replace(/\n/g, '<br>')}</p>
                  </div>
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