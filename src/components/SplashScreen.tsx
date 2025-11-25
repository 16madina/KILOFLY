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
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1e5aa8] via-[#2c7cd1] to-[#7ec8ff] transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="animate-scale-in">
          <img
            src={kiloFlyLogo}
            alt="KiloFly"
            className="h-32 w-auto object-contain animate-pulse"
          />
        </div>
        <div className="flex gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-white animate-bounce [animation-delay:0ms]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-white animate-bounce [animation-delay:150ms]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-white animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
