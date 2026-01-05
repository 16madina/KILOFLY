import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Archive } from "lucide-react";
import ReservationCard from "./ReservationCard";

interface SwipeableReservationCardProps {
  id: string;
  otherUser: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  status: string;
  departure: string;
  arrival: string;
  requestedKg: number;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  onClick: () => void;
  onArchive: () => void;
}

const SwipeableReservationCard = ({
  id,
  otherUser,
  status,
  departure,
  arrival,
  requestedKg,
  lastMessage,
  unreadCount,
  updatedAt,
  onClick,
  onArchive,
}: SwipeableReservationCardProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  const archiveOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const archiveScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -80) {
      setIsRemoving(true);
      setTimeout(() => {
        onArchive();
      }, 200);
    }
  };

  if (isRemoving) {
    return (
      <motion.div
        initial={{ height: "auto", opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-lg">
      {/* Archive background */}
      <motion.div
        style={{ opacity: archiveOpacity }}
        className="absolute inset-y-0 right-0 w-20 bg-amber-500 flex items-center justify-center rounded-r-lg"
      >
        <motion.div style={{ scale: archiveScale }}>
          <Archive className="h-6 w-6 text-white" />
        </motion.div>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-background"
      >
        <ReservationCard
          id={id}
          otherUser={otherUser}
          status={status}
          departure={departure}
          arrival={arrival}
          requestedKg={requestedKg}
          lastMessage={lastMessage}
          unreadCount={unreadCount}
          updatedAt={updatedAt}
          onClick={onClick}
        />
      </motion.div>
    </div>
  );
};

export default SwipeableReservationCard;
