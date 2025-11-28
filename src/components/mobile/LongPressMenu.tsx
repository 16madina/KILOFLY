import { ReactNode, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share2, Flag, UserX, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface LongPressMenuProps {
  children: ReactNode;
  actions?: MenuAction[];
  onShare?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  onCopyLink?: () => void;
  className?: string;
}

const LongPressMenu = ({
  children,
  actions,
  onShare,
  onReport,
  onBlock,
  onCopyLink,
  className,
}: LongPressMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const pressTimer = useRef<NodeJS.Timeout>();
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const defaultActions: MenuAction[] = [
    ...(onShare ? [{
      icon: <Share2 className="h-5 w-5" />,
      label: "Partager",
      onClick: onShare,
    }] : []),
    ...(onCopyLink ? [{
      icon: <LinkIcon className="h-5 w-5" />,
      label: "Copier le lien",
      onClick: onCopyLink,
    }] : []),
    ...(onReport ? [{
      icon: <Flag className="h-5 w-5" />,
      label: "Signaler",
      onClick: onReport,
    }] : []),
    ...(onBlock ? [{
      icon: <UserX className="h-5 w-5" />,
      label: "Bloquer",
      onClick: onBlock,
      variant: "destructive" as const,
    }] : []),
  ];

  const menuActions = actions || defaultActions;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    pressStart.current = { x: touch.clientX, y: touch.clientY };
    
    pressTimer.current = setTimeout(() => {
      // Trigger haptic feedback
      Haptics.impact({ style: ImpactStyle.Medium });
      
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setMenuOpen(true);
    }, 800);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pressStart.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - pressStart.current.x);
    const deltaY = Math.abs(touch.clientY - pressStart.current.y);
    
    // Cancel if moved more than 10px
    if (deltaX > 10 || deltaY > 10) {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
      pressStart.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    pressStart.current = null;
  };

  const handleActionClick = (action: MenuAction) => {
    action.onClick();
    setMenuOpen(false);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleBackdropClick = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn("touch-manipulation", className)}
      >
        {children}
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />

            {/* Context Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", duration: 0.3 }}
              style={{
                position: "fixed",
                left: menuPosition.x,
                top: menuPosition.y,
                transform: "translate(-50%, -50%)",
              }}
              className="z-50 min-w-[200px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              {menuActions.map((action, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    action.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-muted",
                    index !== menuActions.length - 1 && "border-b border-border"
                  )}
                >
                  {action.icon}
                  <span className="font-medium">{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LongPressMenu;
