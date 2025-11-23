import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane, Plus, User } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="rounded-lg bg-gradient-sky p-2">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="bg-gradient-sky bg-clip-text text-transparent">
            KiloShare
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/post">
            <Button variant="default" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Poster une annonce</span>
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
