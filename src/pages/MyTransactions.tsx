import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, MapPin, Calendar, Package, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  listing: {
    id: string;
    departure: string;
    arrival: string;
    departure_date: string;
    price_per_kg: number;
  };
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  type: 'buyer' | 'seller';
  created_at: string;
}

const MyTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTransactions();
  }, [user, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;

    // Fetch conversations where user is either buyer or seller
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        buyer_id,
        seller_id,
        listing_id,
        listings!inner(
          id,
          departure,
          arrival,
          departure_date,
          price_per_kg
        )
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des transactions");
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch other user profiles
    const processedTransactions = await Promise.all(
      data.map(async (conv: any) => {
        const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherUserId)
          .single();

        return {
          id: conv.id,
          listing: conv.listings,
          other_user: profile || { id: otherUserId, full_name: 'Utilisateur', avatar_url: '' },
          type: conv.buyer_id === user.id ? 'buyer' : 'seller',
          created_at: conv.created_at
        } as Transaction;
      })
    );

    setTransactions(processedTransactions);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Mes transactions</h1>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune transaction pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={transaction.other_user.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {transaction.other_user.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{transaction.other_user.full_name}</p>
                          <Badge variant={transaction.type === 'buyer' ? 'default' : 'secondary'} className="text-xs">
                            {transaction.type === 'buyer' ? 'Acheteur' : 'Vendeur'}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{transaction.listing.departure} → {transaction.listing.arrival}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(transaction.listing.departure_date), "d MMMM yyyy", { locale: fr })}
                          </div>
                          <span className="font-semibold text-primary">
                            {transaction.listing.price_per_kg}€/kg
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/conversation/${transaction.id}`)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Voir la conversation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTransactions;
