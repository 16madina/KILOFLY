import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, Trash2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import SwipeableCard from "@/components/mobile/SwipeableCard";

interface ConversationData {
  id: string;
  type: 'conversation' | 'reservation';
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  buyer: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  seller: {
    full_name: string;
    avatar_url: string | null;
    id_verified: boolean | null;
  };
  messages: Array<{
    content: string;
    created_at: string;
    sender_id: string;
    read: boolean;
  }>;
  reservation?: {
    requested_kg: number;
    status: string;
    listing?: {
      departure: string;
      arrival: string;
    };
  };
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationTab, setReservationTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversations();

    // Subscribe to conversation and reservation updates
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservation_messages'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  useEffect(() => {
    // SEO: title + meta description + canonical for this page
    document.title = "Messages & réservations | KiloFly";

    const description =
      "Consultez vos messages et vos réservations KiloFly : demandes reçues et envoyées, suivi et échanges en temps réel.";

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/messages`);
  }, []);

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Fetch regular conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
          seller:profiles!seller_id(full_name, avatar_url, id_verified),
          messages(content, created_at, sender_id, read)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Fetch reservations with messages
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          buyer_id,
          seller_id,
          updated_at,
          requested_kg,
          status,
          buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
          seller:profiles!seller_id(full_name, avatar_url, id_verified),
          listing:listings!listing_id(departure, arrival),
          reservation_messages:reservation_messages(content, created_at, sender_id, read)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq('status', 'rejected')
        .neq('status', 'cancelled')
        .order('updated_at', { ascending: false });

      if (reservationsError) throw reservationsError;

      // Transform conversations
      const transformedConversations = (conversationsData || []).map((conv: any) => ({
        ...conv,
        type: 'conversation' as const,
      }));

      // Transform reservations (each reservation shown individually)
      const transformedReservations = (reservationsData || []).map((res: any) => ({
        id: res.id,
        type: 'reservation' as const,
        buyer_id: res.buyer_id,
        seller_id: res.seller_id,
        updated_at: res.updated_at,
        buyer: res.buyer,
        seller: res.seller,
        messages: res.reservation_messages || [],
        reservation: {
          requested_kg: res.requested_kg,
          status: res.status,
          listing: res.listing,
        },
      }));

      // Combine and sort by updated_at
      const allConversations = [...transformedConversations, ...transformedReservations]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setConversations(allConversations);
    } catch (error) {
      toast.error("Erreur lors du chargement des conversations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (conv: ConversationData) => {
    return conv.buyer_id === user?.id ? conv.seller : conv.buyer;
  };

  const getLastMessage = (conv: ConversationData) => {
    if (!conv.messages || conv.messages.length === 0) {
      return "Aucun message";
    }
    const sortedMessages = [...conv.messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedMessages[0].content;
  };

  const getUnreadCount = (conv: ConversationData) => {
    if (!conv.messages || !user) return 0;
    return conv.messages.filter(
      msg => msg.sender_id !== user.id && !msg.read
    ).length;
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Conversation supprimée");
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
  };

  const reservationItems = conversations.filter((c) => c.type === 'reservation');
  const receivedReservations = reservationItems.filter((r) => r.seller_id === user?.id);
  const sentReservations = reservationItems.filter((r) => r.buyer_id === user?.id);
  const displayedReservations = reservationTab === 'received' ? receivedReservations : sentReservations;

  const filteredReservations = displayedReservations.filter((res) => {
    const otherUser = getOtherUser(res);
    return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredChats = conversations
    .filter((c) => c.type === 'conversation')
    .filter((conv) => {
      const otherUser = getOtherUser(conv);
      return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container px-4 sm:px-6 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2 animate-fade-in">
            <MessageCircle className="h-6 w-6 text-primary" />
            Messages
          </h1>
        </div>
      </header>

      {/* Search */}
      <div className="container px-4 sm:px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            className="pl-10 bg-card transition-all duration-200 focus:scale-[1.02]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Reservations + Conversations */}
      <main className="container px-4 sm:px-6 space-y-6" aria-label="Messages et réservations">
        {/* Réservations */}
        <section aria-label="Réservations">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-semibold text-foreground">Réservations</h2>
            <span className="text-xs text-muted-foreground">
              {receivedReservations.length + sentReservations.length}
            </span>
          </div>

          <div className="flex bg-card rounded-xl border border-border/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setReservationTab("received")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                reservationTab === "received" ? "text-primary bg-primary/5" : "text-muted-foreground"
              }`}
            >
              Reçues ({receivedReservations.length})
            </button>
            <button
              type="button"
              onClick={() => setReservationTab("sent")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                reservationTab === "sent" ? "text-primary bg-primary/5" : "text-muted-foreground"
              }`}
            >
              Envoyées ({sentReservations.length})
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-10 animate-fade-in">
                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">Aucune réservation</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Aucun résultat pour cette recherche" : "Vos réservations apparaîtront ici"}
                </p>
              </div>
            ) : (
              filteredReservations.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                const lastMessage = getLastMessage(conversation);
                const unreadCount = getUnreadCount(conversation);

                return (
                  <SwipeableCard key={conversation.id}>
                    <button
                      onClick={() => navigate('/my-reservations')}
                      className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-all duration-200 hover:scale-[1.01] hover:shadow-md text-left animate-fade-in relative"
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{conversation.id.slice(0, 6).toUpperCase()}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0.5 border ${
                            conversation.reservation?.status === 'pending'
                              ? 'bg-warning/10 text-warning border-warning/20'
                              : conversation.reservation?.status === 'approved'
                              ? 'bg-success/10 text-success border-success/20'
                              : conversation.reservation?.status === 'in_progress'
                              ? 'bg-accent/10 text-accent border-accent/20'
                              : conversation.reservation?.status === 'delivered'
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-secondary text-secondary-foreground border-border/50'
                          }`}
                        >
                          {conversation.reservation?.status === 'pending' && 'En attente'}
                          {conversation.reservation?.status === 'approved' && 'Approuvée'}
                          {conversation.reservation?.status === 'in_progress' && 'En cours'}
                          {conversation.reservation?.status === 'delivered' && 'Livrée'}
                          {!['pending', 'approved', 'in_progress', 'delivered'].includes(
                            conversation.reservation?.status || ''
                          ) && conversation.reservation?.status}
                        </Badge>
                      </div>

                      <Avatar className="h-12 w-12 border-2 border-primary/20 transition-all duration-200 hover:scale-110">
                        <AvatarImage src={otherUser.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                          {otherUser.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 pr-24">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate flex-shrink min-w-0">{otherUser.full_name}</h3>
                          <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto flex-shrink-0">
                            {new Date(conversation.updated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {conversation.reservation?.listing && (
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="h-3 w-3 text-primary flex-shrink-0" />
                            <p className="text-xs text-primary truncate">
                              {conversation.reservation.listing.departure} → {conversation.reservation.listing.arrival} •{' '}
                              {conversation.reservation.requested_kg} kg
                            </p>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
                      </div>

                      {unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground animate-scale-in absolute bottom-3 right-3">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  </SwipeableCard>
                );
              })
            )}
          </div>
        </section>

        {/* Conversations */}
        <section aria-label="Conversations">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            <span className="text-xs text-muted-foreground">{filteredChats.length}</span>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-10 animate-fade-in">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">Aucun message</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Aucun résultat pour cette recherche" : "Vos conversations apparaîtront ici"}
                </p>
              </div>
            ) : (
              filteredChats.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                const lastMessage = getLastMessage(conversation);
                const unreadCount = getUnreadCount(conversation);

                return (
                  <SwipeableCard
                    key={conversation.id}
                    onSwipeLeft={() => deleteConversation(conversation.id)}
                    leftAction={
                      <div className="flex items-center justify-center w-16 h-16 bg-destructive rounded-full">
                        <Trash2 className="h-5 w-5 text-destructive-foreground" />
                      </div>
                    }
                  >
                    <button
                      onClick={() => navigate(`/conversation/${conversation.id}`)}
                      className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-all duration-200 hover:scale-[1.01] hover:shadow-md text-left animate-fade-in relative"
                    >
                      <Avatar className="h-12 w-12 border-2 border-primary/20 transition-all duration-200 hover:scale-110">
                        <AvatarImage src={otherUser.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                          {otherUser.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate flex-shrink min-w-0">{otherUser.full_name}</h3>
                          <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto flex-shrink-0">
                            {new Date(conversation.updated_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
                      </div>

                      {unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground animate-scale-in">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  </SwipeableCard>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Messages;