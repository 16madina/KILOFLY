import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logoUrl = "https://yuhbvzjniylkruaylxzz.supabase.co/storage/v1/object/public/assets/kilofly-logo.png";

const getEmailTemplate = (type: string, email: string, confirmationUrl: string) => {
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
                        L'équipe KiloFly vous souhaite un excellent voyage ! ✈️
                      </p>
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://kiloflyapp.com" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Site web</a>
                          </td>
                          <td style="color: #475569;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="mailto:kiloflyapp@hotmail.com" style="color: #60a5fa; text-decoration: none; font-size: 12px;">Support</a>
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

  if (type === 'signup' || type === 'email_change') {
    const isSignup = type === 'signup';
    const title = isSignup ? 'Bienvenue sur KiloFly !' : 'Confirmez votre nouvelle adresse';
    const subtitle = isSignup ? 'Chaque Kilo compte' : 'Une dernière étape';

    return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 50px 40px 60px 40px; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.03); border-radius: 50%;"></div>
                    <img src="${logoUrl}" alt="KiloFly" style="height: 60px; width: auto; margin-bottom: 25px; position: relative;" />
                    <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 50%; width: 90px; height: 90px; margin: 0 auto 20px auto; line-height: 90px; position: relative;">
                      <span style="font-size: 45px;">${isSignup ? '🎉' : '✉️'}</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 30px; margin: 0; font-weight: 700; letter-spacing: -0.5px; position: relative;">${title}</h1>
                    <p style="color: #93c5fd; font-size: 16px; margin: 12px 0 0 0; font-weight: 500; position: relative;">${subtitle}</p>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 15px 0; font-weight: 600;">Confirmez votre email</h2>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 10px 0; font-size: 15px;">
                    Bonjour,
                  </p>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 30px 0; font-size: 15px;">
                    ${isSignup 
                      ? `Merci de vous être inscrit sur <strong style="color: #1e293b;">KiloFly</strong> ! Pour activer votre compte et commencer à utiliser notre plateforme, veuillez confirmer votre adresse email.`
                      : `Vous avez demandé à changer votre adresse email vers <strong style="color: #1e293b;">${email}</strong>. Confirmez ce changement en cliquant sur le bouton ci-dessous.`
                    }
                  </p>

                  <!-- Email Badge -->
                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 10px; padding: 15px 20px; margin-bottom: 30px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Adresse email</p>
                    <p style="margin: 5px 0 0 0; color: #1e3a8a; font-size: 16px; font-weight: 600;">${email}</p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${confirmationUrl}" style="display: inline-block; padding: 18px 50px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4); transition: all 0.3s;">
                      ✉️ Confirmer mon email
                    </a>
                  </div>

                  <!-- Info Box -->
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; border-left: 5px solid #2563eb; margin-top: 30px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="font-size: 20px;">💡</span>
                        </td>
                        <td>
                          <p style="color: #1e40af; margin: 0; font-size: 14px; line-height: 1.6;">
                            <strong>Astuce :</strong> Après confirmation, vous pourrez explorer les annonces de voyageurs et demandes de transport sur KiloFly.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #94a3b8; line-height: 1.6; margin: 25px 0 0 0; font-size: 13px; text-align: center;">
                    Si vous n'avez pas créé de compte sur KiloFly, ignorez cet email.
                  </p>
                  <p style="color: #cbd5e1; line-height: 1.6; margin: 15px 0 0 0; font-size: 11px; text-align: center;">
                    Le lien expire dans 24 heures. Si le bouton ne fonctionne pas :<br>
                    <a href="${confirmationUrl}" style="color: #60a5fa; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                </td>
              </tr>
              ${baseFooter}`;
  }

  if (type === 'recovery' || type === 'magiclink') {
    const isRecovery = type === 'recovery';
    const title = isRecovery ? 'Réinitialisez votre mot de passe' : 'Connexion sécurisée';
    const buttonText = isRecovery ? '🔑 Réinitialiser le mot de passe' : '🔐 Se connecter';
    const message = isRecovery 
      ? 'Vous avez demandé à réinitialiser votre mot de passe sur KiloFly. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé.'
      : 'Utilisez ce lien sécurisé pour vous connecter instantanément à votre compte KiloFly.';
    const icon = isRecovery ? '🔑' : '🔐';

    return `${baseWrapper}
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <div style="background: linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%); padding: 45px 40px 55px 40px; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                    <img src="${logoUrl}" alt="KiloFly" style="height: 55px; width: auto; margin-bottom: 20px; position: relative;" />
                    <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 85px; height: 85px; margin: 0 auto 18px auto; line-height: 85px; position: relative;">
                      <span style="font-size: 42px;">${icon}</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: -0.5px; position: relative;">${title}</h1>
                  </div>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 10px 0; font-size: 15px;">
                    Bonjour,
                  </p>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 30px 0; font-size: 15px;">
                    ${message}
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${confirmationUrl}" style="display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #b45309 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4);">
                      ${buttonText}
                    </a>
                  </div>

                  <!-- Security Box -->
                  <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; margin-top: 30px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="font-size: 20px;">🔒</span>
                        </td>
                        <td>
                          <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
                            <strong>Sécurité :</strong> Si vous n'avez pas fait cette demande, ignorez cet email. Votre compte reste sécurisé.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #cbd5e1; line-height: 1.6; margin: 25px 0 0 0; font-size: 11px; text-align: center;">
                    Ce lien expire dans 1 heure. Si le bouton ne fonctionne pas :<br>
                    <a href="${confirmationUrl}" style="color: #60a5fa; word-break: break-all;">${confirmationUrl}</a>
                  </p>
                </td>
              </tr>
              ${baseFooter}`;
  }

  // Default template
  return `${baseWrapper}
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <!-- Header -->
            <tr>
              <td style="padding: 0;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 45px 40px 55px 40px; text-align: center;">
                  <img src="${logoUrl}" alt="KiloFly" style="height: 55px; width: auto; margin-bottom: 20px;" />
                  <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">KiloFly</h1>
                  <p style="color: #93c5fd; font-size: 15px; margin: 10px 0 0 0; font-weight: 500;">Chaque Kilo compte</p>
                </div>
              </td>
            </tr>
            <!-- Content -->
            <tr>
              <td style="padding: 40px;">
                <p style="color: #64748b; line-height: 1.7; margin: 0 0 30px 0; font-size: 15px;">
                  Cliquez sur le bouton ci-dessous pour continuer.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 45px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);">
                    Continuer →
                  </a>
                </div>
              </td>
            </tr>
            ${baseFooter}`;
};

const getSubject = (type: string): string => {
  switch (type) {
    case 'signup':
      return '🎉 Bienvenue sur KiloFly - Confirmez votre email';
    case 'email_change':
      return '✉️ Confirmez votre nouvelle adresse email - KiloFly';
    case 'recovery':
      return '🔑 Réinitialisez votre mot de passe - KiloFly';
    case 'magiclink':
      return '🔐 Votre lien de connexion sécurisé - KiloFly';
    case 'invite':
      return '🎉 Vous êtes invité à rejoindre KiloFly !';
    default:
      return 'KiloFly - Notification';
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("auth-email-hook function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Auth email hook received:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    
    if (!user?.email || !email_data) {
      console.error("Missing required data in payload");
      return new Response(
        JSON.stringify({ error: "Missing required data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { token, token_hash, redirect_to, email_action_type } = email_data;
    
    // Build the confirmation URL - redirect to email-confirmed page
    const baseUrl = redirect_to || "https://kiloflyapp.com";
    const redirectTarget = email_action_type === 'signup' ? `${baseUrl}/email-confirmed` : baseUrl;
    const confirmationUrl = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirectTarget)}`;

    const subject = getSubject(email_action_type);
    const html = getEmailTemplate(email_action_type, user.email, confirmationUrl);

    console.log("Sending email to:", user.email);
    console.log("Email type:", email_action_type);
    console.log("Confirmation URL:", confirmationUrl);

    const emailResponse = await resend.emails.send({
      from: "KiloFly <noreply@kiloflyapp.com>",
      to: [user.email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in auth-email-hook:", error);
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