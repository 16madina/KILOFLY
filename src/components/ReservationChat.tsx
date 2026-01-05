import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskSensitiveContent, containsSensitiveContent } from "@/lib/contentFilter";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

interface ReservationChatProps {
  reservationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  reservationStatus?: string;
}

const ReservationChat = ({
  reservationId,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  reservationStatus,
}: ReservationChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if payment is completed (phone numbers should be visible)
  const isPaymentCompleted = ['paid', 'completed', 'delivered', 'payment_received', 'picked_up', 'in_transit', 'in_progress', 'arrived', 'out_for_delivery'].includes(reservationStatus || '');

  useEffect(() => {
    if (!reservationId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessages([]);

      try {
        const { data, error } = await supabase
          .from("reservation_messages")
          .select(
            `
            *,
            sender:profiles!sender_id(full_name, avatar_url)
          `
          )
          .eq("reservation_id", reservationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!cancelled) setMessages((data as any) || []);

        // Mark unread messages as read
        if (user) {
          await supabase
            .from("reservation_messages")
            .update({ read: true })
            .eq("reservation_id", reservationId)
            .eq("read", false)
            .neq("sender_id", user.id);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Erreur lors du chargement des messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    // IMPORTANT: clean up the realtime subscription when switching reservationId
    const channel = supabase
      .channel(`reservation-chat-${reservationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservation_messages",
          filter: `reservation_id=eq.${reservationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("reservation_messages")
            .select(
              `
              *,
              sender:profiles!sender_id(full_name, avatar_url)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (!cancelled && data) {
            setMessages((prev) => [...prev, data as any]);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [reservationId, user?.id]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user) return;

    // Check for sensitive content if payment not completed
    if (!isPaymentCompleted && containsSensitiveContent(newMessage)) {
      setSensitiveWarning(true);
      toast.warning("Information sensible détectée", {
        description: "Le partage de numéros de téléphone ou emails n'est pas autorisé avant le paiement.",
      });
      return;
    }

    setSending(true);
    setSensitiveWarning(false);

    try {
      const { error } = await supabase
        .from("reservation_messages")
        .insert({
          reservation_id: reservationId,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-sky p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUserAvatar} />
            <AvatarFallback className="bg-primary-foreground/20">
              {otherUserName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{otherUserName}</p>
            <p className="text-xs opacity-90">Chat de la réservation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Warning about content filtering before payment */}
          {!isPaymentCompleted && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                Les numéros de téléphone et emails sont masqués avant le paiement pour votre sécurité.
              </AlertDescription>
            </Alert>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-sm text-muted-foreground mt-1">
                Commencez la conversation pour discuter des détails
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              // Mask sensitive content in displayed messages if payment not completed
              const displayContent = isPaymentCompleted 
                ? message.content 
                : maskSensitiveContent(message.content);
              const hasHiddenContent = !isPaymentCompleted && displayContent !== message.content;
              
              return (
                <div
                  key={message.id}
                  className={cn("flex gap-2", isOwn && "flex-row-reverse")}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender?.avatar_url} />
                    <AvatarFallback className="text-xs bg-gradient-sky text-primary-foreground">
                      {message.sender?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex flex-col max-w-[70%]",
                      isOwn && "items-end"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2",
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                        hasHiddenContent && "border border-amber-500/30"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {displayContent}
                      </p>
                      {hasHiddenContent && (
                        <p className="text-[10px] opacity-70 mt-1 italic">
                          Contenu masqué
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Sensitive content warning */}
      {sensitiveWarning && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30">
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Le partage d'infos de contact est interdit avant le paiement
          </p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t bg-background flex gap-2"
      >
        <Input
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            if (sensitiveWarning) setSensitiveWarning(false);
          }}
          placeholder="Tapez votre message..."
          disabled={sending}
          className={cn("flex-1", sensitiveWarning && "border-amber-500")}
        />
        <Button type="submit" disabled={sending || !newMessage.trim()} size="icon">
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default ReservationChat;
