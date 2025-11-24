import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VerifiedBadgeProps {
  verified: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VerifiedBadge = ({ verified, size = "sm", className = "" }: VerifiedBadgeProps) => {
  if (!verified) return null;

  const sizeClasses = {
    sm: "text-xs gap-1 px-2 py-0.5",
    md: "text-sm gap-1.5 px-2.5 py-1",
    lg: "text-base gap-2 px-3 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      variant="secondary" 
      className={`bg-primary/10 text-primary border-primary/20 ${sizeClasses[size]} ${className}`}
    >
      <CheckCircle2 className={iconSizes[size]} />
      Vérifié
    </Badge>
  );
};

export default VerifiedBadge;
