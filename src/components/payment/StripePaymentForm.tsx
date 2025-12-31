import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import PaymentLoader from "./PaymentLoader";

interface StripePaymentFormProps {
  clientSecret: string;
  reservationId: string;
  skipLegalDialog?: boolean;
}

const StripePaymentForm = ({ clientSecret, reservationId, skipLegalDialog = false }: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);

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
        // Call backend to update transaction status (bypasses RLS)
        console.log('Payment confirmed, updating transaction status...');
        const { data, error: updateError } = await supabase.functions.invoke('mark-transaction-paid', {
          body: { 
            paymentIntentId: paymentIntent.id,
            reservationId 
          },
        });

        if (updateError) {
          console.error('Error updating transaction status:', updateError);
          // Don't block navigation, payment was successful
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

  return (
    <>
      {loading && <PaymentLoader />}
      
      <form onSubmit={handlePayClick} className="space-y-6">
        <PaymentElement 
          onReady={() => setStripeReady(true)}
          onLoadError={() => toast.error("Erreur de chargement du formulaire Stripe")}
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
