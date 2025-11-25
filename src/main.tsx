import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import SplashScreen from "@/components/SplashScreen";
import { useState, useEffect } from "react";

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
