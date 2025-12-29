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
  
  const baseStyles = {
    body: "margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;",
    container: "width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
    button: "display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;",
  };

  if (type === 'signup' || type === 'email_change') {
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
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="${baseStyles.container}">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); border-radius: 12px 12px 0 0;">
                    <img src="${logoUrl}" alt="KiloFly" style="height: 70px; width: auto; margin-bottom: 15px;" />
                    <h1 style="color: #ffffff; font-size: 26px; margin: 10px 0 0 0; font-weight: 600;">Bienvenue sur KiloFly</h1>
                    <p style="color: #bfdbfe; font-size: 15px; margin: 8px 0 0 0;">Chaque Kilo compte</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px 0; font-weight: 600;">Confirmez votre adresse email</h2>
                    <p style="color: #475569; line-height: 1.7; margin: 0 0 10px 0; font-size: 15px;">
                      Bonjour,
                    </p>
                    <p style="color: #475569; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                      Merci de vous être inscrit sur <strong>KiloFly</strong> ! Pour activer votre compte et commencer à utiliser notre plateforme, veuillez confirmer votre adresse email <strong>${email}</strong> en cliquant sur le bouton ci-dessous.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${confirmationUrl}" style="${baseStyles.button}">
                        ✉️ Confirmer mon email
                      </a>
                    </div>
                    <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
                      <p style="color: #0369a1; margin: 0; font-size: 14px;">
                        <strong>💡 Astuce :</strong> Après confirmation, vous pourrez explorer les annonces de voyageurs et demandes de transport sur KiloFly.
                      </p>
                    </div>
                    <p style="color: #94a3b8; line-height: 1.6; margin: 25px 0 0 0; font-size: 13px;">
                      Si vous n'avez pas créé de compte sur KiloFly, vous pouvez ignorer cet email.
                    </p>
                    <p style="color: #94a3b8; line-height: 1.6; margin: 15px 0 0 0; font-size: 12px;">
                      Le lien expirera dans 24 heures. Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                      <a href="${confirmationUrl}" style="color: #0ea5e9; word-break: break-all;">${confirmationUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                      L'équipe KiloFly vous souhaite un excellent voyage ! ✈️
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

  if (type === 'recovery' || type === 'magiclink') {
    const title = type === 'recovery' ? 'Réinitialisez votre mot de passe' : 'Connexion sécurisée';
    const buttonText = type === 'recovery' ? '🔑 Réinitialiser le mot de passe' : '🔐 Se connecter';
    const message = type === 'recovery' 
      ? 'Vous avez demandé à réinitialiser votre mot de passe sur KiloFly. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.'
      : 'Utilisez ce lien sécurisé pour vous connecter à votre compte KiloFly.';

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
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="${baseStyles.container}">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border-radius: 12px 12px 0 0;">
                    <img src="${logoUrl}" alt="KiloFly" style="height: 70px; width: auto; margin-bottom: 15px;" />
                    <h1 style="color: #ffffff; font-size: 26px; margin: 10px 0 0 0; font-weight: 600;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #475569; line-height: 1.7; margin: 0 0 10px 0; font-size: 15px;">
                      Bonjour,
                    </p>
                    <p style="color: #475569; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                      ${message}
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${confirmationUrl}" style="${baseStyles.button}">
                        ${buttonText}
                      </a>
                    </div>
                    <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>🔒 Sécurité :</strong> Si vous n'avez pas fait cette demande, ignorez cet email. Votre compte reste sécurisé.
                      </p>
                    </div>
                    <p style="color: #94a3b8; line-height: 1.6; margin: 25px 0 0 0; font-size: 12px;">
                      Ce lien expirera dans 1 heure. Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                      <a href="${confirmationUrl}" style="color: #0ea5e9; word-break: break-all;">${confirmationUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                      Besoin d'aide ? Contactez notre équipe support.
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

  // Default template for other types
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
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="${baseStyles.container}">
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); border-radius: 12px 12px 0 0;">
                  <img src="${logoUrl}" alt="KiloFly" style="height: 70px; width: auto; margin-bottom: 15px;" />
                  <h1 style="color: #ffffff; font-size: 26px; margin: 10px 0 0 0; font-weight: 600;">KiloFly</h1>
                  <p style="color: #bfdbfe; font-size: 15px; margin: 8px 0 0 0;">Chaque Kilo compte</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #475569; line-height: 1.7; margin: 0 0 25px 0; font-size: 15px;">
                    Cliquez sur le bouton ci-dessous pour continuer.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" style="${baseStyles.button}">
                      Continuer
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
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
};

const getSubject = (type: string): string => {
  switch (type) {
    case 'signup':
      return '✉️ Confirmez votre email - KiloFly';
    case 'email_change':
      return '✉️ Confirmez votre nouvelle adresse email - KiloFly';
    case 'recovery':
      return '🔑 Réinitialisez votre mot de passe - KiloFly';
    case 'magiclink':
      return '🔐 Votre lien de connexion - KiloFly';
    case 'invite':
      return '🎉 Vous êtes invité à rejoindre KiloFly';
    default:
      return 'KiloFly - Notification';
  }
};

const handler = async (req: Request): Promise<Response> => {
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
    const baseUrl = redirect_to || "https://kiloflyappcom.lovable.app";
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
