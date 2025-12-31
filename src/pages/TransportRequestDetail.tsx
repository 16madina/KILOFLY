import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  MapPin, 
  Calendar, 
  Package, 
  ArrowLeft, 
  Loader2, 
  Wallet,
  Shield,
  Star,
  Plane,
  Send,
  Edit,
  Trash2,
  MessageCircle,
  User,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrustScore } from "@/components/TrustScore";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CURRENCY_SYMBOLS, Currency } from "@/lib/currency";

interface TransportRequest {
  id: string;
  user_id: string;
  departure: string;
  arrival: string;
  departure_date_start: string;
  departure_date_end: string | null;
  requested_kg: number;
  budget_max: number | null;
  currency: string;
  description: string | null;
  created_at: string;
  status: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    id_verified: boolean;
    phone_verified: boolean;
    completed_trips: number;
    response_rate: number;
  };
}

const TransportRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  
  // Form state for offer
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('transport_requests')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            id_verified,
            phone_verified,
            completed_trips,
            response_rate
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Demande introuvable");
        navigate('/');
        return;
      }

      setRequest(data as unknown as TransportRequest);
      
      if (data.profiles) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', data.user_id);
        
        const avgRatingCalc = reviews && reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;
        
        setAvgRating(avgRatingCalc);
        setReviewCount(reviews?.length || 0);
        
        let calculatedScore = 0;
        if (data.profiles.id_verified) calculatedScore += 30;
        if (data.profiles.phone_verified) calculatedScore += 20;
        calculatedScore += (data.profiles.completed_trips || 0) * 2;
        calculatedScore += (avgRatingCalc / 5) * 30;
        calculatedScore += ((data.profiles.response_rate || 0) / 100) * 20;
        setTrustScore(Math.min(100, Math.round(calculatedScore)));
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error("Erreur lors du chargement de la demande");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour faire une proposition");
      navigate('/auth');
      return;
    }

    if (!request) return;

    if (user.id === request.user_id) {
      toast.error("Vous ne pouvez pas répondre à votre propre demande");
      return;
    }

    if (!message.trim()) {
      toast.error("Veuillez ajouter un message pour l'expéditeur");
      return;
    }

    setSubmitLoading(true);

    try {
      const { error } = await supabase
        .from("transport_offers")
        .insert({
          request_id: request.id,
          traveler_id: user.id,
          proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
          message: message.trim(),
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Proposition envoyée avec succès !");
      toast.info("L'expéditeur recevra une notification");
      
      navigate('/my-transport-requests');
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error("Erreur lors de l'envoi de la proposition");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!request || !user) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('transport_requests')
        .delete()
        .eq('id', request.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Demande supprimée avec succès");
      navigate('/my-transport-requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <Package className="h-6 w-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <p className="text-muted-foreground">Demande introuvable</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr });
  const isOwner = user?.id === request.user_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Gradient */}
      <div className="relative">
        {/* Back Button */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-50 pt-safe"
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md shadow-lg hover:bg-background border-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* Edit & Delete Buttons (only for owner) */}
        {isOwner && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-50 pt-safe flex gap-2"
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate(`/post-request?edit=${request.id}`)}
              className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md shadow-lg hover:bg-background border-0"
            >
              <Edit className="h-5 w-5" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-md shadow-lg hover:bg-destructive hover:text-destructive-foreground border-0"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La demande pour le trajet {request.departure} → {request.arrival} sera définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteRequest}
                    disabled={deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? "Suppression..." : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}

        {/* Hero Gradient */}
        <div className="relative h-56 sm:h-64 overflow-hidden bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-24 w-24 text-amber-500/30" />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Route Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-6 left-4 right-4"
          >
            <div className="inline-flex items-center gap-2 bg-background/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                <Package className="h-3 w-3 mr-1" />
                Recherche
              </Badge>
              <div className="flex items-center gap-2 ml-2">
                <span className="font-bold text-lg">{request.departure}</span>
                <Plane className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-lg">{request.arrival}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-2 bg-background rounded-t-3xl pb-32">
        <div className="container px-4 sm:px-6 max-w-2xl mx-auto">
          
          {/* Request Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="py-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Publié {timeAgo}</span>
              </div>
              {request.budget_max && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Budget max</p>
                  <span className="text-2xl font-bold text-green-600">
                    {request.budget_max} {CURRENCY_SYMBOLS[request.currency as Currency] || request.currency}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-4 py-2">
                <Package className="h-4 w-4 mr-2" />
                {request.requested_kg} kg
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(request.departure_date_start), 'dd MMM', { locale: fr })}
                {request.departure_date_end && ` - ${format(new Date(request.departure_date_end), 'dd MMM', { locale: fr })}`}
              </Badge>
            </div>
          </motion.div>

          <Separator className="mb-6" />

          {/* Requester Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to={`/user/${request.user_id}`}>
              <Card className="p-5 mb-6 bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden ring-2 ring-amber-500/20 ring-offset-2 ring-offset-background">
                      <img
                        src={request.profiles.avatar_url}
                        alt={request.profiles.full_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {request.profiles.id_verified && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                        <Shield className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{request.profiles.full_name}</h3>
                      {request.profiles.id_verified && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0 text-xs">
                          Vérifié
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
                          <span>({reviewCount})</span>
                        </div>
                      )}
                      <span className="text-muted-foreground">Expéditeur</span>
                    </div>
                  </div>
                  
                  {/* Trust Score */}
                  <TrustScore score={trustScore} />
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Description */}
          {request.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-amber-500" />
                Description du colis
              </h3>
              <Card className="p-4 bg-muted/30">
                <p className="text-foreground whitespace-pre-wrap">{request.description}</p>
              </Card>
            </motion.div>
          )}

          <Separator className="mb-6" />

          {/* Offer Form (for non-owners) */}
          {!isOwner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-amber-500" />
                Proposer votre aide
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium">
                    Votre prix proposé (optionnel)
                  </Label>
                  <div className="relative mt-1.5">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      placeholder={request.budget_max ? `Max ${request.budget_max} ${CURRENCY_SYMBOLS[request.currency as Currency] || request.currency}` : "Votre prix"}
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Laissez vide pour négocier plus tard
                  </p>
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message à l'expéditeur *
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Présentez-vous, indiquez vos dates de voyage, comment vous pouvez aider..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1.5 min-h-[120px]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Owner View */}
          {isOwner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center py-8"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                <Package className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">C'est votre demande</h3>
              <p className="text-muted-foreground mb-4">
                Vous recevrez une notification lorsqu'un voyageur proposera de transporter votre colis.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/my-transport-requests')}
              >
                Voir mes demandes
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action (for non-owners) */}
      {!isOwner && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-lg border-t shadow-2xl z-40"
        >
          <div className="container max-w-2xl mx-auto">
            <Button
              onClick={handleSubmitOffer}
              disabled={submitLoading || !message.trim()}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Plane className="h-5 w-5 mr-2" />
                  Je peux transporter ce colis
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TransportRequestDetail;