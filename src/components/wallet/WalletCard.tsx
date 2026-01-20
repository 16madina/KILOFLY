import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, CheckCircle, XCircle, Clock, Smartphone, ChevronRight } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/currency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const WaveLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <circle cx="12" cy="12" r="12" fill="#1DC7EA"/>
    <path d="M6 12c1.5-2 3-3 4.5-1.5S13.5 14 15 12s3-3 4.5-1.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <circle cx="12" cy="12" r="12" fill="#FF6600"/>
    <circle cx="12" cy="12" r="6" fill="white"/>
    <circle cx="12" cy="12" r="3" fill="#FF6600"/>
  </svg>
);

export default function WalletCard() {
  const { wallet, transactions, isLoading, requestWithdrawal, refetch } = useWallet();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'wave' | 'orange_money'>('wave');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error('Numéro de téléphone invalide');
      return;
    }

    setIsProcessing(true);
    try {
      await requestWithdrawal(amount, phoneNumber, payoutMethod);
      toast.success('Demande de retrait envoyée ! Délai de traitement : 1 à 3 heures.');
      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setPhoneNumber('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'failed': return 'Échoué';
      case 'pending': return 'En cours';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Mon Portefeuille
            </CardTitle>
            <Link to="/wallet" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Voir tout <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        
        <CardContent className="relative">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
            <p className="text-4xl font-bold text-foreground">
              {formatPrice(wallet?.balance || 0, 'XOF')}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowWithdrawForm(!showWithdrawForm)}
              className="flex-1 gap-2"
              disabled={!wallet || wallet.balance < 500}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Retirer
            </Button>
            <Link to="/wallet" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Wallet className="h-4 w-4" />
                Détails
              </Button>
            </Link>
          </div>

          {wallet && wallet.balance < 500 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Minimum 500 XOF pour retirer
            </p>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Form */}
      <AnimatePresence>
        {showWithdrawForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retirer vers Mobile Money</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payout Method Selection */}
                <div className="space-y-2">
                  <Label>Méthode de retrait</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('wave')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        payoutMethod === 'wave'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-border hover:border-cyan-500/50'
                      }`}
                    >
                      <WaveLogo />
                      <span className="font-medium">Wave</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('orange_money')}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        payoutMethod === 'orange_money'
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-border hover:border-orange-500/50'
                      }`}
                    >
                      <OrangeMoneyLogo />
                      <span className="font-medium">Orange Money</span>
                    </button>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Numéro associé à votre compte {payoutMethod === 'wave' ? 'Wave' : 'Orange Money'}
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (XOF)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="500"
                    max={wallet?.balance || 0}
                    placeholder="5000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: 500 XOF</span>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(wallet?.balance || 0))}
                      className="text-primary hover:underline"
                    >
                      Tout retirer
                    </button>
                  </div>
                </div>

                {/* Info about processing time */}
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary">
                    ⏱️ Délai de traitement : <strong>1 à 3 heures</strong>. Vous recevrez une notification une fois le transfert effectué.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowWithdrawForm(false)}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    className="flex-1 gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4" />
                    )}
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.type === 'credit' ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {tx.description || (tx.type === 'credit' ? 'Crédit' : 'Retrait')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'credit' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount, 'XOF')}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {getStatusIcon(tx.status)}
                      <span className="text-xs text-muted-foreground">
                        {getStatusLabel(tx.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
