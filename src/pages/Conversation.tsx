import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, MapPin, Calendar, Weight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isOtherUserVerified, setIsOtherUserVerified] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchConversation();
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: senderData
          } as Message;

          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer:profiles!buyer_id(full_name, avatar_url, id_verified),
        seller:profiles!seller_id(full_name, avatar_url, id_verified),
        listings(id, departure, arrival, departure_date, arrival_date, available_kg, price_per_kg)
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de la conversation");
      return;
    }

    const other = data.buyer_id === user?.id ? data.seller : data.buyer;
    setOtherUser(other);
    setIsOtherUserVerified(other.id_verified || false);
    setListing(data.listings);
  };

  const fetchMessages = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(full_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des messages");
    } else {
      setMessages(data as Message[]);
    }

    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    setSendingMessage(true);

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content: newMessage.trim()
      });

    setSendingMessage(false);

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
    } else {
      setNewMessage("");
      toast.success("Message envoyé");
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/messages')}
          className="transition-all duration-200 hover:scale-110"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {otherUser && (
          <>
            <Avatar className="h-10 w-10 border-2 border-primary/20 transition-all duration-200 hover:scale-110">
              <AvatarImage src={otherUser.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-sky text-primary-foreground">
                {otherUser.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold truncate">{otherUser.full_name}</h2>
                <VerifiedBadge verified={isOtherUserVerified} size="sm" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Listing Context */}
      {listing && (
        <div className="px-4 sm:px-6 pt-4 animate-fade-in">
          <Card className="p-4 bg-muted/50 transition-all duration-200 hover:shadow-md">
            <p className="text-xs font-medium text-muted-foreground mb-2">Annonce concernée</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{listing.departure}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">{listing.arrival}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(listing.departure_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Weight className="h-3 w-3" />
                  <span>{listing.available_kg} kg</span>
                </div>
                <span className="font-semibold text-primary">{listing.price_per_kg}€/kg</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-4 pb-safe">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground animate-fade-in">
            Aucun message pour le moment
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex animate-fade-in ${
                message.sender_id === user.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 transition-all duration-200 hover:scale-[1.02] ${
                  message.sender_id === user.id
                    ? 'bg-gradient-sky text-primary-foreground shadow-md'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="sticky bottom-0 bg-card border-t border-border p-4 sm:px-6 pb-safe"
      >
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 transition-all duration-200 focus:scale-[1.01]"
            disabled={sendingMessage}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() || sendingMessage}
            className="bg-gradient-sky transition-all duration-200 hover:scale-110"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Conversation;