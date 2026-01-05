import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      console.error("FCM_SERVER_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
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

    const results = await Promise.all(
      tokens.map(async ({ token, platform }) => {
        try {
          // FCM HTTP v1 API message format
          const message = {
            to: token,
            notification: {
              title,
              body,
              sound: "default",
              badge: 1,
            },
            data: {
              ...data,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            priority: "high",
            content_available: true,
          };

          const response = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify(message),
          });

          const result = await response.json();
          
          // Check for invalid token and remove it
          if (result.failure === 1 && result.results?.[0]?.error === "NotRegistered") {
            console.log(`Removing invalid token for platform ${platform}`);
            await supabase
              .from("push_tokens")
              .delete()
              .eq("token", token);
          }

          return { token: token.substring(0, 20) + "...", success: result.success === 1, platform };
        } catch (error) {
          console.error(`Error sending to token:`, error);
          return { token: token.substring(0, 20) + "...", success: false, error: String(error) };
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