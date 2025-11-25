import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadMessages = (reservationId: string) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!reservationId || !user) return;

    fetchUnreadCount();

    // Setup realtime subscription
    const channel = supabase
      .channel(`unread-${reservationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservation_messages",
          filter: `reservation_id=eq.${reservationId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId, user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from("reservation_messages")
        .select("*", { count: "exact", head: true })
        .eq("reservation_id", reservationId)
        .eq("read", false)
        .neq("sender_id", user.id);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  return unreadCount;
};
