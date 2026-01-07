import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { usePushNotifications } from "./usePushNotifications";

/**
 * Immediately prompts the user for push notification permission on native platforms (iOS/Android).
 * On iOS, Apple guidelines recommend asking early in the user journey.
 * This hook should be called once at the app root level.
 */
export const useNativePushPrompt = () => {
  const { isSupported, permission, requestPermission, isNative } = usePushNotifications();
  const promptedRef = useRef(false);

  useEffect(() => {
    // Only prompt on native platforms
    if (!Capacitor.isNativePlatform()) return;
    
    // Only prompt once per app session
    if (promptedRef.current) return;
    
    // Only prompt if we haven't asked yet
    if (permission !== "default") return;
    
    // Wait for support detection
    if (!isSupported) return;

    promptedRef.current = true;

    // Small delay to ensure app is fully loaded and visible
    const timer = setTimeout(() => {
      console.log("Requesting push notification permission (native prompt)...");
      requestPermission();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSupported, permission, requestPermission, isNative]);
};
