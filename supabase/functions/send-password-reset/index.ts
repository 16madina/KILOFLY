import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface PasswordResetRequest {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing password reset for:", email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://kiloflyapp.com/reset-password",
      },
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = linkData?.properties?.action_link;

    if (!resetLink) {
      console.error("No reset link generated");
      return new Response(
        JSON.stringify({ success: true, message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reset link generated successfully");

    // Send premium branded email
    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialiser votre mot de passe - KiloFly</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 10px;">✈️</div>
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">KiloFly</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">Chaque Kilo compte</p>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="background-color: #1e293b; padding: 40px 30px;">
              
              <!-- Lock icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; padding: 20px;">
                  <span style="font-size: 32px;">🔐</span>
                </div>
              </div>
              
              <!-- Title -->
              <h2 style="color: #ffffff; font-size: 24px; text-align: center; margin: 0 0 16px 0;">
                Réinitialisation de mot de passe
              </h2>
              
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                  🔑 Réinitialiser mon mot de passe
                </a>
              </div>
              
              <!-- Security notice -->
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                  ⏰ Ce lien expire dans <strong style="color: #f59e0b;">1 heure</strong>.<br>
                  Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
              </div>
              
              <!-- Link fallback -->
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #334155;">
                <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                </p>
                <p style="color: #3b82f6; font-size: 11px; word-break: break-all; text-align: center; margin: 0;">
                  ${resetLink}
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; border-radius: 0 0 16px 16px; padding: 30px; text-align: center; border-top: 1px solid #1e293b;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
                © 2025 KiloFly - Transport de colis entre voyageurs
              </p>
              <p style="color: #475569; font-size: 11px; margin: 0;">
                Besoin d'aide ? <a href="mailto:kiloflyapp@hotmail.com" style="color: #3b82f6; text-decoration: none;">kiloflyapp@hotmail.com</a>
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

    const emailResponse = await resend.emails.send({
      from: "KiloFly <noreply@kiloflyapp.com>",
      to: [email],
      subject: "🔐 Réinitialiser votre mot de passe - KiloFly",
      html: emailHtml,
    });

    console.log("Password reset email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de réinitialisation envoyé !" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
