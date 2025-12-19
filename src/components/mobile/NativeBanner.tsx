import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticNotification } from "@/hooks/useHaptics";
import { NotificationType } from "@capacitor/haptics";

type BannerType = "success" | "error" | "warning" | "info";

interface Banner {
  id: string;
  type: BannerType;
  message: string;
  duration?: number;
}

interface NativeBannerContextType {
  showBanner: (type: BannerType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const NativeBannerContext = createContext<NativeBannerContextType | null>(null);

export const useNativeBanner = () => {
  const context = useContext(NativeBannerContext);
  if (!context) {
    throw new Error("useNativeBanner must be used within a NativeBannerProvider");
  }
  return context;
};

const bannerConfig: Record<BannerType, { icon: typeof Check; bg: string; iconBg: string }> = {
  success: {
    icon: Check,
    bg: "bg-success/95 dark:bg-success/90",
    iconBg: "bg-success-foreground/20",
  },
  error: {
    icon: X,
    bg: "bg-destructive/95 dark:bg-destructive/90",
    iconBg: "bg-destructive-foreground/20",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-accent/95 dark:bg-accent/90",
    iconBg: "bg-accent-foreground/20",
  },
  info: {
    icon: Info,
    bg: "bg-primary/95 dark:bg-primary/90",
    iconBg: "bg-primary-foreground/20",
  },
};

const BannerItem = ({ banner, onDismiss }: { banner: Banner; onDismiss: () => void }) => {
  const config = bannerConfig[banner.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] pt-safe",
        config.bg
      )}
    >
      <div 
        className="flex items-center gap-3 px-4 py-3 min-h-[52px]"
        onClick={onDismiss}
      >
        <div className={cn("p-1.5 rounded-full", config.iconBg)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <p className="flex-1 text-sm font-medium text-white leading-tight">
          {banner.message}
        </p>
      </div>
    </motion.div>
  );
};

export const NativeBannerProvider = ({ children }: { children: ReactNode }) => {
  const [banners, setBanners] = useState<Banner[]>([]);

  const showBanner = useCallback((type: BannerType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    const banner: Banner = { id, type, message, duration };

    setBanners((prev) => [...prev, banner]);

    // Trigger haptic feedback
    if (type === "success") {
      hapticNotification(NotificationType.Success);
    } else if (type === "error") {
      hapticNotification(NotificationType.Error);
    } else if (type === "warning") {
      hapticNotification(NotificationType.Warning);
    }

    if (duration > 0) {
      setTimeout(() => {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      }, duration);
    }
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const value: NativeBannerContextType = {
    showBanner,
    success: (message, duration) => showBanner("success", message, duration),
    error: (message, duration) => showBanner("error", message, duration),
    warning: (message, duration) => showBanner("warning", message, duration),
    info: (message, duration) => showBanner("info", message, duration),
  };

  return (
    <NativeBannerContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {banners.length > 0 && (
          <BannerItem
            key={banners[0].id}
            banner={banners[0]}
            onDismiss={() => dismissBanner(banners[0].id)}
          />
        )}
      </AnimatePresence>
    </NativeBannerContext.Provider>
  );
};
