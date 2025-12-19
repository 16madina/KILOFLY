import { motion } from "framer-motion";
import { useState } from "react";
import SwipeableCard from "./SwipeableCard";
import { Flag, UserX } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import { hapticImpact } from "@/hooks/useHaptics";
import { ImpactStyle } from "@capacitor/haptics";

interface AnimatedListingCardProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  departure: string;
  arrival: string;
  departureDate: string;
  arrivalDate: string;
  availableKg: number;
  pricePerKg: number;
  currency?: string;
  destinationImage: string;
  isFavorited: boolean;
  onFavoriteToggle: () => void;
  allowedItems: string[];
  prohibitedItems: string[];
  description?: string;
  index: number;
}

const AnimatedListingCard = (props: AnimatedListingCardProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTap = async () => {
    await hapticImpact(ImpactStyle.Light);
  };

  const handleSwipeLeft = () => {
    console.log("Report action");
    // TODO: Implement report action
  };

  const handleSwipeRight = () => {
    console.log("Block action");
    // TODO: Implement block action
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: props.index * 0.04,
        ease: [0.32, 0.72, 0, 1],
      }}
      whileTap={{ scale: 0.98 }}
      onTapStart={() => {
        setIsPressed(true);
        handleTap();
      }}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      className="relative"
    >
      <SwipeableCard
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        leftAction={
          <div className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            <span className="text-sm font-medium">Signaler</span>
          </div>
        }
        rightAction={
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserX className="h-5 w-5" />
            <span className="text-sm font-medium">Bloquer</span>
          </div>
        }
      >
        <div className={isPressed ? "opacity-95" : ""}>
          <ListingCard {...props} />
        </div>
      </SwipeableCard>
    </motion.div>
  );
};

export default AnimatedListingCard;
