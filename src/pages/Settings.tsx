import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Shield, Globe, Bell, Palette, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [newMessages, setNewMessages] = useState(true);
  const [announceResponses, setAnnounceResponses] = useState(true);
  const [travelerAlerts, setTravelerAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    toast.success('Déconnexion réussie');
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

        <div className="space-y-4">
          {/* Security */}
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-between"
                onClick={() => navigate('/account-security')}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-medium">Sécurité</span>
                </div>
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </Button>
            </CardContent>
          </Card>

          {/* Language */}
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-between"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="font-medium">Langue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Français</span>
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Nouveaux messages</p>
                  <p className="text-sm text-muted-foreground">Recevoir une notification pour chaque message</p>
                </div>
                <Switch checked={newMessages} onCheckedChange={setNewMessages} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Réponses à mes annonces</p>
                  <p className="text-sm text-muted-foreground">Notification quand quelqu'un répond</p>
                </div>
                <Switch checked={announceResponses} onCheckedChange={setAnnounceResponses} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Alertes voyageurs sur mes destinations</p>
                  <p className="text-sm text-muted-foreground">Notification pour nouvelles annonces</p>
                </div>
                <Switch checked={travelerAlerts} onCheckedChange={setTravelerAlerts} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Promotions / infos</p>
                  <p className="text-sm text-muted-foreground">Offres et actualités de KiloFly</p>
                </div>
                <Switch checked={promotions} onCheckedChange={setPromotions} />
              </div>
            </CardContent>
          </Card>

          {/* Personalization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                Personnalisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Mode sombre</p>
                  <p className="text-sm text-muted-foreground">Activer le thème sombre</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Déconnexion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
