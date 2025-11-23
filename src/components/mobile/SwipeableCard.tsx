import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  threshold?: number;
}

const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
}: SwipeableCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (Math.abs(translateX) > threshold) {
      if (translateX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (translateX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setTranslateX(0);
  };

  const opacity = Math.min(Math.abs(translateX) / threshold, 1);

  return (
    <div className="relative overflow-hidden">
      {/* Left Action */}
      {leftAction && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-4"
          style={{ opacity: translateX > 0 ? opacity : 0 }}
        >
          {leftAction}
        </div>
      )}

      {/* Right Action */}
      {rightAction && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4"
          style={{ opacity: translateX < 0 ? opacity : 0 }}
        >
          {rightAction}
        </div>
      )}

      {/* Card Content */}
      <div
        className={cn(
          "transition-transform",
          !isDragging && "duration-300 ease-out"
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;
