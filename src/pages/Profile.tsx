import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  Star,
  Package,
  MapPin,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";

const Profile = () => {
  // Mock user data
  const user = {
    name: "Marie Dubois",
    email: "marie.dubois@example.com",
    rating: 4.8,
    totalTrips: 23,
    totalKg: 345,
    verificationStatus: "verified",
  };

  const menuItems = [
    {
      icon: User,
      label: "Modifier le profil",
      action: () => {},
    },
    {
      icon: Package,
      label: "Mes annonces",
      action: () => {},
      badge: "3",
    },
    {
      icon: MapPin,
      label: "Mes voyages",
      action: () => {},
    },
    {
      icon: Shield,
      label: "Vérification",
      action: () => {},
    },
    {
      icon: Settings,
      label: "Paramètres",
      action: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-sky pt-safe pb-8">
        <div className="container flex justify-end">
          <Button variant="ghost" size="icon" className="text-primary-foreground">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="container -mt-12">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 border-4 border-background shadow-lg">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-sky text-primary-foreground text-2xl">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                {user.verificationStatus === "verified" && (
                  <Badge className="bg-success text-white">
                    <Shield className="h-3 w-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground mb-4">{user.email}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                  <Star className="h-5 w-5 text-accent mb-1" />
                  <span className="text-lg font-bold">{user.rating}</span>
                  <span className="text-xs text-muted-foreground">Note</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary mb-1" />
                  <span className="text-lg font-bold">{user.totalTrips}</span>
                  <span className="text-xs text-muted-foreground">Voyages</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                  <Package className="h-5 w-5 text-accent mb-1" />
                  <span className="text-lg font-bold">{user.totalKg}</span>
                  <span className="text-xs text-muted-foreground">Kg totaux</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="mt-6 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge && (
                <Badge className="bg-accent text-accent-foreground">
                  {item.badge}
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}

          {/* Logout Button */}
          <button className="w-full flex items-center gap-3 p-4 bg-card hover:bg-destructive/10 rounded-xl transition-colors text-destructive">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="flex-1 text-left font-medium">Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
