import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  platform_commission: number;
  seller_amount: number;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  buyer: {
    full_name: string;
    avatar_url: string;
  };
  seller: {
    full_name: string;
    avatar_url: string;
  };
  listing: {
    departure: string;
    arrival: string;
    departure_date: string;
  };
}

export default function UserTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTransactions();
  }, [user, navigate]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          platform_commission,
          seller_amount,
          status,
          created_at,
          buyer_id,
          seller_id,
          buyer:buyer_id (full_name, avatar_url),
          seller:seller_id (full_name, avatar_url),
          listing:listing_id (departure, arrival, departure_date)
        `)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTransactions(data as any);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      cancelled: "destructive",
      refunded: "outline",
    };

    const labels: Record<string, string> = {
      completed: "Complété",
      pending: "En attente",
      cancelled: "Annulé",
      refunded: "Remboursé",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const isUserBuyer = (transaction: Transaction) => transaction.buyer_id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mes Transactions</h1>
            <p className="text-muted-foreground">
              Historique de vos achats et ventes
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune transaction</h3>
              <p className="text-muted-foreground text-center mb-6">
                Vous n'avez pas encore effectué de transaction
              </p>
              <Button onClick={() => navigate("/")}>
                Découvrir les annonces
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const isBuyer = isUserBuyer(transaction);
              const otherUser = isBuyer ? transaction.seller : transaction.buyer;
              const displayAmount = isBuyer ? transaction.amount : transaction.seller_amount;

              return (
                <Card key={transaction.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${isBuyer ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                          {isBuyer ? (
                            <ArrowUpRight className={`h-5 w-5 ${isBuyer ? 'text-destructive' : 'text-primary'}`} />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(transaction.status)}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(transaction.created_at), "d MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                          <p className="font-semibold text-lg mb-1">
                            {transaction.listing.departure} → {transaction.listing.arrival}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Départ: {format(new Date(transaction.listing.departure_date), "d MMMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${isBuyer ? 'text-destructive' : 'text-primary'}`}>
                          {isBuyer ? '-' : '+'}{displayAmount.toFixed(2)} €
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isBuyer ? 'Dépensé' : 'Reçu'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t">
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {isBuyer ? 'Vendeur' : 'Acheteur'}
                        </p>
                        <p className="font-medium">{otherUser.full_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
