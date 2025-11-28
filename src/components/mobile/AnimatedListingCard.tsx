import { motion } from "framer-motion";
import { useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import SwipeableCard from "./SwipeableCard";
import { Flag, UserX } from "lucide-react";
import { isWeb } from "@/lib/platform";
import ListingCard from "@/components/ListingCard";

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
    if (!isWeb()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: props.index * 0.05,
        ease: [0.4, 0, 0.2, 1],
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
