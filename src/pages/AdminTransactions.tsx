import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users } from "lucide-react";
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

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchTransactions();
  }, [user]);

  const checkAdminAndFetchTransactions = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await fetchTransactions();
  };

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
          buyer:buyer_id (full_name, avatar_url),
          seller:seller_id (full_name, avatar_url),
          listing:listing_id (departure, arrival, departure_date)
        `)
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

  const totalRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.platform_commission, 0);

  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter((t) => t.status === "completed").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestion des Transactions</h1>
            <p className="text-muted-foreground">
              Visualisez toutes les transactions et les revenus de la plateforme
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">
                Commission de 5% sur les transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions Totales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Toutes les transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions Complétées</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {((completedTransactions / totalTransactions) * 100).toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune transaction pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <Card key={transaction.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(transaction.status)}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(transaction.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {transaction.listing.departure} → {transaction.listing.arrival}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Départ: {format(new Date(transaction.listing.departure_date), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{transaction.amount.toFixed(2)} €</p>
                          <p className="text-sm text-muted-foreground">Montant total</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm font-medium mb-1">Acheteur</p>
                          <div className="flex items-center gap-2">
                            <img
                              src={transaction.buyer.avatar_url}
                              alt={transaction.buyer.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="text-sm">{transaction.buyer.full_name}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-1">Vendeur</p>
                          <div className="flex items-center gap-2">
                            <img
                              src={transaction.seller.avatar_url}
                              alt={transaction.seller.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="text-sm">{transaction.seller.full_name}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Commission (5%):</span>
                            <span className="font-semibold text-primary">
                              +{transaction.platform_commission.toFixed(2)} €
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Montant vendeur:</span>
                            <span>{transaction.seller_amount.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
