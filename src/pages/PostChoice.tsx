import { motion } from "framer-motion";
import { Plane, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const PostChoice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleChoice = (type: "travel" | "request") => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Que souhaitez-vous faire ?
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Choisissez votre rôle pour commencer
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Je voyage - Traveler option */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChoice("travel")}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-8 text-left shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Plane className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">
                Je voyage
              </h2>
              <p className="text-white/80 mb-6 leading-relaxed">
                J'ai de la place dans mes bagages et je souhaite proposer mes kilos disponibles aux expéditeurs.
              </p>
              
              <div className="flex items-center gap-2 text-white font-medium">
                <span>Publier une annonce</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </motion.button>

          {/* Je recherche - Sender option */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChoice("request")}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary/90 to-secondary border border-border/50 p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Package className="w-8 h-8 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Je recherche
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                J'ai un colis à envoyer et je cherche un voyageur pour le transporter vers ma destination.
              </p>
              
              <div className="flex items-center gap-2 text-primary font-medium">
                <span>Poster une demande</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Vos annonces seront visibles sur la page d'accueil dans l'onglet correspondant.
            Les voyageurs peuvent répondre aux demandes et vice-versa.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PostChoice;
