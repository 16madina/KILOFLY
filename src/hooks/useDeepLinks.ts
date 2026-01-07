import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up deep link handling on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      const anyCap = Capacitor as any;
      const App = anyCap?.Plugins?.App;

      if (!App) {
        console.warn("Capacitor App plugin not available; deep links disabled");
        return;
      }

      // Handle deep links when app is opened via URL
      listenerHandle = await App.addListener("appUrlOpen", (event: { url: string }) => {
        console.log("Deep link received:", event.url);

        try {
          const url = new URL(event.url);
          const path = url.pathname + url.search;

          // Navigate to the appropriate route
          if (path) {
            console.log("Navigating to:", path);
            navigate(path);
          }
        } catch (error) {
          // Handle custom scheme URLs (kilofly://path)
          const customSchemeMatch = event.url.match(/kilofly:\/\/(.+)/);
          if (customSchemeMatch) {
            const path = "/" + customSchemeMatch[1];
            console.log("Navigating to (custom scheme):", path);
            navigate(path);
          }
        }
      });

      // Check if app was opened with a URL (cold start)
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        console.log("App launched with URL:", launchUrl.url);

        try {
          const url = new URL(launchUrl.url);
          const path = url.pathname + url.search;

          if (path && path !== "/") {
            navigate(path);
          }
        } catch (error) {
          const customSchemeMatch = launchUrl.url.match(/kilofly:\/\/(.+)/);
          if (customSchemeMatch) {
            navigate("/" + customSchemeMatch[1]);
          }
        }
      }
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);
};
