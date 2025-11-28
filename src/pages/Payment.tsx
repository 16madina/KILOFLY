import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const PaymentForm = ({ clientSecret, reservationId }: { clientSecret: string; reservationId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

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
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update transaction status
        await supabase
          .from('transactions')
          .update({ payment_status: 'paid', status: 'completed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        toast.success("Paiement réussi ! 🎉");
        navigate('/my-reservations');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Erreur lors du traitement du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Traitement...
          </>
        ) : (
          'Payer maintenant'
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Paiement sécurisé par Stripe
      </div>
    </form>
  );
};

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation');
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservationDetails, setReservationDetails] = useState<any>(null);

  useEffect(() => {
    if (!reservationId) {
      toast.error("Réservation introuvable");
      navigate('/my-reservations');
      return;
    }

    fetchPaymentDetails();
  }, [reservationId]);

  const fetchPaymentDetails = async () => {
    try {
      // Get reservation details
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          seller:profiles!seller_id(full_name, avatar_url),
          listing:listings!listing_id(departure, arrival, departure_date, arrival_date)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;

      setReservationDetails(reservation);

      // Get transaction with client secret
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('stripe_payment_intent_id')
        .eq('listing_id', reservation.listing_id)
        .eq('buyer_id', reservation.buyer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transactionError) throw transactionError;

      if (!transaction?.stripe_payment_intent_id) {
        toast.error("Paiement introuvable");
        navigate('/my-reservations');
        return;
      }

      // Get payment intent details from edge function
      const { data, error } = await supabase.functions.invoke('get-payment-intent', {
        body: { paymentIntentId: transaction.stripe_payment_intent_id },
      });

      if (error) throw error;

      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error("Erreur lors du chargement du paiement");
      navigate('/my-reservations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Paiement sécurisé</h1>
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6 max-w-md mx-auto space-y-6">
        {/* Reservation Summary */}
        {reservationDetails && (
          <Card>
            <CardHeader>
              <CardTitle>Détails de la réservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trajet</span>
                <span className="font-medium">
                  {reservationDetails.listing.departure} → {reservationDetails.listing.arrival}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendeur</span>
                <span className="font-medium">{reservationDetails.seller.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poids</span>
                <span className="font-medium">{reservationDetails.requested_kg} kg</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{reservationDetails.total_price.toFixed(2)}€</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        {clientSecret && (
          <Card>
            <CardHeader>
              <CardTitle>Informations de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm clientSecret={clientSecret} reservationId={reservationId!} />
              </Elements>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Votre paiement est sécurisé. L'argent sera conservé jusqu'à la livraison confirmée, 
          puis transféré au vendeur avec une commission de 5% pour la plateforme.
        </p>
      </div>
    </div>
  );
};

export default Payment;