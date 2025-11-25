import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import SplashScreen from "@/components/SplashScreen";
import { useState, useEffect } from "react";

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <App />
      )}
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
