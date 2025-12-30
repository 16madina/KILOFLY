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

// Wave icon - stylized W
const WaveIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M3 8l3 8 3-6 3 6 3-8 3 8 3-8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Orange icon - stylized O
const OrangeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Carte bancaire',
    description: 'Visa, Mastercard, Amex',
    icon: <CreditCard className="h-6 w-6" />,
    iconBg: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'wave_visa',
    name: 'Visa Wave',
    description: 'Carte prépayée Wave',
    icon: <WaveIcon />,
    iconBg: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    id: 'orange_visa',
    name: 'Visa Orange',
    description: 'Carte prépayée Orange Money',
    icon: <OrangeIcon />,
    iconBg: 'bg-orange-500/10 text-orange-500',
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
