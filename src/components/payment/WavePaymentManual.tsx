import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Phone, QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, Currency } from "@/lib/currency";
import { motion } from "framer-motion";

interface WavePaymentManualProps {
  reservationId: string;
  amount: number;
  currency: Currency;
  buyerName: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  onPaymentDeclared: () => void;
}

// Numéro Wave de la plateforme KiloFly
const WAVE_DEPOSIT_NUMBER = "+221 77 000 00 00"; // À remplacer par votre vrai numéro
const WAVE_QR_CODE_URL = ""; // URL de l'image QR code Wave à ajouter

const WavePaymentManual = ({
  reservationId,
  amount,
  currency,
  buyerName,
  buyerId,
  sellerId,
  listingId,
  onPaymentDeclared,
}: WavePaymentManualProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [declared, setDeclared] = useState(false);

  // Calculate amounts with commission
  const buyerFee = Math.round(amount * 0.05);
  const totalAmount = amount + buyerFee;
  const sellerAmount = amount - Math.round(amount * 0.05); // 5% commission from seller too
  const platformCommission = buyerFee + Math.round(amount * 0.05); // Total 10%

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(WAVE_DEPOSIT_NUMBER.replace(/\s/g, ''));
      setCopied(true);
      toast.success("Numéro copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleDeclarePayment = async () => {
    setIsSubmitting(true);
    
    try {
      // Create a pending Wave transaction
      const transactionId = `WAVE-${reservationId.slice(0, 8)}-${Date.now()}`;
      
      const { error } = await supabase.from('transactions').insert({
        reservation_id: reservationId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: totalAmount,
        platform_commission: platformCommission,
        seller_amount: sellerAmount,
        status: 'pending',
        payment_status: 'pending_verification', // New status for manual Wave payments
        stripe_payment_intent_id: transactionId, // Reusing this field for Wave transaction ID
      });

      if (error) throw error;

      setDeclared(true);
      toast.success("Paiement déclaré ! L'administrateur va vérifier votre transfert.");
      onPaymentDeclared();
    } catch (error: any) {
      console.error('Error declaring payment:', error);
      toast.error("Erreur lors de la déclaration du paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (declared) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                  Paiement déclaré !
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  L'administrateur vérifiera votre transfert Wave sous peu. 
                  Vous recevrez une notification une fois le paiement confirmé.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-cyan-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#1DC8F2] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white">
                <path 
                  d="M4 12 Q9 6, 12 12 T20 12" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            Paiement Wave
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Montant à payer */}
          <div className="p-4 rounded-lg bg-cyan-500/10 text-center">
            <p className="text-sm text-muted-foreground mb-1">Montant à envoyer</p>
            <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatPrice(totalAmount, currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ({formatPrice(amount, currency)} + {formatPrice(buyerFee, currency)} frais de service)
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Comment payer :</h4>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm">Ouvrez votre application Wave</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm">Envoyez exactement <strong>{formatPrice(totalAmount, currency)}</strong> au numéro :</p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border">
                  <Phone className="h-4 w-4 text-cyan-500" />
                  <span className="font-mono font-medium flex-1">{WAVE_DEPOSIT_NUMBER}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyNumber}
                    className="h-8 px-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* QR Code section (optionnel) */}
            {WAVE_QR_CODE_URL && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  <QrCode className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2">Ou scannez ce QR code :</p>
                  <div className="w-32 h-32 bg-white rounded-lg p-2 mx-auto">
                    <img src={WAVE_QR_CODE_URL} alt="QR Code Wave" className="w-full h-full" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm">Une fois le transfert effectué, cliquez sur le bouton ci-dessous</p>
              </div>
            </div>
          </div>

          {/* Alerte importante */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Important :</strong> Envoyez exactement le montant indiqué. 
              Utilisez comme référence : <span className="font-mono">{buyerName} - {reservationId.slice(0, 8)}</span>
            </p>
          </div>

          {/* Bouton de déclaration */}
          <Button
            onClick={handleDeclarePayment}
            disabled={isSubmitting}
            className="w-full gap-2 bg-[#1DC8F2] hover:bg-[#1DC8F2]/90"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Déclaration en cours...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                J'ai effectué le transfert Wave
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 L'argent sera conservé en sécurité jusqu'à la livraison confirmée
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WavePaymentManual;
