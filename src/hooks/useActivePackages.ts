import { useEffect, useState, useRef, useCallback } from "react";
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
  const [hasNewPackage, setHasNewPackage] = useState(false);
  const previousCountRef = useRef(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    
    const { count: packageCount, error } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .in("status", IN_TRANSIT_STATUSES)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (!error && packageCount !== null) {
      // Check if count increased (new package arrived)
      if (packageCount > previousCountRef.current && previousCountRef.current > 0) {
        setHasNewPackage(true);
        // Reset animation after 3 seconds
        setTimeout(() => setHasNewPackage(false), 3000);
      }
      previousCountRef.current = packageCount;
      setCount(packageCount);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCount(0);
      previousCountRef.current = 0;
      return;
    }

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
  }, [user, fetchCount]);

  return { count, hasNewPackage };
};
