import { Link, useLocation } from "react-router-dom";
import { Home, Plus, MessageCircle, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { isIOS } from "@/lib/platform";
import { useUnreadConversations } from "@/hooks/useUnreadConversations";
import { useActivePackages } from "@/hooks/useActivePackages";
import { hapticImpact } from "@/hooks/useHaptics";
import { ImpactStyle } from "@capacitor/haptics";

const MobileBottomNav = () => {
  const location = useLocation();
  const unreadCount = useUnreadConversations();
  const { count: activePackages, hasNewPackage } = useActivePackages();
  
  const navItems = [
    {
      path: "/",
      label: "Accueil",
      icon: Home,
      badge: 0,
      pulse: false,
    },
    {
      path: "/tracking",
      label: "Suivi",
      icon: Package,
      badge: activePackages,
      pulse: hasNewPackage,
    },
    {
      path: "/post",
      label: "Poster",
      icon: Plus,
      badge: 0,
      pulse: false,
      isCenter: true,
    },
    {
      path: "/messages",
      label: "Messages",
      icon: MessageCircle,
      badge: unreadCount,
      pulse: false,
    },
    {
      path: "/profile",
      label: "Profil",
      icon: User,
      badge: 0,
      pulse: false,
    },
  ];

  const handleTabPress = async () => {
    await hapticImpact(ImpactStyle.Light);
  };

  const activeIndex = navItems.findIndex(item => item.path === location.pathname);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pb-safe",
        isIOS() 
          ? "glass-nav" 
          : "glass-nav"
      )}
    >
      <div className="flex items-center justify-around h-18 px-2 relative">
        {/* Animated background indicator */}
        <motion.div
          className="absolute h-12 rounded-2xl bg-primary/10 -z-10"
          initial={false}
          animate={{
            x: `${activeIndex * 100}%`,
            width: `${100 / navItems.length}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
          style={{
            left: 8,
            right: 8,
          }}
        />

        {navItems.map(({ path, label, icon: Icon, badge, pulse, isCenter }) => {
          const isActive = location.pathname === path;
          const showBadge = badge > 0;
          
          // Render center button (Poster) differently
          if (isCenter) {
            return (
              <Link
                key={path}
                to={path}
                onClick={handleTabPress}
                className="flex flex-col items-center justify-center flex-1 h-full -mt-4"
              >
                <motion.div
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-2xl fab",
                    "bg-gradient-to-br from-primary to-accent"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25,
                  }}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                </motion.div>
                <motion.span
                  className="text-[10px] font-medium text-muted-foreground mt-1"
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {label}
                </motion.span>
              </Link>
            );
          }
          
          return (
            <Link
              key={path}
              to={path}
              onClick={handleTabPress}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-colors duration-200"
              )}
            >
              <motion.div
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-xl relative",
                )}
                animate={{
                  scale: isActive ? 1 : 0.92,
                }}
                whileTap={{ scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon 
                    className={cn(
                      "h-[22px] w-[22px] transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>
                
                {/* Notification badge with glow effect */}
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                      path === "/tracking" 
                        ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg shadow-primary/30" 
                        : "bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground shadow-lg shadow-destructive/30"
                    )}
                  >
                    {badge > 9 ? "9+" : badge}
                    
                    {/* Pulse ring animation */}
                    {pulse && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-primary"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ 
                          scale: [1, 1.8, 2.2],
                          opacity: [0.6, 0.2, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </motion.div>
              <motion.span
                className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive 
                    ? "text-primary font-semibold" 
                    : "text-muted-foreground"
                )}
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