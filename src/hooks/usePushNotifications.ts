import { useEffect, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Platform = "android" | "ios" | "web";
type Permission = "granted" | "denied" | "default";

type GlobalPushState = {
  isNative: boolean;
  isSupported: boolean;
  permission: Permission;
  fcmToken: string | null;
};

const getPlatform = (): Platform => {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";
  return "web";
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

    try {
      // Use Firebase Messaging plugin for native - it returns FCM tokens on both iOS and Android
      console.log("Attempting to import @capacitor-firebase/messaging...");
      const FirebaseModule = await import("@capacitor-firebase/messaging");
      console.log("FirebaseModule imported:", Object.keys(FirebaseModule));
      const { FirebaseMessaging } = FirebaseModule;
      console.log("FirebaseMessaging available:", !!FirebaseMessaging);

      if (!FirebaseMessaging) {
        throw new Error("FirebaseMessaging is undefined after import");
      }

      setGlobal({ isSupported: true });

      console.log("Checking permissions...");
      const permStatus = await FirebaseMessaging.checkPermissions();
      console.log("Permission status:", permStatus);
      setGlobal({ permission: permStatus.receive === "granted" ? "granted" : "default" });

      // Remove existing listeners to prevent duplicates
      await FirebaseMessaging.removeAllListeners();

      // Listen for token updates
      FirebaseMessaging.addListener("tokenReceived", (event) => {
        console.log("FCM token received:", event.token);
        setGlobal({ fcmToken: event.token, permission: "granted" });
      });

      // Listen for foreground notifications
      FirebaseMessaging.addListener("notificationReceived", (event) => {
        console.log("Push notification received:", event.notification);
      });

      // Listen for notification tap actions
      FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
        console.log("Push notification action performed:", event);
        const data = event.notification?.data as Record<string, unknown> | undefined;
        if (data?.route && typeof data.route === "string") {
          window.location.href = data.route;
        }
      });

      // Try to get existing token
      try {
        console.log("Attempting to get existing token...");
        const tokenResult = await FirebaseMessaging.getToken();
        console.log("Token result:", tokenResult);
        if (tokenResult?.token) {
          console.log("Existing FCM token:", tokenResult.token);
          setGlobal({ fcmToken: tokenResult.token });
        }
      } catch (e: unknown) {
        const tokenErr = e as Error;
        console.log("No existing FCM token:", tokenErr?.message || tokenErr?.toString?.() || "unknown error");
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error initializing Firebase Messaging:", err?.message || err?.toString?.() || JSON.stringify(error));
      
      // Fallback to standard Capacitor push notifications
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        
        setGlobal({ isSupported: true });

        const permStatus = await PushNotifications.checkPermissions();
        setGlobal({ permission: permStatus.receive === "granted" ? "granted" : "default" });

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener("registration", (token) => {
          console.log("Push registration success (fallback), token:", token.value);
          setGlobal({ fcmToken: token.value, permission: "granted" });
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration error:", error);
          setGlobal({ permission: "denied" });
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received:", notification);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("Push notification action performed:", action);
          const data = action.notification.data;
          if (data?.route) {
            window.location.href = data.route as string;
          }
        });
      } catch (fallbackError: unknown) {
        const fbErr = fallbackError as Error;
        console.error("Fallback push also failed:", fbErr?.message || fbErr?.toString?.() || JSON.stringify(fallbackError));
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

  const saveTokenToDatabase = useCallback(async (token: string) => {
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
    } catch (error) {
      console.error("Error saving push token:", error);
    }
  }, [user?.id]);

  const removeTokenFromDatabase = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      await supabase.from("push_tokens" as never).delete().eq("user_id", user.id).eq("token", token);
      if (lastSavedKey?.startsWith(`${user.id}:`)) {
        lastSavedKey = null;
      }
    } catch (error) {
      console.error("Error removing push token:", error);
    }
  }, [user?.id]);

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
        // Try Firebase Messaging first
        try {
          const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
          
          const permResult = await FirebaseMessaging.requestPermissions();

          if (permResult.receive === "granted") {
            const tokenResult = await FirebaseMessaging.getToken();
            if (tokenResult?.token) {
              setGlobal({ fcmToken: tokenResult.token, permission: "granted" });
            }
            return true;
          }

          setGlobal({ permission: "denied" });
          return false;
        } catch (e) {
          // Fallback to standard push notifications
          const { PushNotifications } = await import("@capacitor/push-notifications");
          
          const permResult = await PushNotifications.requestPermissions();

          if (permResult.receive === "granted") {
            await PushNotifications.register();
            setGlobal({ permission: "granted" });
            return true;
          }

          setGlobal({ permission: "denied" });
          return false;
        }
      }

      // Web fallback
      const result = await Notification.requestPermission();
      setGlobal({ permission: result as Permission });
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
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
      } catch (error) {
        console.error("Error showing notification:", error);
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
        // Try Firebase first
        try {
          const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
          await FirebaseMessaging.deleteToken();
        } catch (e) {
          // Fallback
          const { PushNotifications } = await import("@capacitor/push-notifications");
          await PushNotifications.unregister();
        }
        setGlobal({ fcmToken: null });
      } catch (error) {
        console.error("Error unregistering push notifications:", error);
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
