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
  Wallet,
  RefreshCw,
  ArrowUpCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";
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

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  phone_number: string;
  reference: string;
  created_at: string;
  wallet: {
    id: string;
    user_id: string;
    balance: number;
    user: {
      id: string;
      full_name: string;
      avatar_url: string;
      phone: string;
      email: string;
    };
  };
}

const WaveLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <circle cx="12" cy="12" r="12" fill="#1DC7EA"/>
    <path d="M6 12c1.5-2 3-3 4.5-1.5S13.5 14 15 12s3-3 4.5-1.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <circle cx="12" cy="12" r="12" fill="#FF6600"/>
    <circle cx="12" cy="12" r="6" fill="white"/>
    <circle cx="12" cy="12" r="3" fill="#FF6600"/>
  </svg>
);

const AdminWithdrawals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    withdrawal: WithdrawalRequest | null;
    action: 'confirm' | 'reject';
  }>({ open: false, withdrawal: null, action: 'confirm' });

  useEffect(() => {
    checkAdminAndFetch();
  }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

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
    await fetchWithdrawals();
  };

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      // Get all withdrawal requests (type = 'debit' with provider = 'manual')
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          amount,
          status,
          payout_method,
          phone_number,
          reference,
          created_at,
          wallet_id
        `)
        .eq('type', 'debit')
        .in('provider', ['manual', 'cinetpay'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get wallet and user info for each withdrawal
      const withdrawalsWithUsers: WithdrawalRequest[] = [];
      for (const tx of data || []) {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, user_id, balance')
          .eq('id', tx.wallet_id)
          .single();

        if (walletData) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, email')
            .eq('id', walletData.user_id)
            .single();

          if (userData) {
            withdrawalsWithUsers.push({
              ...tx,
              wallet: {
                ...walletData,
                user: userData
              }
            });
          }
        }
      }

      setWithdrawals(withdrawalsWithUsers);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error("Erreur lors du chargement des retraits");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmWithdrawal = async (withdrawal: WithdrawalRequest) => {
    setProcessingId(withdrawal.id);
    try {
      // Update transaction status to completed
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      if (txError) throw txError;

      // Send notification to user
      await supabase.rpc('send_notification', {
        p_user_id: withdrawal.wallet.user.id,
        p_title: '✅ Retrait effectué !',
        p_message: `Votre retrait de ${formatPrice(withdrawal.amount, 'XOF')} a été envoyé vers ${withdrawal.payout_method === 'wave' ? 'Wave' : 'Orange Money'} (${withdrawal.phone_number}).`,
        p_type: 'success'
      });

      toast.success(`Retrait confirmé pour ${withdrawal.wallet.user.full_name}`);
      await fetchWithdrawals();
    } catch (error: any) {
      console.error('Error confirming withdrawal:', error);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, withdrawal: null, action: 'confirm' });
    }
  };

  const handleRejectWithdrawal = async (withdrawal: WithdrawalRequest) => {
    setProcessingId(withdrawal.id);
    try {
      // Update transaction status to failed
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);

      if (txError) throw txError;

      // Refund the wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: withdrawal.wallet.balance + withdrawal.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.wallet.id);

      if (walletError) throw walletError;

      // Send notification to user
      await supabase.rpc('send_notification', {
        p_user_id: withdrawal.wallet.user.id,
        p_title: '❌ Retrait échoué',
        p_message: `Votre demande de retrait de ${formatPrice(withdrawal.amount, 'XOF')} n'a pas pu être traitée. Le montant a été remboursé sur votre portefeuille.`,
        p_type: 'warning'
      });

      toast.success("Retrait rejeté et remboursé");
      await fetchWithdrawals();
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, withdrawal: null, action: 'reject' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">En attente</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Effectué</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const completedCount = withdrawals.filter(w => w.status === 'completed').length;
  const totalPending = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

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
            <h1 className="text-xl font-bold">Demandes de retrait</h1>
            <p className="text-sm text-muted-foreground">Gérer les payouts vendeurs</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWithdrawals}
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
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Effectués</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-primary">{formatPrice(totalPending, 'XOF')}</p>
              <p className="text-xs text-muted-foreground">À traiter</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Instructions :</strong> Effectuez le transfert Wave/Orange Money vers le numéro indiqué, puis cliquez sur "Confirmer" une fois le paiement envoyé.
            </p>
          </CardContent>
        </Card>

        {/* Withdrawals List */}
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
        ) : withdrawals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune demande de retrait</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className={withdrawal.status === 'pending' ? 'border-amber-500/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {withdrawal.reference}
                      </span>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(withdrawal.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={withdrawal.wallet.user.avatar_url} />
                      <AvatarFallback>{withdrawal.wallet.user.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{withdrawal.wallet.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{withdrawal.wallet.user.email}</p>
                    </div>
                  </div>

                  {/* Payout Details */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {withdrawal.payout_method === 'wave' ? <WaveLogo /> : <OrangeMoneyLogo />}
                        <span className="font-medium">
                          {withdrawal.payout_method === 'wave' ? 'Wave' : 'Orange Money'}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(withdrawal.amount, 'XOF')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded-md bg-background border">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{withdrawal.phone_number}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(withdrawal.phone_number)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Actions - only for pending */}
                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-600 hover:bg-red-500/10"
                        onClick={() => setConfirmDialog({ open: true, withdrawal, action: 'reject' })}
                        disabled={processingId === withdrawal.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeter
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setConfirmDialog({ open: true, withdrawal, action: 'confirm' })}
                        disabled={processingId === withdrawal.id}
                      >
                        {processingId === withdrawal.id ? (
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
              {confirmDialog.action === 'confirm' ? 'Confirmer le retrait ?' : 'Rejeter le retrait ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'confirm' ? (
                <>
                  Vous confirmez avoir envoyé <strong>{confirmDialog.withdrawal && formatPrice(confirmDialog.withdrawal.amount, 'XOF')}</strong> vers {confirmDialog.withdrawal?.payout_method === 'wave' ? 'Wave' : 'Orange Money'} ({confirmDialog.withdrawal?.phone_number}).
                  <br /><br />
                  L'utilisateur <strong>{confirmDialog.withdrawal?.wallet.user.full_name}</strong> sera notifié.
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir rejeter ce retrait ? Le montant de <strong>{confirmDialog.withdrawal && formatPrice(confirmDialog.withdrawal.amount, 'XOF')}</strong> sera remboursé sur le portefeuille de l'utilisateur.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.withdrawal) {
                  if (confirmDialog.action === 'confirm') {
                    handleConfirmWithdrawal(confirmDialog.withdrawal);
                  } else {
                    handleRejectWithdrawal(confirmDialog.withdrawal);
                  }
                }
              }}
              className={confirmDialog.action === 'confirm' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={processingId !== null}
            >
              {processingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmDialog.action === 'confirm' ? 'Confirmer' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminWithdrawals;
