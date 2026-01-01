import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, FileSignature, RefreshCw, ChevronDown, ChevronUp, Smartphone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentMethodSelector, { PaymentMethod, getPaymentProvider } from "@/components/payment/PaymentMethodSelector";
import StripePaymentForm from "@/components/payment/StripePaymentForm";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import { formatPrice, Currency } from "@/lib/currency";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface ReservationDetails {
  id: string;
  requested_kg: number;
  total_price: number;
  seller: {
    full_name: string;
    avatar_url: string;
  };
  listing: {
    id: string;
    departure: string;
    arrival: string;
    departure_date: string;
    arrival_date: string;
    currency: Currency;
  };
}

// Diagnostic section component
const DiagnosticSection = ({ stripeKey, stripeKeySource }: { stripeKey: string; stripeKeySource: 'env' | 'backend' | null }) => {
  const [open, setOpen] = useState(false);
  const keyPrefix = stripeKey.substring(0, 7);
  const keyLast4 = stripeKey.slice(-4);
  const mode = stripeKey.startsWith('pk_live') ? 'LIVE' : stripeKey.startsWith('pk_test') ? 'TEST' : 'INCONNU';
  
  return (
    <div className="text-xs border border-border rounded-lg overflow-hidden">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">Diagnostic Stripe</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1 bg-background">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mode</span>
            <span className={mode === 'LIVE' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clé</span>
            <span className="font-mono">{keyPrefix}...{keyLast4}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className={stripeKeySource === 'backend' ? 'text-green-600' : 'text-amber-600'}>{stripeKeySource || 'inconnue'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Payment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation') || searchParams.get('reservationId');
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [stripeKeySource, setStripeKeySource] = useState<'env' | 'backend' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Signature flow states
  const [hasSigned, setHasSigned] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [buyerFee, setBuyerFee] = useState(0);
  const [totalWithFee, setTotalWithFee] = useState(0);
  
  // CinetPay states
  const [cinetpayLoading, setCinetpayLoading] = useState(false);
  const [cinetpayPhone, setCinetpayPhone] = useState('');

  const stripePromise: Promise<Stripe | null> = useMemo(
    () => (stripeKey ? loadStripe(stripeKey) : Promise.resolve(null)),
    [stripeKey]
  );

  // Always try to fetch key from backend first, fallback to env
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-publishable-key');
        if (!error && data?.publishableKey) {
          console.log('[Stripe] Key from backend:', data.publishableKey.substring(0, 12) + '...' + data.publishableKey.slice(-4));
          setStripeKey(data.publishableKey);
          setStripeKeySource('backend');
          return;
        }
        console.warn('[Stripe] Backend key fetch failed, falling back to env:', error?.message);
      } catch (e) {
        console.warn('[Stripe] Backend fetch error:', e);
      }

      // Fallback to env variable
      const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (envKey) {
        console.log('[Stripe] Key from env:', envKey.substring(0, 12) + '...' + envKey.slice(-4));
        setStripeKey(envKey);
        setStripeKeySource('env');
      }
    })();
  }, []);

  // Check if user already signed for this reservation
  useEffect(() => {
    const checkExistingSignature = async () => {
      if (!reservationId) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSignature } = await supabase
        .from('legal_signatures')
        .select('id, signed_at')
        .eq('reservation_id', reservationId)
        .eq('user_id', user.id)
        .eq('signature_type', 'sender')
        .maybeSingle();

      if (existingSignature) {
        console.log('Existing signature found:', existingSignature.id);
        setHasSigned(true);
      }
    };

    checkExistingSignature();
  }, [reservationId]);

  useEffect(() => {
    if (!reservationId) {
      toast.error("Réservation introuvable");
      navigate('/profile?tab=rdv');
      return;
    }

    fetchPaymentDetails();
  }, [reservationId]);

  const fetchPaymentDetails = async () => {
    setErrorMessage(null);
    try {
      // Get reservation details
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          seller:profiles!seller_id(full_name, avatar_url),
          listing:listings!listing_id(id, departure, arrival, departure_date, arrival_date, currency)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;

      setReservationDetails(reservation as ReservationDetails);

      // First try to find transaction by reservation_id (new method)
      let transaction = null;
      const { data: txByReservation, error: txError1 } = await supabase
        .from('transactions')
        .select('stripe_payment_intent_id')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!txError1 && txByReservation) {
        transaction = txByReservation;
      } else {
        // Fallback: find by listing_id + buyer_id (legacy method)
        const { data: txByLegacy, error: txError2 } = await supabase
          .from('transactions')
          .select('stripe_payment_intent_id')
          .eq('listing_id', reservation.listing_id)
          .eq('buyer_id', reservation.buyer_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!txError2 && txByLegacy) {
          transaction = txByLegacy;
        }
      }

      let paymentIntentId = transaction?.stripe_payment_intent_id;

      // If no transaction exists, create one
      if (!paymentIntentId) {
        console.log('No transaction found, creating payment intent...');
        await createNewPaymentIntent();
        return;
      }

      // Get payment intent details from edge function
      console.log('Fetching existing payment intent:', paymentIntentId);
      const { data, error } = await supabase.functions.invoke('get-payment-intent', {
        body: { paymentIntentId },
      });

      if (error) {
        console.error('Error fetching payment intent:', error);
        setErrorMessage(`Erreur lors de la récupération du paiement: ${error.message || 'Erreur inconnue'}`);
        // Calculate fees for display
        const baseFee = reservation.total_price * 0.05;
        setBuyerFee(baseFee);
        setTotalWithFee(reservation.total_price + baseFee);
        setLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      // Calculate fees for display
      const baseFee = reservation.total_price * 0.05;
      setBuyerFee(baseFee);
      setTotalWithFee(reservation.total_price + baseFee);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error("Erreur lors du chargement du paiement");
      navigate('/profile?tab=rdv');
    } finally {
      setLoading(false);
    }
  };

  const createNewPaymentIntent = async () => {
    setRegenerating(true);
    setErrorMessage(null);
    
    try {
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-stripe-payment', {
        body: { reservationId },
      });

      if (paymentError) {
        console.error('Error creating payment intent:', paymentError);
        setErrorMessage(`Erreur lors de la création du paiement: ${paymentError.message || 'Erreur inconnue'}`);
        toast.error("Erreur lors de la création du paiement");
        return;
      }

      setClientSecret(paymentData.clientSecret);
      setBuyerFee(paymentData.buyerFee || 0);
      setTotalWithFee(paymentData.totalAmount || 0);
      setErrorMessage(null);
      toast.success("Nouveau paiement créé avec succès");
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setErrorMessage(`Erreur: ${error.message || 'Erreur inconnue'}`);
      toast.error("Erreur lors de la création du paiement");
    } finally {
      setRegenerating(false);
      setLoading(false);
    }
  };

  const getCurrency = (): Currency => {
    return (reservationDetails?.listing?.currency as Currency) || 'EUR';
  };

  const handleSignatureConfirmed = () => {
    setHasSigned(true);
    setLegalDialogOpen(false);
    toast.success("Signature enregistrée ! Vous pouvez maintenant procéder au paiement.");
  };

  // Check if CinetPay method is selected
  const isCinetpayMethod = selectedMethod === 'cinetpay_wave' || selectedMethod === 'cinetpay_orange';

  // Handle CinetPay payment
  const handleCinetpayPayment = async () => {
    if (!reservationDetails || !user) return;
    
    if (!cinetpayPhone || cinetpayPhone.length < 8) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setCinetpayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cinetpay-payment', {
        body: {
          reservationId,
          amount: reservationDetails.total_price,
          buyerEmail: user.email || '',
          buyerPhone: cinetpayPhone,
          buyerName: user.user_metadata?.full_name || 'Client',
          sellerName: reservationDetails.seller.full_name,
          route: `${reservationDetails.listing.departure} → ${reservationDetails.listing.arrival}`,
          currency: getCurrency(),
          returnUrl: `${window.location.origin}/payment-success?reservation=${reservationId}`,
          cancelUrl: `${window.location.origin}/payment?reservation=${reservationId}&cancelled=true`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Redirect to CinetPay payment page
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      console.error('CinetPay payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setCinetpayLoading(false);
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
        {/* Reservation Summary with fees */}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium">
                  {formatPrice(reservationDetails.total_price, getCurrency())}
                </span>
              </div>
              {buyerFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frais de service (5%)</span>
                  <span className="font-medium text-muted-foreground">
                    +{formatPrice(buyerFee, getCurrency())}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total à payer</span>
                <span className="text-primary">
                  {formatPrice(totalWithFee > 0 ? totalWithFee : reservationDetails.total_price * 1.05, getCurrency())}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error message with retry option */}
        {errorMessage && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Erreur de paiement</p>
                  <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                </div>
                <Button 
                  onClick={createNewPaymentIntent}
                  disabled={regenerating}
                  className="w-full"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Régénérer le paiement
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Selection */}
        {!errorMessage && (
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
            currency={getCurrency()}
          />
        )}

        {/* Signature Step - Must sign before payment */}
        {!hasSigned && clientSecret && !errorMessage && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSignature className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Signature requise</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Veuillez signer les conditions générales avant de procéder au paiement
                  </p>
                </div>
                <Button 
                  onClick={() => setLegalDialogOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  <FileSignature className="mr-2 h-5 w-5" />
                  Signer le formulaire
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature confirmed indicator */}
        {hasSigned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Signature enregistrée</p>
              <p className="text-sm text-muted-foreground">Vous pouvez maintenant procéder au paiement</p>
            </div>
          </motion.div>
        )}

        {/* CinetPay Payment Form */}
        {isCinetpayMethod && hasSigned && !errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  {selectedMethod === 'cinetpay_wave' ? 'Paiement Wave' : 'Paiement Orange Money'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Vous serez redirigé vers la page de paiement sécurisée
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(totalWithFee > 0 ? totalWithFee : (reservationDetails?.total_price || 0) * 1.05, getCurrency())}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cinetpay-phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cinetpay-phone"
                      type="tel"
                      placeholder={selectedMethod === 'cinetpay_wave' ? '+221 77 123 45 67' : '+225 07 12 34 56 78'}
                      value={cinetpayPhone}
                      onChange={(e) => setCinetpayPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Numéro associé à votre compte {selectedMethod === 'cinetpay_wave' ? 'Wave' : 'Orange Money'}
                  </p>
                </div>

                <Button
                  onClick={handleCinetpayPayment}
                  disabled={cinetpayLoading || !cinetpayPhone}
                  className="w-full gap-2"
                  size="lg"
                >
                  {cinetpayLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-5 w-5" />
                  )}
                  {cinetpayLoading ? 'Redirection...' : 'Payer maintenant'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  🔒 Paiement sécurisé par CinetPay
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stripe Payment Form - only show for card methods after signature */}
        {!isCinetpayMethod && !stripeKey ? (
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
        ) : !isCinetpayMethod && clientSecret && hasSigned && !errorMessage ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMethod === 'card' && 'Informations de paiement'}
                {selectedMethod === 'wave_visa' && 'Paiement avec carte Wave'}
                {selectedMethod === 'orange_visa' && 'Paiement avec carte Orange Money'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm 
                  clientSecret={clientSecret} 
                  reservationId={reservationId!}
                  skipLegalDialog={true}
                  onRegeneratePayment={createNewPaymentIntent}
                />
              </Elements>
              {(selectedMethod === 'wave_visa' || selectedMethod === 'orange_visa') && (
                <p className="text-xs text-muted-foreground mt-3">
                  💡 Utilisez les informations de votre carte Visa prépayée {selectedMethod === 'wave_visa' ? 'Wave' : 'Orange Money'}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Stripe Diagnostic (collapsible) - only for stripe methods */}
        {!isCinetpayMethod && stripeKey && (
          <DiagnosticSection stripeKey={stripeKey} stripeKeySource={stripeKeySource} />
        )}

        <p className="text-xs text-center text-muted-foreground">
          Votre paiement est sécurisé. Une commission de 5% est prélevée sur l'acheteur et 5% sur le vendeur. 
          L'argent sera conservé jusqu'à la livraison confirmée.
        </p>
      </div>

      {/* Legal Signature Dialog */}
      <LegalConfirmationDialog
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
        onConfirm={handleSignatureConfirmed}
        type="sender"
        loading={false}
        reservationId={reservationId || undefined}
        reservationDetails={reservationDetails ? {
          id: reservationDetails.id,
          departure: reservationDetails.listing.departure,
          arrival: reservationDetails.listing.arrival,
          requestedKg: reservationDetails.requested_kg,
          totalPrice: totalWithFee > 0 ? totalWithFee : reservationDetails.total_price * 1.05,
          itemDescription: `Transport de ${reservationDetails.requested_kg} kg`,
        } : undefined}
      />
    </div>
  );
};

export default Payment;
