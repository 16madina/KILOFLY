import { useEffect, useState } from "react";
import kiloFlyLogo from "@/assets/kilofly-logo.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [logoAnimate, setLogoAnimate] = useState(false);

  useEffect(() => {
    // Start logo animation after a short delay
    const logoTimer = setTimeout(() => {
      setLogoAnimate(true);
    }, 100);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 2500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1e5aa8] via-[#2c7cd1] to-[#7ec8ff] transition-all duration-500 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className={`transition-all duration-1000 ${
          logoAnimate ? "scale-110 rotate-[360deg]" : "scale-100 rotate-0"
        }`}>
          <img
            src={kiloFlyLogo}
            alt="KiloFly"
            className="h-32 w-auto object-contain drop-shadow-2xl"
          />
        </div>
        <div className="flex gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:0ms]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:150ms]"></div>
          <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
