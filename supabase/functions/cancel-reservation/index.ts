import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CancelReservationBody = {
  reservationId: string;
};

type ReservationRecord = {
  id: string;
  status: string;
  buyer_id: string;
  seller_id: string;
  requested_kg: number;
  total_price: number;
  listing_id: string;
};

type ListingRecord = {
  departure: string;
  arrival: string;
  currency: string;
  available_kg: number;
};

type ProfileRecord = {
  full_name: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("cancel-reservation: Missing backend configuration");
      throw new Error("Missing backend configuration");
    }

    // Robustly extract the Authorization header
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    console.log("cancel-reservation: auth check", {
      hasAuthHeader: !!authHeader,
      tokenLength: token.length,
    });

    if (!token) {
      console.error("cancel-reservation: No token provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client and explicitly pass the token to getUser
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    console.log("cancel-reservation: user lookup", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (userError || !user) {
      console.error("cancel-reservation: User auth failed", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reservationId } = (await req.json()) as CancelReservationBody;

    if (!reservationId) {
      return new Response(JSON.stringify({ error: "reservationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("cancel-reservation: processing", { reservationId, userId: user.id });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch reservation
    const { data: reservationRaw, error: reservationError } = await admin
      .from("reservations")
      .select("id,status,buyer_id,seller_id,requested_kg,total_price,listing_id")
      .eq("id", reservationId)
      .maybeSingle();

    if (reservationError) {
      console.error("cancel-reservation: failed to load reservation", reservationError);
      throw reservationError;
    }

    const reservation = reservationRaw as unknown as ReservationRecord | null;

    if (!reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ownership
    if (reservation.buyer_id !== user.id) {
      console.error("cancel-reservation: forbidden - user is not buyer", {
        buyerId: reservation.buyer_id,
        userId: user.id,
      });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent: if already cancelled, return success
    if (reservation.status === "cancelled") {
      console.log("cancel-reservation: already cancelled, returning success");
      return new Response(
        JSON.stringify({
          success: true,
          reservationId,
          status: "cancelled",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only allow cancel for pending/approved
    if (!["pending", "approved"].includes(reservation.status)) {
      console.error("cancel-reservation: invalid status for cancellation", reservation.status);
      return new Response(
        JSON.stringify({
          error: `Cannot cancel reservation in status: ${reservation.status}`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Block if payment already captured/authorized/paid
    const { data: paidTx, error: paidTxError } = await admin
      .from("transactions")
      .select("id, payment_status, status")
      .eq("reservation_id", reservationId)
      .or("payment_status.in.(captured,authorized,paid),status.eq.completed")
      .limit(1)
      .maybeSingle();

    if (paidTxError) {
      console.error("cancel-reservation: failed to check payment status", paidTxError);
      throw paidTxError;
    }

    if (paidTx) {
      console.error("cancel-reservation: payment already completed", paidTx);
      return new Response(
        JSON.stringify({
          error: "Payment already completed for this reservation",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch listing for route info and kg restoration
    const { data: listingRaw, error: listingError } = await admin
      .from("listings")
      .select("departure,arrival,currency,available_kg")
      .eq("id", reservation.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error("cancel-reservation: failed to load listing", listingError);
    }

    const listing = listingRaw as unknown as ListingRecord | null;

    // Fetch buyer name for notification
    const { data: buyerRaw, error: buyerError } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", reservation.buyer_id)
      .maybeSingle();

    if (buyerError) {
      console.error("cancel-reservation: failed to load buyer profile", buyerError);
    }

    const buyer = buyerRaw as unknown as ProfileRecord | null;

    console.log("cancel-reservation: cancelling reservation");

    // 1) Update reservation to cancelled
    const { error: updateReservationError } = await admin
      .from("reservations")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", reservationId);

    if (updateReservationError) {
      console.error("cancel-reservation: failed to update reservation", updateReservationError);
      throw updateReservationError;
    }

    // 2) Cancel all pending transactions for this reservation
    const { data: cancelledTxs, error: updateTxError } = await admin
      .from("transactions")
      .update({
        status: "cancelled",
        payment_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservationId)
      .not("payment_status", "in", "(captured,authorized,paid)")
      .not("status", "eq", "completed")
      .select("id");

    if (updateTxError) {
      console.error("cancel-reservation: failed to update transactions", updateTxError);
    } else {
      console.log("cancel-reservation: cancelled transactions", cancelledTxs?.length || 0);
    }

    // 3) Restore kg to the listing
    if (listing && reservation.requested_kg > 0) {
      const newAvailableKg = (listing.available_kg || 0) + reservation.requested_kg;
      const { error: restoreKgError } = await admin
        .from("listings")
        .update({ available_kg: newAvailableKg, updated_at: new Date().toISOString() })
        .eq("id", reservation.listing_id);

      if (restoreKgError) {
        console.error("cancel-reservation: failed to restore kg", restoreKgError);
      } else {
        console.log("cancel-reservation: restored kg", {
          oldKg: listing.available_kg,
          newKg: newAvailableKg,
        });
      }
    }

    // 4) Add tracking event
    const route = listing ? `${listing.departure} → ${listing.arrival}` : "";
    const description = `Réservation de ${reservation.requested_kg} kg annulée par l'expéditeur avant paiement`;

    const { error: trackingError } = await admin.from("tracking_events").insert({
      reservation_id: reservationId,
      status: "cancelled",
      description,
      is_automatic: true,
      created_at: new Date().toISOString(),
    });

    if (trackingError) {
      console.error("cancel-reservation: failed to insert tracking event", trackingError);
    }

    // 5) Notify seller
    if (reservation.seller_id) {
      const buyerName = buyer?.full_name || "L'expéditeur";
      const amount = reservation.total_price;
      const currency = listing?.currency || "EUR";

      const { error: notifyError } = await admin.rpc("send_notification", {
        p_user_id: reservation.seller_id,
        p_title: "❌ Réservation annulée",
        p_message: `${buyerName} a annulé sa réservation de ${reservation.requested_kg} kg sur le trajet ${route}. Montant annulé : ${amount} ${currency}. Les kg réservés sont à nouveau disponibles.`,
        p_type: "warning",
      });

      if (notifyError) {
        console.error("cancel-reservation: failed to notify seller", notifyError);
      }
    }

    console.log("cancel-reservation: success", { reservationId });

    return new Response(
      JSON.stringify({
        success: true,
        reservationId,
        status: "cancelled",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("cancel-reservation: unhandled error", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
