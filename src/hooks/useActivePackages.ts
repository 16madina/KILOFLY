import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const IN_TRANSIT_STATUSES = [
  "approved",
  "in_progress",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "arrived",
  "out_for_delivery"
];

export const useActivePackages = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      const { count: packageCount, error } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .in("status", IN_TRANSIT_STATUSES)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!error && packageCount !== null) {
        setCount(packageCount);
      }
    };

    fetchCount();

    // Real-time subscription
    const channel = supabase
      .channel("active-packages-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
};
