import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import kiloFlyLogo from "@/assets/kilofly-logo-new.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={kiloFlyLogo} 
            alt="KiloFly" 
            className="h-10 w-auto object-contain transition-transform hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          {user && (
            <>
              <NotificationBell />
              <Link to="/post" className="hidden sm:block">
                <Button variant="default" className="gap-2 bg-gradient-sky hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" />
                  <span>Poster une annonce</span>
                </Button>
              </Link>
            </>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="transition-transform hover:scale-105">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-fade-in">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="icon" className="transition-transform hover:scale-105">
                <User className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
