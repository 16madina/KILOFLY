import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getEmailTemplate = (type: string, email: string, confirmationUrl: string) => {
  const currentYear = new Date().getFullYear();
  
  // Logo as styled text with icon for better email compatibility
  const logoHtml = `
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
      <tr>
        <td style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 12px 20px; border-radius: 12px;">
          <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">✈️ KiloFly</span>
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
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse: collapse;}
        .button {padding: 18px 40px !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; width: 100%; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  `;

  const baseFooter = `
              <!-- Footer -->
              <tr>
                <td style="padding: 25px 20px; background-color: #0f172a; text-align: center;">
                  <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
                    L'équipe KiloFly vous souhaite un excellent voyage ! ✈️
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

  if (type === 'signup' || type === 'email_change') {
    const isSignup = type === 'signup';
    const title = isSignup ? 'Bienvenue sur KiloFly !' : 'Confirmez votre nouvelle adresse';
    const subtitle = isSignup ? 'Chaque Kilo compte' : 'Une dernière étape';
    const emoji = isSignup ? '🎉' : '✉️';

    return `${baseStyles}
      <!-- Wrapper Table -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <!-- Main Container -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 50px; margin: 15px 0;">${emoji}</div>
                  <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.3;">${title}</h1>
                  <p style="color: #93c5fd; font-size: 15px; margin: 0; font-weight: 500;">${subtitle}</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 15px 0; font-weight: 600;">Confirmez votre email</h2>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 8px 0; font-size: 15px;">
                    Bonjour,
                  </p>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                    ${isSignup 
                      ? `Merci de vous être inscrit sur <strong style="color: #1e293b;">KiloFly</strong> ! Pour activer votre compte et commencer à utiliser notre plateforme, veuillez confirmer votre adresse email.`
                      : `Vous avez demandé à changer votre adresse email vers <strong style="color: #1e293b;">${email}</strong>. Confirmez ce changement en cliquant sur le bouton ci-dessous.`
                    }
                  </p>

                  <!-- Email Badge -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                      <td style="background-color: #f1f5f9; border-radius: 10px; padding: 15px; text-align: center;">
                        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Adresse email</p>
                        <p style="margin: 0; color: #1e3a8a; font-size: 15px; font-weight: 600; word-break: break-all;">${email}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${confirmationUrl}" class="button" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
                          ✉️ Confirmer mon email
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 25px;">
                    <tr>
                      <td style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 15px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="30" valign="top" style="padding-right: 10px;">
                              <span style="font-size: 18px;">💡</span>
                            </td>
                            <td>
                              <p style="color: #1e40af; margin: 0; font-size: 13px; line-height: 1.6;">
                                <strong>Astuce :</strong> Après confirmation, vous pourrez explorer les annonces de voyageurs et demandes de transport sur KiloFly.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #94a3b8; line-height: 1.6; margin: 25px 0 0 0; font-size: 12px; text-align: center;">
                    Si vous n'avez pas créé de compte sur KiloFly, ignorez cet email.
                  </p>
                  <p style="color: #cbd5e1; line-height: 1.5; margin: 12px 0 0 0; font-size: 10px; text-align: center; word-break: break-all;">
                    Le lien expire dans 24 heures.
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

    return `${baseStyles}
      <!-- Wrapper Table -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <!-- Main Container -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%); padding: 40px 25px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 50px; margin: 15px 0;">${icon}</div>
                  <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; line-height: 1.3;">${title}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 35px 25px;">
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 8px 0; font-size: 15px;">
                    Bonjour,
                  </p>
                  <p style="color: #64748b; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                    ${message}
                  </p>

                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${confirmationUrl}" class="button" style="display: inline-block; padding: 16px 35px; background: linear-gradient(135deg, #b45309 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.3);">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Security Box -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 25px;">
                    <tr>
                      <td style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 10px 10px 0; padding: 15px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="30" valign="top" style="padding-right: 10px;">
                              <span style="font-size: 18px;">🔒</span>
                            </td>
                            <td>
                              <p style="color: #78350f; margin: 0; font-size: 13px; line-height: 1.6;">
                                <strong>Sécurité :</strong> Si vous n'avez pas fait cette demande, ignorez cet email. Votre compte reste sécurisé.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #cbd5e1; line-height: 1.5; margin: 25px 0 0 0; font-size: 10px; text-align: center; word-break: break-all;">
                    Ce lien expire dans 1 heure.
                  </p>
                </td>
              </tr>
              ${baseFooter}`;
  }

  // Default template
  return `${baseStyles}
    <!-- Wrapper Table -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a;">
      <tr>
        <td align="center" style="padding: 30px 15px;">
          <!-- Main Container -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 40px 25px; text-align: center;">
                ${logoHtml}
                <h1 style="color: #ffffff; font-size: 26px; margin: 10px 0 0 0; font-weight: 700;">KiloFly</h1>
                <p style="color: #93c5fd; font-size: 14px; margin: 8px 0 0 0; font-weight: 500;">Chaque Kilo compte</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 35px 25px;">
                <p style="color: #64748b; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                  Cliquez sur le bouton ci-dessous pour continuer.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0;">
                  <tr>
                    <td align="center">
                      <a href="${confirmationUrl}" class="button" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
                        Continuer →
                      </a>
                    </td>
                  </tr>
                </table>
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
