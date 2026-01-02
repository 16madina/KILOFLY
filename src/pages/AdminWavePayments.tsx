import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Phone,
  User,
  TrendingUp,
  Wallet,
  RefreshCw,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, Currency } from "@/lib/currency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WavePayment {
  id: string;
  reservation_id: string;
  amount: number;
  seller_amount: number;
  platform_commission: number;
  status: string;
  payment_status: string;
  created_at: string;
  stripe_payment_intent_id: string;
  buyer: {
    id: string;
    full_name: string;
    avatar_url: string;
    phone: string;
    email: string;
  };
  seller: {
    id: string;
    full_name: string;
    avatar_url: string;
    phone: string;
    email: string;
  };
  reservation: {
    requested_kg: number;
    listing: {
      departure: string;
      arrival: string;
      currency: string;
    };
  };
}

const AdminWavePayments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<WavePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    payment: WavePayment | null;
    action: 'confirm' | 'reject';
  }>({ open: false, payment: null, action: 'confirm' });

  useEffect(() => {
    checkAdminAndFetch();
  }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roles?.role !== 'admin') {
      navigate('/');
      toast.error("Accès non autorisé");
      return;
    }

    setIsAdmin(true);
    await fetchWavePayments();
  };

  const fetchWavePayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          reservation_id,
          amount,
          seller_amount,
          platform_commission,
          status,
          payment_status,
          created_at,
          stripe_payment_intent_id,
          buyer:profiles!buyer_id(id, full_name, avatar_url, phone, email),
          seller:profiles!seller_id(id, full_name, avatar_url, phone, email),
          reservation:reservations!reservation_id(
            requested_kg,
            listing:listings!listing_id(departure, arrival, currency)
          )
        `)
        .like('stripe_payment_intent_id', 'WAVE-%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter and type the data properly
      const typedPayments = (data || []).filter(p => p.buyer && p.seller && p.reservation) as unknown as WavePayment[];
      setPayments(typedPayments);
    } catch (error) {
      console.error('Error fetching Wave payments:', error);
      toast.error("Erreur lors du chargement des paiements");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (payment: WavePayment) => {
    setProcessingId(payment.id);
    try {
      // Update transaction status to confirmed/captured
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_status: 'captured',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (txError) throw txError;

      // Update reservation status
      const { error: resError } = await supabase
        .from('reservations')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.reservation_id);

      if (resError) throw resError;

      toast.success(`Paiement Wave confirmé ! Le vendeur ${payment.seller.full_name} recevra ${formatPrice(payment.seller_amount, payment.reservation.listing.currency as Currency)} après livraison.`);
      
      // Refresh list
      await fetchWavePayments();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast.error("Erreur lors de la confirmation du paiement");
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, payment: null, action: 'confirm' });
    }
  };

  const handleRejectPayment = async (payment: WavePayment) => {
    setProcessingId(payment.id);
    try {
      // Update transaction status to rejected
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (txError) throw txError;

      toast.success("Paiement Wave rejeté");
      
      // Refresh list
      await fetchWavePayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error("Erreur lors du rejet du paiement");
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, payment: null, action: 'reject' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">En attente</Badge>;
      case 'captured':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Confirmé</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const pendingCount = payments.filter(p => p.payment_status === 'pending_verification').length;
  const confirmedCount = payments.filter(p => p.payment_status === 'captured').length;
  const totalPending = payments
    .filter(p => p.payment_status === 'pending_verification')
    .reduce((sum, p) => sum + p.amount, 0);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Paiements Wave</h1>
            <p className="text-sm text-muted-foreground">Vérification des transferts manuels</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWavePayments}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="container px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
              <p className="text-xs text-muted-foreground">Confirmés</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-primary">{formatPrice(totalPending, 'XOF')}</p>
              <p className="text-xs text-muted-foreground">À vérifier</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucun paiement Wave à afficher</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className={payment.payment_status === 'pending_verification' ? 'border-amber-500/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {payment.stripe_payment_intent_id}
                      </span>
                      {getStatusBadge(payment.payment_status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Route */}
                  <div className="text-sm font-medium text-center py-2 bg-muted/50 rounded-lg">
                    {payment.reservation.listing.departure} → {payment.reservation.listing.arrival}
                    <span className="text-muted-foreground ml-2">
                      ({payment.reservation.requested_kg} kg)
                    </span>
                  </div>

                  {/* Buyer & Seller Info */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Buyer */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Acheteur
                      </p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={payment.buyer.avatar_url} />
                          <AvatarFallback>{payment.buyer.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{payment.buyer.full_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{payment.buyer.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seller */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Vendeur
                      </p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={payment.seller.avatar_url} />
                          <AvatarFallback>{payment.seller.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{payment.seller.full_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{payment.seller.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant reçu (Wave)</span>
                      <span className="font-semibold">
                        {formatPrice(payment.amount, payment.reservation.listing.currency as Currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission plateforme (10%)</span>
                      <span className="text-green-600 font-medium">
                        -{formatPrice(payment.platform_commission, payment.reservation.listing.currency as Currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        À verser au vendeur
                      </span>
                      <span className="font-bold text-primary">
                        {formatPrice(payment.seller_amount, payment.reservation.listing.currency as Currency)}
                      </span>
                    </div>
                  </div>

                  {/* Actions - only for pending verification */}
                  {payment.payment_status === 'pending_verification' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-600 hover:bg-red-500/10"
                        onClick={() => setConfirmDialog({ open: true, payment, action: 'reject' })}
                        disabled={processingId === payment.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeter
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setConfirmDialog({ open: true, payment, action: 'confirm' })}
                        disabled={processingId === payment.id}
                      >
                        {processingId === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Confirmer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'confirm' ? 'Confirmer le paiement Wave ?' : 'Rejeter le paiement Wave ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'confirm' ? (
                <>
                  Vous confirmez avoir reçu <strong>{confirmDialog.payment && formatPrice(confirmDialog.payment.amount, confirmDialog.payment.reservation.listing.currency as Currency)}</strong> sur le compte Wave de la plateforme.
                  <br /><br />
                  Le vendeur <strong>{confirmDialog.payment?.seller.full_name}</strong> recevra <strong>{confirmDialog.payment && formatPrice(confirmDialog.payment.seller_amount, confirmDialog.payment.reservation.listing.currency as Currency)}</strong> après livraison confirmée.
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir rejeter ce paiement ? L'acheteur sera notifié et devra effectuer un nouveau transfert.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.action === 'confirm' 
                ? handleConfirmPayment(confirmDialog.payment!) 
                : handleRejectPayment(confirmDialog.payment!)
              }
              className={confirmDialog.action === 'confirm' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmDialog.action === 'confirm' ? 'Confirmer le paiement' : 'Rejeter le paiement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminWavePayments;
