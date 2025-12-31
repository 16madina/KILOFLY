import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, MapPin, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  amount: number;
  platform_commission: number;
  seller_amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  listing?: {
    departure: string;
    arrival: string;
    currency: string;
  };
}

type PeriodFilter = "all" | "week" | "month" | "year";

export function MyTransactionsEmbed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>("all");

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        listing:listings(departure, arrival, currency)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  // Filter transactions by period
  useEffect(() => {
    if (transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case "week":
        startDate = startOfWeek(now, { locale: fr });
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        break;
      default:
        startDate = null;
    }

    if (startDate) {
      const filtered = transactions.filter(
        (tx) => new Date(tx.created_at) >= startDate!
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [transactions, period]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      completed: "Complétée",
      failed: "Échouée",
      refunded: "Remboursée",
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Calculate totals for filtered transactions
  const totals = filteredTransactions.reduce(
    (acc, tx) => {
      const isSeller = tx.seller_id === user?.id;
      if (isSeller) {
        acc.income += tx.seller_amount;
      } else {
        acc.expenses += tx.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Aucune transaction</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vous n'avez pas encore de transactions.
        </p>
        <Button onClick={() => navigate('/')} size="sm">
          Explorer les annonces
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter and Summary */}
      <div className="flex items-center justify-between gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-3 text-xs">
          {totals.income > 0 && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{totals.income.toFixed(0)} €
            </span>
          )}
          {totals.expenses > 0 && (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              -{totals.expenses.toFixed(0)} €
            </span>
          )}
        </div>
      </div>

      {/* Transactions list */}
      {filteredTransactions.length === 0 ? (
        <Card className="p-6 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
          <p className="text-sm text-muted-foreground">
            Aucune transaction pour cette période
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.slice(0, 10).map((tx) => {
            const isSeller = tx.seller_id === user?.id;
            const displayAmount = isSeller ? tx.seller_amount : tx.amount;
            
            return (
              <Card
                key={tx.id}
                className="p-4 backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSeller 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      {isSeller ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {tx.listing?.departure} → {tx.listing?.arrival}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(tx.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{isSeller ? 'Revenu' : 'Dépense'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-semibold ${isSeller ? 'text-green-600' : 'text-foreground'}`}>
                      {isSeller ? '+' : '-'}{displayAmount} {tx.listing?.currency || 'EUR'}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {filteredTransactions.length > 10 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/user-transactions')}
        >
          Voir toutes les transactions ({filteredTransactions.length})
        </Button>
      )}
    </div>
  );
}
