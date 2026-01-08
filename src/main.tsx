import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";
import SplashScreen from "@/components/SplashScreen";

// Hide native splash IMMEDIATELY at module load (before React even mounts).
// This prevents the "automatically hidden after default timeout" warning.
if (Capacitor.isNativePlatform()) {
  import("@capacitor/splash-screen")
    .then(({ SplashScreen: NativeSplash }) => NativeSplash.hide())
    .catch(() => {
      // Ignore if plugin isn't available
    });
}

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showApp, setShowApp] = useState(false);

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
