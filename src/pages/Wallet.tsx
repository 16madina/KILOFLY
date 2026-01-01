import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet as WalletIcon, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Smartphone,
  ArrowLeft,
  RefreshCw,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/currency';
import { format, subDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import PullToRefresh from '@/components/mobile/PullToRefresh';

const WaveLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <circle cx="12" cy="12" r="12" fill="#1DC7EA"/>
    <path d="M6 12c1.5-2 3-3 4.5-1.5S13.5 14 15 12s3-3 4.5-1.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const OrangeMoneyLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <circle cx="12" cy="12" r="12" fill="#FF6600"/>
    <circle cx="12" cy="12" r="6" fill="white"/>
    <circle cx="12" cy="12" r="3" fill="#FF6600"/>
  </svg>
);

type TimeFilter = 'all' | 'week' | 'month' | 'year';

const WalletPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, transactions, isLoading, requestWithdrawal, refetch } = useWallet();
  
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'wave' | 'orange_money'>('wave');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');

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
      toast.success('Demande de retrait envoyée !');
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
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    
    // Time filter
    if (timeFilter !== 'all') {
      const txDate = new Date(tx.created_at);
      const cutoffDate = timeFilter === 'week' 
        ? subDays(new Date(), 7)
        : timeFilter === 'month'
        ? subDays(new Date(), 30)
        : subDays(new Date(), 365);
      
      if (!isAfter(txDate, cutoffDate)) return false;
    }
    
    return true;
  });

  // Calculate stats
  const totalCredits = transactions
    .filter(tx => tx.type === 'credit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalDebits = transactions
    .filter(tx => tx.type === 'debit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pendingWithdrawals = transactions
    .filter(tx => tx.type === 'debit' && tx.status === 'pending')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mon Portefeuille</h1>
            <p className="text-xs text-muted-foreground">Gérez vos fonds et retraits</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-9 w-9"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <PullToRefresh onRefresh={refetch}>
        <div className="container px-4 py-6 space-y-6 max-w-lg mx-auto">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <CardContent className="pt-6 relative">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <WalletIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Solde disponible</p>
                        <p className="text-3xl font-bold text-foreground">
                          {formatPrice(wallet?.balance || 0, 'XOF')}
                        </p>
                      </div>
                    </div>

                    {pendingWithdrawals > 0 && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-400">
                          {formatPrice(pendingWithdrawals, 'XOF')} en cours de retrait
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                      className="w-full gap-2"
                      size="lg"
                      disabled={!wallet || wallet.balance < 500}
                    >
                      <ArrowUpCircle className="h-5 w-5" />
                      Retirer des fonds
                    </Button>

                    {wallet && wallet.balance < 500 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Minimum 500 XOF pour retirer
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Total reçu</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {formatPrice(totalCredits, 'XOF')}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Total retiré</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatPrice(totalDebits, 'XOF')}
              </p>
            </Card>
          </div>

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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Retirer vers Mobile Money
                    </CardTitle>
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
                              ? 'border-cyan-500 bg-cyan-500/10 shadow-lg'
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
                              ? 'border-orange-500 bg-orange-500/10 shadow-lg'
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
                          className="text-primary hover:underline font-medium"
                        >
                          Tout retirer ({formatPrice(wallet?.balance || 0, 'XOF')})
                        </button>
                      </div>
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

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Historique</CardTitle>
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">7j</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">30j</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs">1an</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                  className="flex-1 text-xs"
                >
                  Tous
                </Button>
                <Button
                  variant={typeFilter === 'credit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('credit')}
                  className="flex-1 text-xs gap-1"
                >
                  <ArrowDownCircle className="h-3 w-3" />
                  Crédits
                </Button>
                <Button
                  variant={typeFilter === 'debit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('debit')}
                  className="flex-1 text-xs gap-1"
                >
                  <ArrowUpCircle className="h-3 w-3" />
                  Retraits
                </Button>
              </div>

              {/* Transaction List */}
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <WalletIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${
                          tx.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {tx.type === 'credit' ? (
                            <ArrowDownCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tx.description || (tx.type === 'credit' ? 'Crédit reçu' : 'Retrait')}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                            {tx.payout_method && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                {tx.payout_method === 'wave' ? 'Wave' : 'OM'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount, 'XOF')}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getStatusColor(tx.status)}`}>
                          {getStatusIcon(tx.status)}
                          <span className="hidden sm:inline">{getStatusLabel(tx.status)}</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground px-4">
            Les retraits sont traités via CinetPay et arrivent généralement en quelques minutes. 
            Frais de retrait : 0%.
          </p>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default WalletPage;
