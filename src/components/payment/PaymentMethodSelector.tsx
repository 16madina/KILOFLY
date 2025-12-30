import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Smartphone, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type PaymentMethod = 'card' | 'wave' | 'orange_money';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  comingSoon?: boolean;
  iconBg: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  currency?: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Carte bancaire',
    description: 'Visa, Mastercard, Amex',
    icon: <CreditCard className="h-6 w-6" />,
    available: true,
    iconBg: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Paiement mobile Wave',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
      </svg>
    ),
    available: false,
    comingSoon: true,
    iconBg: 'bg-cyan-500/10 text-cyan-500',
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    description: 'Paiement mobile Orange',
    icon: <Smartphone className="h-6 w-6" />,
    available: false,
    comingSoon: true,
    iconBg: 'bg-orange-500/10 text-orange-500',
  },
];

const PaymentMethodSelector = ({ selectedMethod, onSelect, currency }: PaymentMethodSelectorProps) => {
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
                method.available 
                  ? selectedMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  : "border-border/50 opacity-60 cursor-not-allowed"
              )}
              onClick={() => method.available && onSelect(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Radio indicator */}
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    method.available && selectedMethod === method.id
                      ? "border-primary"
                      : "border-muted-foreground/30"
                  )}>
                    {method.available && selectedMethod === method.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2.5 w-2.5 rounded-full bg-primary"
                      />
                    )}
                    {!method.available && (
                      <Lock className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={cn("p-2 rounded-lg", method.iconBg)}>
                    {method.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{method.name}</span>
                      {method.comingSoon && (
                        <Badge variant="secondary" className="text-xs">
                          Bientôt
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Currency hint for mobile money */}
      {currency === 'XOF' && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Wave et Orange Money seront bientôt disponibles pour les paiements en XOF
        </p>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
