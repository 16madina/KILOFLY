import { motion } from "framer-motion";
import { Plane, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptics } from "@/hooks/useHaptics";

const PostChoice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { impact, ImpactStyle } = useHaptics();

  const handleChoice = (type: "travel" | "request") => {
    impact(ImpactStyle.Light);
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (type === "travel") {
      navigate("/post-listing");
    } else {
      navigate("/post-request");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-nav">
        <div className="flex items-center justify-center p-4">
          <h1 className="text-lg font-semibold">Publier</h1>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Que souhaitez-vous faire ?
          </h2>
          <p className="text-muted-foreground text-sm">
            Choisissez votre rôle
          </p>
        </motion.div>

        {/* Two Cards Side by Side */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {/* Je voyage - Traveler option */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleChoice("travel")}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-left shadow-lg active:shadow-md transition-all duration-200 aspect-[3/4]"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full blur-xl transform -translate-x-6 translate-y-6" />
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <Plane className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">
                Je voyage
              </h3>
              <p className="text-white/70 text-xs leading-relaxed flex-1">
                J'ai de la place dans mes bagages
              </p>
              
              <div className="flex items-center gap-1.5 text-white text-sm font-medium mt-3">
                <span>Publier</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>

          {/* Je recherche - Sender option */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleChoice("request")}
            className="group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-5 text-left shadow-lg active:shadow-md transition-all duration-200 aspect-[3/4]"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/10 rounded-full blur-xl transform -translate-x-6 translate-y-6" />
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2">
                Je recherche
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed flex-1">
                J'ai un colis à envoyer
              </p>
              
              <div className="flex items-center gap-1.5 text-primary text-sm font-medium mt-3">
                <span>Demander</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Info section */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-8 text-xs text-muted-foreground text-center max-w-xs px-4"
        >
          Vos publications apparaîtront dans l'onglet correspondant sur la page d'accueil
        </motion.p>
      </div>
    </div>
  );
};

export default PostChoice;
