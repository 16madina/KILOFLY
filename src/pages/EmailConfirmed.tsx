import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles, ArrowRight, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import kiloFlyLogo from "@/assets/kilofly-logo.png";

const EmailConfirmed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  // Check for error in URL params (Supabase redirects with error if something went wrong)
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error('Email confirmation error:', error, errorDescription);
      setStatus('error');
    } else {
      // Short delay to show animation
      const timer = setTimeout(() => {
        setStatus('success');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleOpenApp = () => {
    // Try Universal Link first (https), then custom scheme, then fallback
    const universalLink = "https://kiloflyapp.com/onboarding";
    const customScheme = "kilofly://onboarding";
    
    // First try Universal Link (works if app is installed with proper entitlements)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = customScheme;
    document.body.appendChild(iframe);
    
    // After a short delay, try the universal link as backup
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.location.href = universalLink;
    }, 500);
    
    // Final fallback to web onboarding
    setTimeout(() => {
      navigate('/onboarding');
    }, 2000);
  };

  const handleContinue = () => {
    navigate('/onboarding');
  };

  const handleRetry = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center space-y-6 border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          {/* Logo */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <img src={kiloFlyLogo} alt="KiloFly" className="h-16 w-auto" />
          </motion.div>

          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8"
            >
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4">Vérification en cours...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <>
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                {/* Sparkles */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="h-8 w-8 text-yellow-500" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute -bottom-1 -left-3"
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h1 className="text-2xl font-bold text-foreground">
                  Email confirmé ! 🎉
                </h1>
                <p className="text-muted-foreground">
                  Votre adresse email a été vérifiée avec succès.
                </p>
              </motion.div>

              {/* Welcome Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20"
              >
                <h2 className="font-semibold text-lg mb-2">Bienvenue sur KiloFly</h2>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez maintenant explorer les annonces de voyageurs et les demandes de transport. 
                  Pour poster des annonces ou faire des réservations, complétez la vérification de votre identité.
                </p>
              </motion.div>

              {/* Next Steps */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3 text-left"
              >
                <p className="text-sm font-medium text-foreground">Prochaines étapes :</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-xs font-bold">✓</div>
                    <span className="text-muted-foreground line-through">Vérifier votre email</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</div>
                    <span>Vérifier votre identité</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                    <span className="text-muted-foreground">Publier ou réserver</span>
                  </div>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Button 
                  onClick={handleOpenApp}
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                >
                  📱 Ouvrir l'application
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleContinue}
                  className="w-full gap-2"
                >
                  Continuer sur le web
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs text-muted-foreground"
              >
                Chaque Kilo compte ✈️
              </motion.p>
            </>
          )}

          {status === 'error' && (
            <>
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <XCircle className="h-12 w-12 text-white" />
                </div>
              </motion.div>

              {/* Error Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <h1 className="text-2xl font-bold text-foreground">
                  Lien expiré ou invalide
                </h1>
                <p className="text-muted-foreground">
                  Le lien de confirmation a expiré ou a déjà été utilisé.
                </p>
              </motion.div>

              {/* Help Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
              >
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Vous pouvez demander un nouveau lien de vérification depuis votre profil.
                </p>
              </motion.div>

              {/* Retry Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  onClick={handleRetry}
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                >
                  Retourner au profil
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default EmailConfirmed;
