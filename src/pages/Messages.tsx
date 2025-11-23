import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Messages = () => {
  // Mock conversations data
  const conversations = [
    {
      id: "1",
      userName: "Marie Dubois",
      lastMessage: "Parfait pour les dates !",
      timestamp: "Il y a 5 min",
      unread: 2,
      avatar: "",
    },
    {
      id: "2",
      userName: "Jean Kouassi",
      lastMessage: "Je confirme la réservation",
      timestamp: "Il y a 1h",
      unread: 0,
      avatar: "",
    },
    {
      id: "3",
      userName: "Sophie Martin",
      lastMessage: "Merci pour votre aide !",
      timestamp: "Hier",
      unread: 0,
      avatar: "",
    },
  ];

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
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="container space-y-1">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            className="w-full flex items-center gap-3 p-4 bg-card hover:bg-muted/50 rounded-xl transition-colors text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={conversation.avatar} />
              <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                {conversation.userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold truncate">{conversation.userName}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {conversation.timestamp}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conversation.lastMessage}
              </p>
            </div>

            {conversation.unread > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {conversation.unread}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {conversations.length === 0 && (
        <div className="container pt-20 text-center">
          <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun message</h3>
          <p className="text-muted-foreground">
            Vos conversations apparaîtront ici
          </p>
        </div>
      )}
    </div>
  );
};

export default Messages;
