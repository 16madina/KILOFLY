import { useEffect, useState } from "react";
import kiloFlyLogo from "@/assets/kilofly-logo-v2.png";

type Platform = "ios" | "android" | "desktop";

// Composant icône App Store
const AppStoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// Composant icône Google Play
const GooglePlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z"/>
  </svg>
);

const Download = () => {
  const [platform, setPlatform] = useState<Platform>("desktop");

  const APP_STORE_URL = "https://apps.apple.com/us/app/kilofly-app/id6757349482";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kilofly.app";

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/i.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

  const AppStoreButton = () => (
    <a 
      href={APP_STORE_URL} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 w-full h-14 px-6 bg-black hover:bg-black/90 text-white rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
    >
      <AppStoreIcon className="h-6 w-6" />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal opacity-80">Télécharger sur</span>
        <span className="text-sm font-semibold">App Store</span>
      </div>
    </a>
  );

  const PlayStoreButton = () => (
    <a 
      href={PLAY_STORE_URL} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 w-full h-14 px-6 bg-black hover:bg-black/90 text-white rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
    >
      <GooglePlayIcon className="h-6 w-6" />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-normal opacity-80">Disponible sur</span>
        <span className="text-sm font-semibold">Google Play</span>
      </div>
    </a>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src={kiloFlyLogo} 
          alt="KiloFly" 
          className="h-20 w-auto object-contain"
        />
      </div>

      {/* Titre */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
        Télécharger l'application KiloFly
      </h1>

      {/* Sous-titre */}
      <p className="text-muted-foreground text-center mb-10 max-w-sm">
        Voyagez léger, transportez malin.
      </p>

      {/* Boutons selon la plateforme */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {platform === "ios" && <AppStoreButton />}
        {platform === "android" && <PlayStoreButton />}
        {platform === "desktop" && (
          <>
            <AppStoreButton />
            <PlayStoreButton />
          </>
        )}
      </div>

      {/* Footer discret */}
      <p className="mt-12 text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} KiloFly
      </p>
    </div>
  );
};

export default Download;
