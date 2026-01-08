import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Base64url encode
function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" 
    ? new TextEncoder().encode(data) 
    : data;
  return encodeBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate JWT for Google OAuth2
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  return `${signatureInput}.${signatureB64}`;
}

// Get OAuth2 access token using service account
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OAuth2 token error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid service account configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, data }: PushPayload = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all tokens for this user
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens found for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: "No push tokens registered for user", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${tokens.length} devices for user ${user_id}`);

    // Get OAuth2 access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccount);
      console.log("Successfully obtained OAuth2 access token");
    } catch (e) {
      console.error("Failed to get access token:", e);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with FCM" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectId = serviceAccount.project_id;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const results = await Promise.all(
      tokens.map(async ({ token, platform }) => {
        try {
          // Ensure all data values are strings (FCM requirement)
          const stringData: Record<string, string> = {};
          if (data) {
            for (const [key, value] of Object.entries(data)) {
              stringData[key] = String(value ?? "");
            }
          }
          stringData.click_action = "FLUTTER_NOTIFICATION_CLICK";

          // FCM HTTP v1 API message format
          const message: any = {
            message: {
              token: token,
              notification: {
                title,
                body,
              },
              data: stringData,
            },
          };

          // Add platform-specific config
          if (platform === "ios") {
            message.message.apns = {
              headers: {
                "apns-priority": "10",
                "apns-push-type": "alert",
              },
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                  sound: "default",
                  badge: 1,
                  "mutable-content": 1,
                  "content-available": 1,
                },
                // Include custom data in APNs payload for iOS
                ...stringData,
              },
            };
          } else {
            message.message.android = {
              priority: "high",
              notification: {
                sound: "default",
                channelId: "default",
              },
            };
          }

          const response = await fetch(fcmUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(message),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error(`FCM error for token ${token.substring(0, 20)}...:`, result);
            
            // Check for invalid token errors and remove them
            if (
              result.error?.code === 404 ||
              result.error?.details?.some((d: any) => 
                d.errorCode === "UNREGISTERED" || 
                d.errorCode === "INVALID_ARGUMENT"
              )
            ) {
              console.log(`Removing invalid token for platform ${platform}`);
              await supabase
                .from("push_tokens")
                .delete()
                .eq("token", token);
            }

            return { token: token.substring(0, 20) + "...", success: false, error: result.error?.message, platform };
          }

          console.log(`Successfully sent to ${platform} device:`, result.name);
          return { token: token.substring(0, 20) + "...", success: true, platform, messageId: result.name };
        } catch (error) {
          console.error(`Error sending to token:`, error);
          return { token: token.substring(0, 20) + "...", success: false, error: String(error), platform };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    console.log(`Push sent: ${successCount}/${tokens.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: "Push notifications sent", 
        sent: successCount, 
        total: tokens.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
