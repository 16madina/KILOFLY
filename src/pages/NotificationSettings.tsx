import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Bell } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { permission, requestPermission, isSupported: pushSupported } = usePushNotifications();
  const { preferences, updatePreference, loading: prefsLoading } = useNotificationPreferences();
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted');

  useEffect(() => {
    setPushEnabled(permission === 'granted');
  }, [permission]);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      if (granted) {
        setPushEnabled(true);
        await updatePreference('push_enabled', true);
        toast.success("Notifications push activées");
      } else {
        setPushEnabled(false);
        toast.error("Permission refusée. Activez les notifications dans les paramètres de votre navigateur.");
      }
    } else {
      setPushEnabled(false);
      await updatePreference('push_enabled', false);
      toast.info("Pour désactiver complètement, allez dans les paramètres de votre appareil");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-9 w-9 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </header>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-4">
        {pushSupported && (
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-medium">Notifications push</span>
                <p className="text-sm text-muted-foreground">Alertes en temps réel</p>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
          </div>
        )}

        <div className="border rounded-xl bg-card/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <h3 className="font-medium">Types de notifications</h3>
          </div>
          
          <div className="divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-4">
              <span>Nouveaux messages</span>
              <Switch 
                checked={preferences.messages_enabled}
                onCheckedChange={(checked) => updatePreference('messages_enabled', checked)}
                disabled={prefsLoading}
              />
            </div>
            
            <div className="flex items-center justify-between px-4 py-4">
              <span>Réponses à mes annonces</span>
              <Switch 
                checked={preferences.responses_enabled}
                onCheckedChange={(checked) => updatePreference('responses_enabled', checked)}
                disabled={prefsLoading}
              />
            </div>
            
            <div className="flex items-center justify-between px-4 py-4">
              <span>Alertes voyageurs</span>
              <Switch 
                checked={preferences.alerts_enabled}
                onCheckedChange={(checked) => updatePreference('alerts_enabled', checked)}
                disabled={prefsLoading}
              />
            </div>
            
            <div className="flex items-center justify-between px-4 py-4">
              <span>Promotions / infos</span>
              <Switch 
                checked={preferences.promotions_enabled}
                onCheckedChange={(checked) => updatePreference('promotions_enabled', checked)}
                disabled={prefsLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
