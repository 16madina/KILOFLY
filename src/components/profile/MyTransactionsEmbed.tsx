import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  seller_amount: number;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  listing: { departure: string; arrival: string };
}

interface MyTransactionsEmbedProps {
  type: 'seller' | 'buyer';
}

export const MyTransactionsEmbed = ({ type }: MyTransactionsEmbedProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, type]);

  const fetchTransactions = async () => {
    if (!user) return;

    const filterColumn = type === 'seller' ? 'seller_id' : 'buyer_id';

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id, amount, seller_amount, status, created_at, buyer_id, seller_id,
        listing:listing_id (departure, arrival)
      `)
      .eq(filterColumn, user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error(error);
    } else {
      setTransactions((data as any) || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-600 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
      refunded: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      completed: 'Complété',
      pending: 'En attente',
      cancelled: 'Annulé',
      refunded: 'Remboursé',
    };
    return (
      <Badge variant="outline" className={`text-xs ${variants[status] || ''}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-6 text-center backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10">
        <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {type === 'seller' ? 'Aucun revenu' : 'Aucune dépense'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const isBuyer = type === 'buyer';
        const displayAmount = isBuyer ? transaction.amount : transaction.seller_amount;

        return (
          <Card 
            key={transaction.id} 
            className="overflow-hidden backdrop-blur-xl bg-card/70 border-white/20 dark:border-white/10 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/user-transactions?type=${type}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${isBuyer ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    {isBuyer ? (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {transaction.listing?.departure} → {transaction.listing?.arrival}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.created_at), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-bold text-sm ${isBuyer ? 'text-destructive' : 'text-primary'}`}>
                    {isBuyer ? '-' : '+'}{displayAmount.toFixed(0)}€
                  </span>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate(`/user-transactions?type=${type}`)}
      >
        Voir tout
      </Button>
    </div>
  );
};
