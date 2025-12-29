import { Link, useLocation } from "react-router-dom";
import { Home, Plus, MessageCircle, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { isIOS } from "@/lib/platform";
import { useUnreadConversations } from "@/hooks/useUnreadConversations";
import { hapticImpact } from "@/hooks/useHaptics";
import { ImpactStyle } from "@capacitor/haptics";

const MobileBottomNav = () => {
  const location = useLocation();
  const unreadCount = useUnreadConversations();
  
  const navItems = [
    {
      path: "/",
      label: "Accueil",
      icon: Home,
    },
    {
      path: "/tracking",
      label: "Suivi",
      icon: Package,
    },
    {
      path: "/post",
      label: "Poster",
      icon: Plus,
    },
    {
      path: "/messages",
      label: "Messages",
      icon: MessageCircle,
    },
    {
      path: "/profile",
      label: "Profil",
      icon: User,
    },
  ];

  const handleTabPress = async () => {
    await hapticImpact(ImpactStyle.Light);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t pb-safe",
        isIOS() 
          ? "bg-card/80 backdrop-blur-xl border-border/30 supports-[backdrop-filter]:bg-card/70" 
          : "bg-card border-border shadow-2xl"
      )}
    >
      <div className="flex items-center justify-around h-16 px-2 relative">
        {/* Animated indicator */}
        <motion.div
          className="absolute top-0 h-0.5 bg-primary rounded-full"
          layoutId="activeIndicator"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          style={{
            width: `${100 / navItems.length}%`,
            left: `${(navItems.findIndex(item => item.path === location.pathname) / navItems.length) * 100}%`,
          }}
        />

        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          const showBadge = path === "/messages" && unreadCount > 0;
          
          return (
            <Link
              key={path}
              to={path}
              onClick={handleTabPress}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <motion.div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full relative",
                  isActive && "bg-primary/10"
                )}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    scale: isActive ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
                
                {/* Notification badge */}
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.div>
                )}
              </motion.div>
              <motion.span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
                animate={{
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
