import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import ReservationsSection from "@/components/messages/ReservationsSection";
import ConversationsSection from "@/components/messages/ConversationsSection";

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationTab, setReservationTab] = useState<"received" | "sent">("received");

  const { reservations, conversations, loading, deleteConversation } = useMessages(user?.id);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
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

  if (!user) return null;

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
            placeholder="Rechercher..."
            className="pl-10 bg-card transition-all duration-200 focus:scale-[1.02]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <main className="container px-4 sm:px-6 space-y-6" aria-label="Messages et réservations">
        {/* Réservations */}
        <ReservationsSection
          reservations={reservations}
          currentUserId={user.id}
          activeTab={reservationTab}
          onTabChange={setReservationTab}
          loading={loading}
          searchQuery={searchQuery}
          onReservationClick={(id) => navigate(`/profile?tab=rdv`)}
        />

        {/* Conversations */}
        <ConversationsSection
          conversations={conversations}
          currentUserId={user.id}
          loading={loading}
          searchQuery={searchQuery}
          onConversationClick={(id) => navigate(`/conversation/${id}`)}
          onDeleteConversation={deleteConversation}
        />
      </main>
    </div>
  );
};

export default Messages;
