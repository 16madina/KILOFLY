import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const FloatingActionButton = ({
  onClick,
  icon,
  className,
}: FloatingActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-6 z-40",
        "w-14 h-14 rounded-full",
        "bg-gradient-sky text-primary-foreground",
        "shadow-hover hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        className
      )}
    >
      {icon || <Plus className="h-6 w-6" />}
    </button>
  );
};

export default FloatingActionButton;
