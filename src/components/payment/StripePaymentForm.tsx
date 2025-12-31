import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import PaymentLoader from "./PaymentLoader";

interface StripePaymentFormProps {
  clientSecret: string;
  reservationId: string;
}

const StripePaymentForm = ({ clientSecret, reservationId }: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !paymentElementReady) {
      toast.message("Chargement du formulaire de paiement…");
      return;
    }

    setLegalDialogOpen(true);
  };

  const handlePayConfirmed = async () => {
    if (!stripe || !elements || !paymentElementReady) {
      toast.message("Chargement du formulaire de paiement…");
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
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update transaction status
        await supabase
          .from('transactions')
          .update({ payment_status: 'paid', status: 'completed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        toast.success("Paiement réussi ! 🎉");
        navigate(`/payment-success?reservation=${reservationId}`);
      } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
        // Manual capture mode - payment authorized
        toast.success("Paiement autorisé ! 🎉");
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
        <PaymentElement onReady={() => setPaymentElementReady(true)} />
        
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={!stripe || loading || !paymentElementReady}
        >
          Payer maintenant
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
