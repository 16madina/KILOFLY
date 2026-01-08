import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  country?: string;
  city?: string;
  userType?: string;
  avatarUrl?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      throw new Error("Configuration error");
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, fullName, phone, country, city, userType, avatarUrl }: SignupRequest = await req.json();

    console.log(`Creating user account for: ${email}, country: ${country}`);

    // Map country codes to their local currencies
    const countryCurrencyMap: Record<string, string> = {
      // Europe
      FR: 'EUR', BE: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR', FI: 'EUR',
      GB: 'GBP',
      CH: 'CHF',
      // North America
      US: 'USD',
      CA: 'CAD',
      // West Africa (UEMOA - XOF)
      SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
      // Central Africa (CEMAC - XAF)
      CM: 'XAF', GA: 'XAF', CG: 'XAF',
      // Other Africa
      GN: 'GNF',
      MA: 'MAD',
      NG: 'NGN',
      CD: 'CDF',
      DZ: 'DZD',
    };

    // Determine preferred currency based on country
    const preferredCurrency = country ? (countryCurrencyMap[country] || 'EUR') : 'EUR';
    console.log(`Preferred currency for ${country}: ${preferredCurrency}`);

    // Generate signup confirmation link with redirect
    const redirectTo = "https://kiloflyapp.com/email-confirmed";
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          full_name: fullName,
          phone: phone || "",
          country: country || "",
          city: city || "",
          user_type: userType || "traveler",
          avatar_url: avatarUrl || "",
          terms_accepted: true,
          preferred_currency: preferredCurrency,
        },
      },
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw linkError;
    }

    console.log("Confirmation link generated successfully");

    // Extract the confirmation link
    const confirmationLink = linkData.properties?.action_link;
    
    if (!confirmationLink) {
      throw new Error("Failed to generate confirmation link");
    }

    // Get first name for personalization
    const firstName = fullName.split(" ")[0];

    // Send premium branded email
    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur KiloFly</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <img src="https://yuhbvzjniylkruaylxzz.supabase.co/storage/v1/object/public/assets/kilofly-logo-v2.png" alt="KiloFly" style="height: 48px; margin-bottom: 16px;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ✈️ Bienvenue sur KiloFly !
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #f1f5f9; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
                Bonjour <strong style="color: #60a5fa;">${firstName}</strong> 👋
              </p>
              
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Merci de rejoindre la communauté KiloFly ! Vous êtes sur le point de découvrir une nouvelle façon de voyager et d'expédier vos colis entre l'Afrique et le reste du monde.
              </p>
              
              <!-- Email Badge -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 16px 20px; margin-bottom: 32px; border: 1px solid #334155;">
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 4px 0;">Votre adresse email</p>
                <p style="color: #f1f5f9; font-size: 16px; font-weight: 600; margin: 0;">${email}</p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${confirmationLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);">
                  ✅ Confirmer mon email
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 32px;">
                Ce lien expire dans 24 heures
              </p>
              
              <!-- Next Steps -->
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
                <h3 style="color: #60a5fa; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                  📋 Prochaines étapes
                </h3>
                <ul style="color: #cbd5e1; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                  <li>Confirmez votre email en cliquant sur le bouton ci-dessus</li>
                  <li>Vérifiez votre identité pour des transactions sécurisées</li>
                  <li>Publiez une annonce ou faites une demande de transport</li>
                  <li>Commencez à voyager avec KiloFly ! ✈️</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 40px; border-top: 1px solid #1e293b;">
              <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                Si vous n'avez pas créé de compte sur KiloFly, ignorez cet email.
              </p>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} KiloFly. Tous droits réservés.
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

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "KiloFly <noreply@kiloflyapp.com>",
      to: [email],
      subject: "✈️ Bienvenue sur KiloFly - Confirmez votre email",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Welcome confirmation email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created and confirmation email sent",
        userId: linkData.user?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-confirmation:", error);
    
    // Return specific error messages for known cases
    let errorMessage = error.message || "Une erreur est survenue";
    let statusCode = 500;
    
    if (error.message?.includes("already registered") || error.code === "user_already_exists") {
      errorMessage = "Cette adresse email est déjà utilisée";
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
