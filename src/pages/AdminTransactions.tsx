import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { ArrowLeft, TrendingUp, Package, Users, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

interface RevenueChartData {
  date: string;
  revenus: number;
  transactions: number;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  
  // Chart data
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartData[]>([]);

  useEffect(() => {
    checkAdminAndFetchTransactions();
  }, [user]);
  
  useEffect(() => {
    if (transactions.length > 0) {
      generateRevenueChartData();
    }
  }, [transactions]);

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
      setFilteredTransactions(data as any);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateRevenueChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'dd MMM', { locale: fr }),
        startDate: startOfDay(date),
        endDate: endOfDay(date),
        revenus: 0,
        transactions: 0
      };
    });

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.created_at);
      const dayData = last7Days.find(day => 
        transactionDate >= day.startDate && transactionDate <= day.endDate
      );
      
      if (dayData && transaction.status === 'completed') {
        dayData.revenus += transaction.platform_commission;
        dayData.transactions += 1;
      }
    });

    setRevenueChartData(last7Days.map(({ date, revenus, transactions }) => ({
      date,
      revenus: Number(revenus.toFixed(2)),
      transactions
    })));
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Search query (buyer, seller, or route)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.buyer.full_name.toLowerCase().includes(query) ||
        t.seller.full_name.toLowerCase().includes(query) ||
        t.listing.departure.toLowerCase().includes(query) ||
        t.listing.arrival.toLowerCase().includes(query)
      );
    }

    // Amount range filter
    if (minAmount) {
      filtered = filtered.filter(t => t.amount >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(t => t.amount <= parseFloat(maxAmount));
    }

    setFilteredTransactions(filtered);
  }, [transactions, statusFilter, searchQuery, minAmount, maxAmount]);

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

  const totalRevenue = filteredTransactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.platform_commission, 0);

  const totalTransactions = filteredTransactions.length;
  const completedTransactions = filteredTransactions.filter((t) => t.status === "completed").length;
  const pendingTransactions = filteredTransactions.filter((t) => t.status === "pending").length;
  const averageCommission = completedTransactions > 0 ? totalRevenue / completedTransactions : 0;
  
  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'Complétées', value: completedTransactions, color: 'hsl(var(--primary))' },
    { name: 'En attente', value: pendingTransactions, color: 'hsl(var(--secondary))' },
    { name: 'Annulées', value: filteredTransactions.filter(t => t.status === 'cancelled').length, color: 'hsl(var(--destructive))' },
    { name: 'Remboursées', value: filteredTransactions.filter(t => t.status === 'refunded').length, color: 'hsl(var(--muted))' }
  ].filter(item => item.value > 0);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">
                Commission de 5%
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
                Toutes périodes confondues
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taux de Complétion</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(1) : 0}%</div>
              <p className="text-xs text-muted-foreground">
                {completedTransactions} complétées
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commission Moyenne</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageCommission.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">
                Par transaction complétée
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenus des 7 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Revenus (€)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Transactions par jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="transactions" 
                    fill="hsl(var(--primary))" 
                    name="Transactions" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Distribution par Statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 5 Routes Rentables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const routeRevenue = filteredTransactions
                    .filter(t => t.status === 'completed')
                    .reduce((acc, t) => {
                      const route = `${t.listing.departure} → ${t.listing.arrival}`;
                      acc[route] = (acc[route] || 0) + t.platform_commission;
                      return acc;
                    }, {} as Record<string, number>);
                  
                  return Object.entries(routeRevenue)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([route, revenue]) => (
                      <div key={route} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{route}</span>
                        <span className="text-sm font-bold text-primary">{revenue.toFixed(2)} €</span>
                      </div>
                    ));
                })()}
                {filteredTransactions.filter(t => t.status === 'completed').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune transaction complétée
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, ville, trajet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant minimum (€)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Max Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant maximum (€)</label>
                <Input
                  type="number"
                  placeholder="1000.00"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Reset Filters Button */}
            {(statusFilter !== "all" || searchQuery || minAmount || maxAmount) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                  setMinAmount("");
                  setMaxAmount("");
                }}
                className="w-full"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des Transactions ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {transactions.length === 0 
                    ? "Aucune transaction pour le moment"
                    : "Aucune transaction ne correspond aux filtres"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
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
