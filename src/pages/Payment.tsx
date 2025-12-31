import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentMethodSelector, { PaymentMethod } from "@/components/payment/PaymentMethodSelector";
import StripePaymentForm from "@/components/payment/StripePaymentForm";
import { formatPrice, Currency } from "@/lib/currency";

interface ReservationDetails {
  id: string;
  requested_kg: number;
  total_price: number;
  seller: {
    full_name: string;
    avatar_url: string;
  };
  listing: {
    departure: string;
    arrival: string;
    departure_date: string;
    arrival_date: string;
    currency: Currency;
  };
}

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Backward-compatible: accept both ?reservation= and legacy ?reservationId=
  const reservationId = searchParams.get('reservation') || searchParams.get('reservationId');
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [stripeKeyLoading, setStripeKeyLoading] = useState(true);

  const stripePromise = useMemo(
    () => (stripeKey ? loadStripe(stripeKey) : null),
    [stripeKey]
  );

  // Fetch Stripe key on mount
  useEffect(() => {
    const fetchStripeKey = async () => {
      // Try env variable first
      const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (envKey) {
        setStripeKey(envKey);
        setStripeKeyLoading(false);
        return;
      }

      // Fallback to edge function
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
        if (error) {
          console.error('Error fetching Stripe publishable key:', error);
        } else {
          const key = (data as any)?.publishableKey as string | undefined;
          if (key) setStripeKey(key);
        }
      } catch (err) {
        console.error('Error fetching Stripe key:', err);
      } finally {
        setStripeKeyLoading(false);
      }
    };

    fetchStripeKey();
  }, []);


  useEffect(() => {
    if (!reservationId) {
      toast.error("Réservation introuvable");
      navigate('/profile?tab=rdv');
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
          listing:listings!listing_id(departure, arrival, departure_date, arrival_date, currency)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;

      setReservationDetails(reservation as ReservationDetails);

      // Get transaction with client secret - use maybeSingle to avoid error if not found
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('stripe_payment_intent_id')
        .eq('listing_id', reservation.listing_id)
        .eq('buyer_id', reservation.buyer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (transactionError) throw transactionError;

      let paymentIntentId = transaction?.stripe_payment_intent_id;

      // If no transaction exists, create one by calling process-stripe-payment
      if (!paymentIntentId) {
        console.log('No transaction found, creating payment intent...');
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-stripe-payment', {
          body: { reservationId },
        });

        if (paymentError) {
          console.error('Error creating payment intent:', paymentError);
          toast.error("Erreur lors de la création du paiement");
          navigate('/profile?tab=rdv');
          return;
        }

        // Use the client secret directly from the response
        setClientSecret(paymentData.clientSecret);
        setLoading(false);
        return;
      }

      // Get payment intent details from edge function
      const { data, error } = await supabase.functions.invoke('get-payment-intent', {
        body: { paymentIntentId },
      });

      if (error) throw error;

      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error("Erreur lors du chargement du paiement");
      navigate('/profile?tab=rdv');
    } finally {
      setLoading(false);
    }
  };

  const getCurrency = (): Currency => {
    return (reservationDetails?.listing?.currency as Currency) || 'EUR';
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
                <span className="text-muted-foreground">Voyageur</span>
                <span className="font-medium">{reservationDetails.seller.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poids</span>
                <span className="font-medium">{reservationDetails.requested_kg} kg</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {formatPrice(reservationDetails.total_price, getCurrency())}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Selection */}
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          currency={getCurrency()}
        />

        {/* Payment Form - all methods use Stripe (Wave/Orange prepaid cards are Stripe compatible) */}
        {stripeKeyLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du formulaire de paiement...</p>
              </div>
            </CardContent>
          </Card>
        ) : !stripeKey ? (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="font-medium">Configuration Stripe manquante</p>
                <p className="text-sm text-muted-foreground">
                  La clé publique Stripe n'est pas configurée. Contactez l'administrateur.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : clientSecret && stripePromise ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMethod === 'card' && 'Informations de paiement'}
                {selectedMethod === 'wave_visa' && 'Paiement avec carte Wave'}
                {selectedMethod === 'orange_visa' && 'Paiement avec carte Orange Money'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm clientSecret={clientSecret} reservationId={reservationId!} />
              </Elements>
              {(selectedMethod === 'wave_visa' || selectedMethod === 'orange_visa') && (
                <p className="text-xs text-muted-foreground mt-3">
                  💡 Utilisez les informations de votre carte Visa prépayée {selectedMethod === 'wave_visa' ? 'Wave' : 'Orange Money'}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}


        <p className="text-xs text-center text-muted-foreground">
          Votre paiement est sécurisé. L'argent sera conservé jusqu'à la livraison confirmée, 
          puis transféré au voyageur avec une commission de 5% pour la plateforme.
        </p>
      </div>
    </div>
  );
};

export default Payment;
