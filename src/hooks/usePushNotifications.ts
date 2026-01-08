import { useEffect, useCallback, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Platform = "android" | "ios" | "web";

// Debug logging for notification events
const logNotificationDebug = (type: "received" | "actionPerformed", data: Record<string, unknown>) => {
  try {
    const STORAGE_KEY = "debug_notification_events";
    const stored = localStorage.getItem(STORAGE_KEY);
    const events = stored ? JSON.parse(stored) : [];
    events.unshift({ type, timestamp: new Date().toISOString(), data });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 20)));
  } catch {
    // Ignore storage errors
  }
};
// iOS may return "prompt" before the system dialog is shown.
type Permission = "granted" | "denied" | "default" | "prompt";

type GlobalPushState = {
  isNative: boolean;
  isSupported: boolean;
  permission: Permission;
  fcmToken: string | null;
};

// Register once at module load to avoid: "already registered. Cannot register plugins twice."
const FirebaseMessaging = registerPlugin<any>("FirebaseMessaging");

const mapReceiveToPermission = (receive: unknown): Permission => {
  const val = String((receive as any) ?? "");
  if (val === "granted") return "granted";
  if (val === "denied") return "denied";
  if (val === "prompt") return "prompt";
  return "default";
};

// Handle navigation based on notification data
const handleNotificationNavigation = (data: Record<string, unknown> | undefined) => {
  if (!data) return;

  const navigateTo = (path: string) => {
    try {
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current === path) return;

      // Prefer SPA navigation (no full reload). Works even during cold-start:
      // - if Router is already mounted, it will react to popstate
      // - if Router isn't mounted yet, it will mount on the updated URL
      window.history.replaceState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      window.location.href = path;
    }
  };

  // If explicit route is provided, use it
  if (typeof data.route === "string" && data.route.length > 0) {
    navigateTo(data.route);
    return;
  }

  // If conversation_id is provided, navigate to that conversation
  if (typeof data.conversation_id === "string" && data.conversation_id.length > 0) {
    navigateTo(`/conversation/${data.conversation_id}`);
    return;
  }

  // If reservation_id is provided, navigate to the reservation chat
  if (typeof data.reservation_id === "string" && data.reservation_id.length > 0) {
    navigateTo(`/reservation-chat/${data.reservation_id}`);
    return;
  }

  // If transport_request_id is provided, navigate to transport requests
  if (typeof data.transport_request_id === "string" && data.transport_request_id.length > 0) {
    navigateTo(`/my-transport-requests`);
    return;
  }

  // Default fallback based on notification type
  const type = data.type as string | undefined;
  if (type === "message" || type === "new_message") {
    navigateTo("/messages");
  } else if (type === "reservation" || type === "reservation_status") {
    navigateTo("/profile?tab=rdv");
  } else if (type === "transport_offer" || type === "offer_accepted" || type === "offer_rejected") {
    navigateTo("/my-transport-requests");
  }
};

const isUnimplementedPluginError = (e: unknown) => {
  const anyErr = e as any;
  const code = anyErr?.code;
  const message = String(anyErr?.message ?? anyErr?.toString?.() ?? "");
  return code === "UNIMPLEMENTED" || message.includes("not implemented") || message.includes("UNIMPLEMENTED");
};

const getPlatform = (): Platform => {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";
  return "web";
};

const getCapacitorPlugin = <T = any>(name: string): T | null => {
  const anyCap = Capacitor as any;
  return (anyCap?.Plugins?.[name] as T) ?? null;
};

// --- Singleton state (shared across all hook instances) ---
let globalState: GlobalPushState = {
  isNative: Capacitor.isNativePlatform(),
  isSupported: false,
  permission: "default",
  fcmToken: null,
};

let initPromise: Promise<void> | null = null;
let lastSavedKey: string | null = null;

const subscribers = new Set<(s: GlobalPushState) => void>();

const publish = () => {
  subscribers.forEach((fn) => fn(globalState));
};

const setGlobal = (patch: Partial<GlobalPushState>) => {
  globalState = { ...globalState, ...patch };
  publish();
};

const initOnce = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Web support detection
    if (!globalState.isNative) {
      const supported = "Notification" in window;
      setGlobal({
        isSupported: supported,
        permission: supported ? (Notification.permission as Permission) : "default",
      });
      return;
    }

    // Native (iOS/Android): do NOT dynamic-import capacitor plugins here.
    // In the native WebView (capacitor://localhost), externalized module specifiers like
    // "@capacitor-firebase/messaging" won't resolve at runtime.

    try {
      if (!FirebaseMessaging?.checkPermissions) {
        throw new Error("FirebaseMessaging plugin not available");
      }

      setGlobal({ isSupported: true });

      const permStatus = await FirebaseMessaging.checkPermissions();
      setGlobal({ permission: mapReceiveToPermission(permStatus?.receive) });

      await FirebaseMessaging.removeAllListeners();

      FirebaseMessaging.addListener("tokenReceived", (event: { token: string }) => {
        console.log("FCM token received:", event.token);
        // Important: a token can exist even when iOS notification permission is still "prompt".
        // Do NOT mark permission as granted based on token presence.
        setGlobal({ fcmToken: event.token });
      });

      FirebaseMessaging.addListener("notificationReceived", (event: { notification: any }) => {
        console.log("Push notification received:", event.notification);
        logNotificationDebug("received", event.notification || {});
      });

      FirebaseMessaging.addListener(
        "notificationActionPerformed",
        (event: { notification?: { data?: Record<string, unknown> } }) => {
          console.log("Push notification action performed:", event);
          const data = event.notification?.data;
          logNotificationDebug("actionPerformed", { notification: event.notification, extractedData: data });
          handleNotificationNavigation(data);
        }
      );

      // Try to get existing token
      try {
        const tokenResult = await FirebaseMessaging.getToken();
        if (tokenResult?.token) {
          console.log("Existing FCM token:", tokenResult.token);
          setGlobal({ fcmToken: tokenResult.token });
        }
      } catch (e: unknown) {
        const tokenErr = e as any;
        if (isUnimplementedPluginError(tokenErr)) {
          throw tokenErr;
        }
        console.log(
          "No existing FCM token:",
          tokenErr?.message || tokenErr?.toString?.() || "unknown error"
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error(
        "Error initializing Firebase Messaging:",
        err?.message || err?.toString?.() || JSON.stringify(error)
      );

      // Fallback to standard Capacitor push notifications
      try {
        const PushNotifications = getCapacitorPlugin<any>("PushNotifications");
        if (!PushNotifications) {
          throw new Error("PushNotifications plugin not available");
        }

        setGlobal({ isSupported: true });

        const permStatus = await PushNotifications.checkPermissions();
        setGlobal({ permission: mapReceiveToPermission(permStatus?.receive) });

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener("registration", (token: { value: string }) => {
          console.log("Push registration success (fallback), token:", token.value);
          setGlobal({ fcmToken: token.value, permission: "granted" });
        });

        PushNotifications.addListener("registrationError", (regError: unknown) => {
          console.error("Push registration error:", regError);
          setGlobal({ permission: "denied" });
        });

        PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
          console.log("Push notification received:", notification);
          logNotificationDebug("received", notification || {});
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
          console.log("Push notification action performed:", action);
          const data = action?.notification?.data;
          logNotificationDebug("actionPerformed", { action, extractedData: data });
          handleNotificationNavigation(data);
        });

        // If the user already granted permission earlier, register now to get a token.
        if (permStatus?.receive === "granted") {
          await PushNotifications.register();
        }
      } catch (fallbackError: unknown) {
        const fbErr = fallbackError as Error;
        console.error(
          "Fallback push also failed:",
          fbErr?.message || fbErr?.toString?.() || JSON.stringify(fallbackError)
        );
        const supported = "Notification" in window;
        setGlobal({
          isSupported: supported,
          permission: supported ? (Notification.permission as Permission) : "default",
        });
      }
    }
  })();

  return initPromise;
};

// Kick initialization as early as possible (module load) so iOS cold-start taps
// are not missed before React effects run.
if (typeof window !== "undefined") {
  void initOnce();
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<GlobalPushState>(globalState);

  // Subscribe once per hook instance
  useEffect(() => {
    const handler = (s: GlobalPushState) => setState(s);
    subscribers.add(handler);

    // Kick init (idempotent)
    initOnce();

    // Sync immediately
    handler(globalState);

    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const saveTokenToDatabase = useCallback(
    async (token: string) => {
      if (!user?.id) return;

      const key = `${user.id}:${token}`;
      if (lastSavedKey === key) return;

      try {
        const platform = getPlatform();

        const { error } = await supabase.rpc("upsert_push_token" as never, {
          p_user_id: user.id,
          p_token: token,
          p_platform: platform,
        } as never);

        if (error) {
          const { error: insertError } = await supabase
            .from("push_tokens" as never)
            .upsert({ user_id: user.id, token, platform } as never, { onConflict: "user_id,token" });

          if (insertError) {
            console.error("Error saving push token:", insertError);
            return;
          }
        }

        lastSavedKey = key;
        console.log("Push token saved successfully");
      } catch (saveErr) {
        console.error("Error saving push token:", saveErr);
      }
    },
    [user?.id]
  );

  const removeTokenFromDatabase = useCallback(
    async (token: string) => {
      if (!user?.id) return;

      try {
        await supabase.from("push_tokens" as never).delete().eq("user_id", user.id).eq("token", token);
        if (lastSavedKey?.startsWith(`${user.id}:`)) {
          lastSavedKey = null;
        }
      } catch (removeErr) {
        console.error("Error removing push token:", removeErr);
      }
    },
    [user?.id]
  );

  // If user logs in after native registration already happened, persist the token once.
  useEffect(() => {
    if (!user?.id) return;
    if (!state.fcmToken) return;
    void saveTokenToDatabase(state.fcmToken);
  }, [user?.id, state.fcmToken, saveTokenToDatabase]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Ensure initialized before requesting
    await initOnce();

    if (!globalState.isSupported) {
      console.log("Push notifications not supported");
      return false;
    }

    try {
      if (globalState.isNative) {
        // Always request permission via the standard PushNotifications plugin first.
        // This is what triggers the iOS system popup.
        const PushNotifications = getCapacitorPlugin<any>("PushNotifications");

        if (PushNotifications?.requestPermissions) {
          const permResult = await PushNotifications.requestPermissions();
          const granted = permResult.receive === "granted";

          setGlobal({ permission: granted ? "granted" : "denied" });

          if (!granted) return false;

          // Register to receive a device token (APNs on iOS / FCM on Android via OS).
          if (PushNotifications?.register) {
            await PushNotifications.register();
          }

          // Then try to fetch an FCM token via FirebaseMessaging (needed for FCM HTTP v1).
          // If the native plugin isn't installed, we silently ignore and keep the fallback token.
          try {
            if (FirebaseMessaging?.requestPermissions) {
              await FirebaseMessaging.requestPermissions();
            }
            if (FirebaseMessaging?.getToken) {
              const tokenResult = await FirebaseMessaging.getToken();
              if (tokenResult?.token) {
                setGlobal({ fcmToken: tokenResult.token });
              }
            }
          } catch (e: unknown) {
            if (!isUnimplementedPluginError(e)) {
              console.warn("FirebaseMessaging token fetch failed:", e);
            }
          }

          return true;
        }

        // Last resort: try FirebaseMessaging permissions (may be unimplemented on iOS if not installed)
        if (FirebaseMessaging?.requestPermissions) {
          const permResult = await FirebaseMessaging.requestPermissions();
          const granted = permResult.receive === "granted";

          if (!granted) {
            setGlobal({ permission: "denied" });
            return false;
          }

          try {
            const tokenResult = await FirebaseMessaging.getToken();
            if (tokenResult?.token) {
              setGlobal({ fcmToken: tokenResult.token, permission: "granted" });
            } else {
              setGlobal({ permission: "granted" });
            }
          } catch (e: unknown) {
            if (isUnimplementedPluginError(e)) {
              setGlobal({ permission: "granted" });
              return true;
            }
            throw e;
          }

          return true;
        }

        console.error("No native push plugin available");
        return false;
      }

      // Web fallback
      const result = await Notification.requestPermission();
      setGlobal({ permission: result as Permission });
      return result === "granted";
    } catch (reqErr) {
      console.error("Error requesting notification permission:", reqErr);
      return false;
    }
  }, []);

  const showNotificationInternal = useCallback(
    (title: string, options?: NotificationOptions & { data?: Record<string, unknown> }) => {
      if (!state.isSupported || state.permission !== "granted") return;

      // Don't show if the page is visible and focused
      if (document.visibilityState === "visible" && document.hasFocus()) return;

      try {
        if (!state.isNative && "Notification" in window) {
          const notification = new Notification(title, {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: options?.tag || "kilofly-notification",
            ...options,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
            if (options?.data?.route) {
              window.location.href = options.data.route as string;
            }
          };

          setTimeout(() => notification.close(), 5000);
        }
      } catch (notifErr) {
        console.error("Error showing notification:", notifErr);
      }
    },
    [state.isSupported, state.permission, state.isNative]
  );

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions & { data?: Record<string, unknown> }) => {
      showNotificationInternal(title, options);
    },
    [showNotificationInternal]
  );

  const showLocalNotification = showNotification;

  const unregister = useCallback(async () => {
    if (state.fcmToken) {
      await removeTokenFromDatabase(state.fcmToken);
    }

    if (state.isNative) {
      try {
        if (FirebaseMessaging?.deleteToken) {
          try {
            await FirebaseMessaging.deleteToken();
            setGlobal({ fcmToken: null });
            return;
          } catch (e: unknown) {
            if (!isUnimplementedPluginError(e)) {
              console.warn("FirebaseMessaging deleteToken failed:", e);
            }
            // fall through to PushNotifications.unregister
          }
        }

        const PushNotifications = getCapacitorPlugin<any>("PushNotifications");
        if (PushNotifications) {
          await PushNotifications.unregister();
          setGlobal({ fcmToken: null });
          return;
        }

        console.warn("No native push plugin available to unregister");
      } catch (unregErr) {
        console.error("Error unregistering push notifications:", unregErr);
      }
    }
  }, [state.fcmToken, state.isNative, removeTokenFromDatabase]);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    fcmToken: state.fcmToken,
    isNative: state.isNative,
    requestPermission,
    showNotification,
    showLocalNotification,
    unregister,
  };
};

