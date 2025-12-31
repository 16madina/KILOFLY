import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, MessageCircle, MapPin, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Currency } from "@/lib/currency";

interface ReservationDetails {
  id: string;
  requested_kg: number;
  total_price: number;
  item_description: string;
  listing: {
    departure: string;
    arrival: string;
    departure_date: string;
    arrival_date: string;
    currency: string;
  };
  seller: {
    full_name: string;
    avatar_url: string;
  };
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reservationId = searchParams.get("reservation");
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId) return;

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id,
          requested_kg,
          total_price,
          item_description,
          listing:listings (
            departure,
            arrival,
            departure_date,
            arrival_date,
            currency
          ),
          seller:profiles!reservations_seller_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq("id", reservationId)
        .single();

      if (!error && data) {
        setReservation(data as unknown as ReservationDetails);
      }
      setLoading(false);
    };

    fetchReservation();
  }, [reservationId]);

  const nextSteps = [
    {
      icon: MessageCircle,
      title: "Contactez le voyageur",
      description: "Coordonnez la remise de votre colis avec le voyageur",
      action: () => navigate("/messages"),
      actionLabel: "Ouvrir les messages",
    },
    {
      icon: Package,
      title: "Préparez votre colis",
      description: "Emballez soigneusement vos articles avant la remise",
      action: null,
      actionLabel: null,
    },
    {
      icon: MapPin,
      title: "Suivez votre colis",
      description: "Suivez l'avancement de votre envoi en temps réel",
      action: () => navigate(`/tracking?reservation=${reservationId}`),
      actionLabel: "Voir le suivi",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 pt-12 pb-8 px-4"
      >
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="h-12 w-12 text-green-500" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Paiement réussi !
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Votre réservation est confirmée
          </motion.p>
        </div>
      </motion.div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Reservation Summary */}
        {reservation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Récapitulatif</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    #{reservation.id.slice(0, 8)}
                  </span>
                </div>

                <Separator />

                {/* Route */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{reservation.listing.departure}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{reservation.listing.arrival}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(reservation.listing.departure_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Poids réservé</span>
                    <span className="font-medium">{reservation.requested_kg} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Voyageur</span>
                    <span className="font-medium">{reservation.seller.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Articles</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {reservation.item_description}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total payé</span>
                  <PriceDisplay
                    amount={reservation.total_price}
                    currency={reservation.listing.currency as Currency}
                    className="text-xl font-bold text-primary"
                  />
                </div>

                {/* Security Note */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Paiement sécurisé</p>
                    <p>
                      Votre paiement est conservé en sécurité. Le voyageur sera payé uniquement
                      après confirmation de la livraison.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-lg font-semibold mb-3">Prochaines étapes</h2>
          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                        {step.action && (
                          <Button
                            variant="link"
                            className="p-0 h-auto mt-2 text-primary"
                            onClick={step.action}
                          >
                            {step.actionLabel}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-3 pt-4"
        >
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate("/profile?tab=rdv")}
          >
            Voir mes réservations
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate("/")}
          >
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
