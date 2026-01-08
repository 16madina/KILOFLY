import { useState, useEffect } from "react";
import { ArrowLeft, Bell, MousePointer, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type NotificationEvent = {
  type: "received" | "actionPerformed";
  timestamp: string;
  data: Record<string, unknown>;
};

// Global storage for debug events (persists across component mounts)
const STORAGE_KEY = "debug_notification_events";

const getStoredEvents = (): NotificationEvent[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeEvent = (event: NotificationEvent) => {
  const events = getStoredEvents();
  events.unshift(event); // Add to beginning
  // Keep only last 20 events
  const trimmed = events.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
};

const clearEvents = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Export for use in usePushNotifications
export const logNotificationEvent = (type: "received" | "actionPerformed", data: Record<string, unknown>) => {
  storeEvent({
    type,
    timestamp: new Date().toISOString(),
    data,
  });
};

const DebugNotifications = () => {
  const navigate = useNavigate();
  const { isSupported, permission, fcmToken, isNative } = usePushNotifications();
  const [events, setEvents] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    setEvents(getStoredEvents());
  }, []);

  const handleRefresh = () => {
    setEvents(getStoredEvents());
  };

  const handleClear = () => {
    clearEvents();
    setEvents([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Debug Notifications</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">État Push</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plateforme</span>
              <Badge variant={isNative ? "default" : "secondary"}>
                {isNative ? "Native" : "Web"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supporté</span>
              <Badge variant={isSupported ? "default" : "destructive"}>
                {isSupported ? "Oui" : "Non"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Permission</span>
              <Badge
                variant={
                  permission === "granted"
                    ? "default"
                    : permission === "denied"
                    ? "destructive"
                    : "secondary"
                }
              >
                {permission}
              </Badge>
            </div>
            {fcmToken && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">FCM Token</span>
                <code className="text-xs break-all bg-muted p-2 rounded block">
                  {fcmToken}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Événements ({events.length})
          </h2>

          {events.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun événement enregistré.
                <br />
                <span className="text-sm">
                  Les notifications reçues et les clics apparaîtront ici.
                </span>
              </CardContent>
            </Card>
          ) : (
            events.map((event, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {event.type === "received" ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <MousePointer className="h-4 w-4 text-green-500" />
                      )}
                      <CardTitle className="text-sm">
                        {event.type === "received" ? "Reçue" : "Clic"}
                      </CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default DebugNotifications;
