import { Link, useLocation } from "react-router-dom";
import { Home, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: "/",
      label: "Accueil",
      icon: Home,
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                  isActive && "bg-primary/10 scale-110"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "animate-scale-in")} />
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
