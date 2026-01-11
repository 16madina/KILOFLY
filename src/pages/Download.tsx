import { useEffect, useState } from "react";
import { Apple, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import kiloFlyLogo from "@/assets/kilofly-logo-v2.png";

type Platform = "ios" | "android" | "desktop";

const Download = () => {
  const [platform, setPlatform] = useState<Platform>("desktop");

  // Liens des stores (à remplacer par les vrais liens)
  const APP_STORE_URL = "https://apps.apple.com/us/app/kilofly-app/id6757349482";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.lovable.2b7a5f775ecc4622bc5b450979c265cc";

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
        {/* iOS : uniquement App Store */}
        {platform === "ios" && (
          <Button
            asChild
            size="lg"
            className="w-full h-14 text-base font-semibold bg-black hover:bg-black/90 text-white"
          >
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Apple className="mr-2 h-5 w-5" />
              Télécharger sur l'App Store
            </a>
          </Button>
        )}

        {/* Android : uniquement Google Play */}
        {platform === "android" && (
          <Button
            asChild
            size="lg"
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
          >
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Smartphone className="mr-2 h-5 w-5" />
              Disponible sur Google Play
            </a>
          </Button>
        )}

        {/* Desktop : les deux boutons */}
        {platform === "desktop" && (
          <>
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base font-semibold bg-black hover:bg-black/90 text-white"
            >
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Apple className="mr-2 h-5 w-5" />
                Télécharger sur l'App Store
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
            >
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Smartphone className="mr-2 h-5 w-5" />
                Disponible sur Google Play
              </a>
            </Button>
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
