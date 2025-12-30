import { motion } from "framer-motion";
import { Lock, CreditCard } from "lucide-react";

interface PaymentLoaderProps {
  message?: string;
}

const PaymentLoader = ({ message = "Traitement du paiement..." }: PaymentLoaderProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border rounded-2xl p-8 shadow-xl max-w-sm mx-4 text-center"
      >
        {/* Animated Card Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Outer spinning ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary"
          />
          
          {/* Inner pulsing circle */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <CreditCard className="h-8 w-8 text-primary" />
          </motion.div>
        </div>

        {/* Message */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold mb-2"
        >
          {message}
        </motion.h3>

        {/* Security indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Lock className="h-4 w-4" />
          <span>Connexion sécurisée</span>
        </motion.div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -8, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.15 
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Ne fermez pas cette page
        </p>
      </motion.div>
    </div>
  );
};

export default PaymentLoader;
