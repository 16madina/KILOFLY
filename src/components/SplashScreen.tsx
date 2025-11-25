import { useEffect, useState } from "react";
import kiloFlyLogo from "@/assets/kilofly-logo.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="animate-scale-in">
          <img
            src={kiloFlyLogo}
            alt="KiloFly"
            className="h-24 w-auto object-contain animate-pulse"
          />
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></div>
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
