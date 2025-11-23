import { ReactNode, useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxPullDistance = 120;
  const triggerDistance = 80;

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === 0 || refreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      setPulling(true);
      setPullDistance(Math.min(distance * 0.5, maxPullDistance));
      
      if (distance * 0.5 > triggerDistance) {
        // Add haptic feedback if available
        if (window.navigator && (window.navigator as any).vibrate) {
          (window.navigator as any).vibrate(10);
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > triggerDistance && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }

    setPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove);
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, refreshing]);

  return (
    <div ref={containerRef} className="relative overflow-y-auto h-full">
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none",
          pulling || refreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
        }}
      >
        <div className="bg-card rounded-full p-3 shadow-lg">
          <RefreshCw
            className={cn(
              "h-6 w-6 text-primary transition-transform",
              refreshing && "animate-spin",
              pullDistance > triggerDistance && !refreshing && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pulling || refreshing ? pullDistance : 0}px)`,
          transition: pulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
