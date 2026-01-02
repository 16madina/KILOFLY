import { useEffect, useState } from "react";
import kiloFlySplash from "@/assets/kilofly-splash.png";

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
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#2d8cf0] transition-all duration-500 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      {/* Centered image with proper sizing */}
      <img
        src={kiloFlySplash}
        alt="KiloFly"
        className={`w-full h-auto max-h-[80vh] object-contain transition-all duration-1000 ${
          logoAnimate ? "scale-105" : "scale-100"
        }`}
      />
      
      {/* Subtle overlay for better readability */}
      <div className="absolute inset-0 bg-black/5" />
      
      {/* Animated dots at the bottom */}
      <div className="absolute bottom-20 flex gap-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:0ms]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:150ms]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:300ms]"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
