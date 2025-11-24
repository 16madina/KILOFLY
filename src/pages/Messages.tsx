import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

interface ConversationData {
  id: string;
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
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversations();

    // Subscribe to conversation updates
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
        seller:profiles!seller_id(full_name, avatar_url, id_verified),
        messages(content, created_at, sender_id, read)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des conversations");
      console.error(error);
    } else {
      setConversations(data as ConversationData[]);
    }

    setLoading(false);
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

  const filteredConversations = conversations.filter(conv => {
    const otherUser = getOtherUser(conv);
    return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Messages
          </h1>
        </div>
      </header>

      {/* Search */}
      <div className="container py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            className="pl-10 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="container space-y-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "Aucune conversation trouvée" : "Aucun message"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Essayez une autre recherche" : "Vos conversations apparaîtront ici"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherUser = getOtherUser(conversation);
            const lastMessage = getLastMessage(conversation);
            const unreadCount = getUnreadCount(conversation);
            
            return (
              <button
                key={conversation.id}
                onClick={() => navigate(`/conversation/${conversation.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherUser.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                    {otherUser.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{otherUser.full_name}</h3>
                      <VerifiedBadge verified={otherUser.id_verified || false} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conversation.updated_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMessage}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Messages;