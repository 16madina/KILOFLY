import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  listing_id: string;
  departure: string;
  arrival: string;
  available_kg: number;
  poster_user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { listing_id, departure, arrival, available_kg, poster_user_id }: NotifyPayload = await req.json();

    if (!listing_id || !departure || !arrival || !poster_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`New listing notification: ${departure} → ${arrival}, ${available_kg}kg`);

    // Get all users with push tokens (except the poster)
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token, platform")
      .neq("user_id", poster_user_id);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for other users");
      return new Response(
        JSON.stringify({ message: "No users to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(tokens.map(t => t.user_id))];
    console.log(`Found ${uniqueUserIds.length} users to notify`);

    // Check notification preferences for each user
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id, alerts")
      .in("user_id", uniqueUserIds);

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    // Create a map of user preferences
    const prefsMap = new Map(preferences?.map(p => [p.user_id, p.alerts]) || []);

    // Filter users who have alerts enabled (default to true if no preference)
    const usersToNotify = uniqueUserIds.filter(userId => {
      const alertsEnabled = prefsMap.get(userId);
      return alertsEnabled !== false; // Notify if true or undefined
    });

    console.log(`${usersToNotify.length} users have alerts enabled`);

    // Send notifications using the existing send-push-notification function
    const notificationPromises = usersToNotify.map(async (userId) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: userId,
            title: "✈️ Nouveau voyage disponible !",
            body: `${departure} → ${arrival} • ${available_kg}kg disponibles`,
            data: {
              type: "new_listing",
              listing_id: listing_id,
              url: `/listing/${listing_id}`,
            },
          }),
        });

        const result = await response.json();
        return { userId, success: response.ok, result };
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
        return { userId, success: false, error: String(error) };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Notifications sent: ${successCount}/${usersToNotify.length} successful`);

    // Also create in-app notifications for all users
    const notifications = usersToNotify.map(userId => ({
      user_id: userId,
      title: "Nouveau voyage disponible !",
      message: `${departure} → ${arrival} • ${available_kg}kg disponibles`,
      type: "new_listing",
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating in-app notifications:", notifError);
      } else {
        console.log(`Created ${notifications.length} in-app notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications sent",
        users_notified: successCount,
        total_users: usersToNotify.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-new-listing:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
