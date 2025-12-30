import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MobileMoneyPlaceholderProps {
  provider: 'wave' | 'orange_money';
}

const providerInfo = {
  wave: {
    name: 'Wave',
    color: 'cyan',
    description: 'Le paiement Wave sera bientôt disponible pour des transactions plus simples en Afrique de l\'Ouest.',
  },
  orange_money: {
    name: 'Orange Money',
    color: 'orange',
    description: 'Le paiement Orange Money sera bientôt disponible pour des transactions rapides et sécurisées.',
  },
};

const MobileMoneyPlaceholder = ({ provider }: MobileMoneyPlaceholderProps) => {
  const [notified, setNotified] = useState(false);
  const info = providerInfo[provider];

  const handleNotify = () => {
    setNotified(true);
    toast.success(`Vous serez notifié quand ${info.name} sera disponible !`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`p-4 rounded-full bg-${info.color}-500/10`}>
              <Smartphone className={`h-8 w-8 text-${info.color}-500`} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{info.name} arrive bientôt !</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {info.description}
              </p>
            </div>

            <Button
              variant={notified ? "secondary" : "outline"}
              onClick={handleNotify}
              disabled={notified}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              {notified ? "Notification activée" : "Me notifier"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MobileMoneyPlaceholder;
