import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type PaymentMethod = 'card' | 'wave_visa' | 'orange_visa' | 'wave_manual';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  selectedBg: string;
  provider: 'stripe' | 'wave';
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  currency?: string;
}

// Wave logo - official blue wave pattern
const WaveLogo = ({ size = 10 }: { size?: number }) => (
  <svg viewBox="0 0 48 48" className={`h-${size} w-${size}`} style={{ height: size * 4, width: size * 4 }}>
    <circle cx="24" cy="24" r="22" fill="#1DC8F2"/>
    <path 
      d="M10 22 Q17 14, 24 22 T38 22" 
      stroke="white" 
      strokeWidth="4" 
      fill="none"
      strokeLinecap="round"
    />
    <path 
      d="M10 30 Q17 22, 24 30 T38 30" 
      stroke="white" 
      strokeWidth="3" 
      fill="none"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

// Orange Money logo - official orange design
const OrangeMoneyLogo = ({ size = 10 }: { size?: number }) => (
  <svg viewBox="0 0 48 48" className={`h-${size} w-${size}`} style={{ height: size * 4, width: size * 4 }}>
    <rect x="2" y="2" width="44" height="44" rx="10" fill="#FF6600"/>
    <text 
      x="24" 
      y="30" 
      textAnchor="middle" 
      fill="white" 
      fontSize="16" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      OM
    </text>
  </svg>
);

// Visa/Card icon
const CardLogo = () => (
  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
    <CreditCard className="h-6 w-6 text-white" />
  </div>
);

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Carte bancaire',
    description: 'Visa, Mastercard, Amex',
    icon: <CardLogo />,
    accentColor: 'border-blue-500',
    selectedBg: 'bg-blue-500/10',
    provider: 'stripe',
  },
  {
    id: 'wave_visa',
    name: 'Wave',
    description: 'Carte Visa Wave',
    icon: <WaveLogo size={10} />,
    accentColor: 'border-cyan-500',
    selectedBg: 'bg-cyan-500/10',
    provider: 'stripe',
  },
  {
    id: 'orange_visa',
    name: 'Orange Money',
    description: 'Carte Visa OM',
    icon: <OrangeMoneyLogo size={10} />,
    accentColor: 'border-orange-500',
    selectedBg: 'bg-orange-500/10',
    provider: 'stripe',
  },
  {
    id: 'wave_manual',
    name: 'Wave Direct',
    description: 'Transfert Wave',
    icon: <WaveLogo size={10} />,
    accentColor: 'border-cyan-600',
    selectedBg: 'bg-cyan-600/10',
    provider: 'wave',
  },
];

export const getPaymentProvider = (method: PaymentMethod): 'stripe' | 'wave' => {
  const found = paymentMethods.find(m => m.id === method);
  return found?.provider || 'stripe';
};

const PaymentMethodSelector = ({ selectedMethod, onSelect, currency }: PaymentMethodSelectorProps) => {
  const stripeMethods = paymentMethods.filter(m => m.provider === 'stripe');
  const waveMethods = paymentMethods.filter(m => m.provider === 'wave');

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Méthode de paiement</h3>
      
      {/* Stripe methods (Card payments) */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Carte bancaire (Stripe)</p>
        <div className="grid grid-cols-3 gap-3">
          {stripeMethods.map((method, index) => {
            const isSelected = selectedMethod === method.id;
            
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-2 relative overflow-hidden",
                    isSelected
                      ? cn("border-primary shadow-lg", method.selectedBg)
                      : "border-border/50 hover:border-primary/40 bg-card"
                  )}
                  onClick={() => onSelect(method.id)}
                >
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </motion.div>
                    )}
                    <div className="relative">
                      {method.icon}
                    </div>
                    <div>
                      <span className={cn(
                        "text-sm font-medium block",
                        isSelected && "text-primary"
                      )}>
                        {method.name}
                      </span>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {method.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Wave Manual (Mobile Money) */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Mobile Money</p>
        <div className="grid grid-cols-1 gap-3">
          {waveMethods.map((method, index) => {
            const isSelected = selectedMethod === method.id;
            
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (index + 3) * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-2 relative overflow-hidden",
                    isSelected
                      ? cn("border-primary shadow-lg", method.selectedBg)
                      : "border-border/50 hover:border-primary/40 bg-card"
                  )}
                  onClick={() => onSelect(method.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </motion.div>
                    )}
                    <div className="relative">
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <span className={cn(
                        "text-sm font-medium block",
                        isSelected && "text-primary"
                      )}>
                        {method.name}
                      </span>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {method.description} - Envoyez directement sur notre compte Wave
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Paiement sécurisé
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
