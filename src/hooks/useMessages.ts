import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
  id_verified: boolean | null;
}

interface MessageData {
  content: string;
  created_at: string;
  sender_id: string;
  read: boolean;
}

export interface ReservationData {
  id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  buyer: ProfileData;
  seller: ProfileData;
  messages: MessageData[];
  reservation: {
    requested_kg: number;
    status: string;
    listing?: {
      departure: string;
      arrival: string;
    };
  };
}

export interface ConversationData {
  id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  buyer: ProfileData;
  seller: ProfileData;
  messages: MessageData[];
}

export const useMessages = (userId: string | undefined) => {
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Fetch regular conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select(
          `
          id,
          buyer_id,
          seller_id,
          updated_at,
          buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
          seller:profiles!seller_id(full_name, avatar_url, id_verified),
          messages(content, created_at, sender_id, read)
        `
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // Fetch reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select(
          `
          id,
          buyer_id,
          seller_id,
          updated_at,
          requested_kg,
          status,
          buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
          seller:profiles!seller_id(full_name, avatar_url, id_verified),
          listing:listings!listing_id(departure, arrival),
          reservation_messages:reservation_messages(content, created_at, sender_id, read)
        `
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .neq("status", "rejected")
        .neq("status", "cancelled")
        .order("updated_at", { ascending: false });

      if (reservationsError) throw reservationsError;

      // Transform conversations
      const transformedConversations: ConversationData[] = (conversationsData || []).map(
        (conv: any) => ({
          id: conv.id,
          buyer_id: conv.buyer_id,
          seller_id: conv.seller_id,
          updated_at: conv.updated_at,
          buyer: conv.buyer,
          seller: conv.seller,
          messages: conv.messages || [],
        })
      );

      // Transform reservations - ONLY include those with messages
      const transformedReservations: ReservationData[] = (reservationsData || [])
        .filter((res: any) => res.reservation_messages && res.reservation_messages.length > 0)
        .map((res: any) => ({
          id: res.id,
          buyer_id: res.buyer_id,
          seller_id: res.seller_id,
          updated_at: res.updated_at,
          buyer: res.buyer,
          seller: res.seller,
          messages: res.reservation_messages || [],
          reservation: {
            requested_kg: res.requested_kg,
            status: res.status,
            listing: res.listing,
          },
        }));

      setConversations(transformedConversations);
      setReservations(transformedReservations);
    } catch (error) {
      toast.error("Erreur lors du chargement des messages");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", conversationId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Conversation supprimée");
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchData();

    // Subscribe to updates
    const channel = supabase
      .channel("messages-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchData)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservation_messages" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    reservations,
    conversations,
    loading,
    deleteConversation,
    refetch: fetchData,
  };
};
