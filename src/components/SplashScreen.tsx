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
      className={`fixed inset-0 z-[9999] transition-all duration-500 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      {/* Full screen background image */}
      <img
        src={kiloFlySplash}
        alt="KiloFly"
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
          logoAnimate ? "scale-[1.02]" : "scale-100"
        }`}
      />
      
      {/* Animated dots at the bottom */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:0ms]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:150ms]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-lg animate-bounce [animation-delay:300ms]"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
