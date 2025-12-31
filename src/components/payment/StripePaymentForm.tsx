import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, RefreshCw } from "lucide-react";
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
  const [paymentElementOverlayVisible, setPaymentElementOverlayVisible] = useState(true);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null);
  const [stripeInitTimedOut, setStripeInitTimedOut] = useState(false);

  // Fallback: in some environments PaymentElement's onReady may not fire reliably.
  // We poll until the Payment Element exists in Elements.
  useEffect(() => {
    if (!elements || paymentElementReady) return;

    setPaymentElementOverlayVisible(true);

    const interval = window.setInterval(() => {
      // react-stripe-js expects the Element *type* here (not a string)
      const paymentEl = elements.getElement(PaymentElement);
      if (paymentEl) {
        setPaymentElementReady(true);
        setPaymentElementOverlayVisible(false);
        setPaymentElementError(null);
        window.clearInterval(interval);
      }
    }, 250);

    // Avoid blocking the UI forever: remove the overlay after a short time.
    const hideOverlayTimeout = window.setTimeout(() => {
      setPaymentElementOverlayVisible(false);
    }, 2500);

    // If Stripe Element still isn't mounted after a while, show a clear retry UI.
    const failTimeout = window.setTimeout(() => {
      const paymentEl = elements.getElement(PaymentElement);
      if (!paymentEl) {
        setPaymentElementError("Le chargement prend trop de temps. Cliquez sur Recharger.");
      }
      setPaymentElementOverlayVisible(false);
      window.clearInterval(interval);
    }, 12000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideOverlayTimeout);
      window.clearTimeout(failTimeout);
    };
  }, [elements, paymentElementReady]);

  // UX: if Stripe never initializes, show a clear message + reload.
  useEffect(() => {
    if (stripe) return;

    const t = window.setTimeout(() => {
      setStripeInitTimedOut(true);
    }, 7000);

    return () => window.clearTimeout(t);
  }, [stripe]);

  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe n'a pas fini de se charger. Réessayez dans quelques secondes.");
      return;
    }

    if (paymentElementError) {
      toast.error("Le formulaire de paiement ne se charge pas. Recharger la page puis réessayer.");
      return;
    }

    setLegalDialogOpen(true);
  };

  const handlePayConfirmed = async () => {
    if (!stripe || !elements) {
      toast.error("Stripe n'a pas fini de se charger.");
      return;
    }

    if (paymentElementError) {
      toast.error("Le formulaire de paiement ne se charge pas. Recharger la page puis réessayer.");
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
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Erreur lors du paiement");
        setLoading(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        await supabase
          .from("transactions")
          .update({ payment_status: "paid", status: "completed" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        toast.success("Paiement réussi !");
        navigate(`/payment-success?reservation=${reservationId}`);
      } else if (paymentIntent && paymentIntent.status === "requires_capture") {
        toast.success("Paiement autorisé !");
        navigate(`/payment-success?reservation=${reservationId}`);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors du traitement du paiement");
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <PaymentLoader />}

      <form onSubmit={handlePayClick} className="space-y-6">
        <div className="relative min-h-[120px]">
          {paymentElementOverlayVisible && !paymentElementError && (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement du formulaire Stripe…
              </div>
            </div>
          )}

          {paymentElementError && (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <div className="w-full text-center">
                <p className="font-medium">Le formulaire Stripe ne se charge pas</p>
                <p className="mt-1 text-muted-foreground">{paymentElementError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recharger
                </Button>
              </div>
            </div>
          )}

          <PaymentElement
            onReady={() => {
              setPaymentElementReady(true);
              setPaymentElementOverlayVisible(false);
              setPaymentElementError(null);
            }}
            onLoadError={(e) => {
              console.error("Stripe PaymentElement load error:", e);
              setPaymentElementError("Impossible de charger le formulaire. Vérifiez votre connexion.");
              setPaymentElementOverlayVisible(false);
              toast.error("Impossible de charger le formulaire Stripe");
            }}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={!stripe || loading || !!paymentElementError}>
          Payer maintenant
        </Button>

        {stripeInitTimedOut && !stripe && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">Stripe ne se charge pas</p>
            <p className="text-muted-foreground mt-1">Vérifiez votre connexion puis réessayez.</p>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-3"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger
            </Button>
          </div>
        )}

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
