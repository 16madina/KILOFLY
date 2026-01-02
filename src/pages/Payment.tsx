import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle2, FileSignature, CreditCard, Shield, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalConfirmationDialog from "@/components/LegalConfirmationDialog";
import { formatPrice, Currency } from "@/lib/currency";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import waveLogo from "@/assets/wave-logo.jpeg";
import orangeMoneyLogo from "@/assets/orange-money-logo.png";

interface ReservationDetails {
  id: string;
  requested_kg: number;
  total_price: number;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
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

const Payment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation') || searchParams.get('reservationId');
  const canceled = searchParams.get('canceled');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  
  // Signature flow states
  const [hasSigned, setHasSigned] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [buyerFee, setBuyerFee] = useState(0);
  const [totalWithFee, setTotalWithFee] = useState(0);

  // Show canceled message
  useEffect(() => {
    if (canceled === 'true') {
      toast.error("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
    }
  }, [canceled]);

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

    fetchReservationDetails();
  }, [reservationId]);

  const fetchReservationDetails = async () => {
    try {
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

      // Calculate fees for display
      const baseFee = reservation.total_price * 0.05;
      setBuyerFee(baseFee);
      setTotalWithFee(reservation.total_price + baseFee);
    } catch (error) {
      console.error('Error fetching reservation details:', error);
      toast.error("Erreur lors du chargement de la réservation");
      navigate('/profile?tab=rdv');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!reservationId) return;
    
    setProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          reservationId,
          successUrl: `${window.location.origin}/payment-success?reservation=${reservationId}`,
          cancelUrl: `${window.location.origin}/payment?reservation=${reservationId}&canceled=true`,
        },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast.error("Erreur lors de la création du paiement");
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error("URL de paiement non disponible");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erreur lors du paiement");
    } finally {
      setProcessing(false);
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
                  {formatPrice(totalWithFee, getCurrency())}
                </span>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Signature Step - Must sign before payment */}
        {!hasSigned && (
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

        {/* Pay Now Button */}
        {hasSigned && (
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handlePayNow}
                disabled={processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payer maintenant
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Vous serez redirigé vers Stripe pour finaliser votre paiement en toute sécurité
              </p>
            </CardContent>
          </Card>
        )}

        {/* Accepted Payment Methods */}
        <Card className="border-border/50">
          <CardContent className="pt-5">
            <p className="text-xs text-center text-muted-foreground mb-4">
              Méthodes de paiement acceptées
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Carte bancaire</span>
              </div>
              <img 
                src={waveLogo} 
                alt="Wave" 
                className="h-10 w-auto object-contain rounded-md"
              />
              <img 
                src={orangeMoneyLogo} 
                alt="Orange Money" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Message */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Paiement sécurisé</p>
            <p className="text-xs text-muted-foreground">
              Le paiement sera conservé par la plateforme et ne sera envoyé au vendeur 
              <strong> qu'après réception du colis et confirmation de livraison</strong> par vos soins.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Paiement sécurisé par Stripe</span>
        </div>
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
          totalPrice: totalWithFee,
          itemDescription: `Transport de ${reservationDetails.requested_kg} kg`,
        } : undefined}
      />
    </div>
  );
};

export default Payment;
