import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import PaymentLoader from "./PaymentLoader";

interface StripePaymentFormProps {
  clientSecret: string;
  reservationId: string;
  skipLegalDialog?: boolean;
  onRegeneratePayment?: () => void;
}

const STRIPE_LOAD_TIMEOUT = 15000; // 15 seconds

const StripePaymentForm = ({ 
  clientSecret, 
  reservationId, 
  skipLegalDialog = false,
  onRegeneratePayment 
}: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Timeout for Stripe loading
  useEffect(() => {
    if (stripeReady || stripeError) return;

    const timer = setTimeout(() => {
      if (!stripeReady && !stripeError) {
        setLoadTimeout(true);
        setStripeError("Le formulaire de paiement ne répond pas. Veuillez réessayer.");
      }
    }, STRIPE_LOAD_TIMEOUT);

    return () => clearTimeout(timer);
  }, [stripeReady, stripeError]);

  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !stripeReady) {
      toast.error("Le formulaire de paiement n'est pas encore prêt. Veuillez patienter.");
      return;
    }
    
    if (skipLegalDialog) {
      handlePayConfirmed();
    } else {
      setLegalDialogOpen(true);
    }
  };

  const handlePayConfirmed = async () => {
    if (!stripe || !elements || !stripeReady) {
      toast.error("Le formulaire de paiement n'est pas prêt");
      return;
    }

    setLoading(true);
    setLegalDialogOpen(false);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?reservation=${reservationId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || "Erreur lors du paiement");
        setLoading(false);
        return;
      }
      
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        console.log('Payment confirmed, updating transaction status...');
        const { data, error: updateError } = await supabase.functions.invoke('mark-transaction-paid', {
          body: { 
            paymentIntentId: paymentIntent.id,
            reservationId 
          },
        });

        if (updateError) {
          console.error('Error updating transaction status:', updateError);
        } else {
          console.log('Transaction status updated:', data);
        }

        const statusMessage = paymentIntent.status === 'succeeded' 
          ? "Paiement réussi ! 🎉" 
          : "Paiement autorisé ! 🎉";
        toast.success(statusMessage);
        navigate(`/payment-success?reservation=${reservationId}`);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Erreur lors du traitement du paiement");
      setLoading(false);
    }
  };

  const handleStripeReady = () => {
    setStripeReady(true);
    setStripeError(null);
    setLoadTimeout(false);
  };

  const handleStripeError = (event: { elementType: string; error: { message?: string } }) => {
    const errorMsg = event.error?.message || "Erreur de chargement du formulaire Stripe";
    setStripeError(errorMsg);
    toast.error(errorMsg);
  };

  const handleRetry = () => {
    setStripeError(null);
    setLoadTimeout(false);
    setStripeReady(false);
    window.location.reload();
  };

  // Show error state
  if (stripeError || loadTimeout) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Erreur Stripe</p>
              <p className="text-sm text-muted-foreground mt-1">{stripeError}</p>
            </div>
            <div className="flex gap-2 w-full flex-col sm:flex-row">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recharger
              </Button>
              {onRegeneratePayment && (
                <Button 
                  onClick={onRegeneratePayment}
                  className="flex-1"
                >
                  Régénérer le paiement
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {loading && <PaymentLoader />}
      
      <form onSubmit={handlePayClick} className="space-y-6">
        <PaymentElement 
          onReady={handleStripeReady}
          onLoadError={handleStripeError}
        />
        
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={!stripe || !stripeReady || loading}
        >
          {!stripeReady ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement...
            </>
          ) : (
            "Payer maintenant"
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Paiement sécurisé par Stripe
        </div>
      </form>

      <LegalConfirmationDialog
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
        onConfirm={handlePayConfirmed}
        type="sender"
        loading={loading}
      />
    </>
  );
};

export default StripePaymentForm;
