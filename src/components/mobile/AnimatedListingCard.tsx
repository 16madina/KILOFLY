import { motion } from "framer-motion";
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
  const handleTap = async () => {
    await hapticImpact(ImpactStyle.Light);
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
      onTapStart={handleTap}
    >
      <ListingCard {...props} />
    </motion.div>
  );
};

export default AnimatedListingCard;
