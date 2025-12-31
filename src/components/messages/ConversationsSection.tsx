import { MessageCircle } from "lucide-react";
import ConversationCard from "./ConversationCard";

interface Conversation {
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

interface ConversationsSectionProps {
  conversations: Conversation[];
  currentUserId: string;
  loading: boolean;
  searchQuery: string;
  onConversationClick: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

const ConversationsSection = ({
  conversations,
  currentUserId,
  loading,
  searchQuery,
  onConversationClick,
  onDeleteConversation,
}: ConversationsSectionProps) => {
  const getOtherUser = (conv: Conversation) => {
    return conv.buyer_id === currentUserId ? conv.seller : conv.buyer;
  };

  const getLastMessage = (conv: Conversation) => {
    if (!conv.messages || conv.messages.length === 0) return "Aucun message";
    const sorted = [...conv.messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0].content;
  };

  const getUnreadCount = (conv: Conversation) => {
    if (!conv.messages) return 0;
    return conv.messages.filter((msg) => msg.sender_id !== currentUserId && !msg.read).length;
  };

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherUser(conv);
    return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <section aria-label="Conversations">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
        <span className="text-xs text-muted-foreground">{filteredConversations.length}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-10 animate-fade-in">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">Aucun message</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Aucun résultat pour cette recherche" : "Vos conversations apparaîtront ici"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUser = getOtherUser(conv);
            return (
              <ConversationCard
                key={conv.id}
                id={conv.id}
                otherUser={otherUser}
                lastMessage={getLastMessage(conv)}
                unreadCount={getUnreadCount(conv)}
                updatedAt={conv.updated_at}
                onClick={() => onConversationClick(conv.id)}
                onDelete={() => onDeleteConversation(conv.id)}
              />
            );
          })
        )}
      </div>
    </section>
  );
};

export default ConversationsSection;
