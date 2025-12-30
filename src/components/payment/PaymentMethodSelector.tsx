import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type PaymentMethod = 'card' | 'wave_visa' | 'orange_visa';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  currency?: string;
}

// Wave logo - blue wave pattern
const WaveLogo = () => (
  <svg viewBox="0 0 40 40" className="h-7 w-7">
    <circle cx="20" cy="20" r="18" fill="#1DC8F2"/>
    <path 
      d="M8 20 Q14 14, 20 20 T32 20" 
      stroke="white" 
      strokeWidth="3" 
      fill="none"
      strokeLinecap="round"
    />
    <path 
      d="M8 26 Q14 20, 20 26 T32 26" 
      stroke="white" 
      strokeWidth="2.5" 
      fill="none"
      strokeLinecap="round"
      opacity="0.7"
    />
  </svg>
);

// Orange Money logo - orange square with OM
const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 40 40" className="h-7 w-7">
    <rect x="2" y="2" width="36" height="36" rx="8" fill="#FF6600"/>
    <text 
      x="20" 
      y="26" 
      textAnchor="middle" 
      fill="white" 
      fontSize="14" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      OM
    </text>
  </svg>
);

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Carte bancaire',
    description: 'Visa, Mastercard, Amex',
    icon: <CreditCard className="h-7 w-7 text-blue-500" />,
    iconBg: 'bg-blue-500/10',
  },
  {
    id: 'wave_visa',
    name: 'Visa Wave',
    description: 'Carte prépayée Wave',
    icon: <WaveLogo />,
    iconBg: 'bg-cyan-500/5',
  },
  {
    id: 'orange_visa',
    name: 'Visa Orange',
    description: 'Carte prépayée Orange Money',
    icon: <OrangeMoneyLogo />,
    iconBg: 'bg-orange-500/5',
  },
];

const PaymentMethodSelector = ({ selectedMethod, onSelect }: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Choisissez votre méthode de paiement</h3>
      
      <div className="space-y-2">
        {paymentMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 border-2",
                selectedMethod === method.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelect(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Radio indicator */}
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedMethod === method.id
                      ? "border-primary"
                      : "border-muted-foreground/30"
                  )}>
                    {selectedMethod === method.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2.5 w-2.5 rounded-full bg-primary"
                      />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={cn("p-2 rounded-lg", method.iconBg)}>
                    {method.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <span className="font-medium">{method.name}</span>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        🔒 Paiement sécurisé par Stripe
      </p>
    </div>
  );
};

export default PaymentMethodSelector;
