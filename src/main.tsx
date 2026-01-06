import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import SplashScreen from "@/components/SplashScreen";

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showApp, setShowApp] = useState(false);

  // Hide the native splash as soon as JS is running (our React SplashScreen covers the UI).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capacitor/splash-screen")
      .then(({ SplashScreen: NativeSplash }) => NativeSplash.hide())
      .catch(() => {
        // Ignore if plugin isn't available in this environment
      });
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    // Small delay before showing app for smooth transition
    setTimeout(() => setShowApp(true), 100);
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <div className={`transition-opacity duration-500 ${showApp ? "opacity-100" : "opacity-0"}`}>
        <App />
      </div>
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
