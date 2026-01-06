import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight,
  Trash2, 
  DollarSign, 
  Heart, 
  MapPin 
} from "lucide-react";
import { toast } from "sonner";

const StorageSettings = () => {
  const navigate = useNavigate();
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const authData = localStorage.getItem('sb-yuhbvzjniylkruaylxzz-auth-token');
      localStorage.clear();
      if (authData) {
        localStorage.setItem('sb-yuhbvzjniylkruaylxzz-auth-token', authData);
      }
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      toast.success("Cache vidé avec succès");
    } catch (error) {
      toast.error("Erreur lors du vidage du cache");
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 mb-safe">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="h-9 w-9 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Données et stockage</h1>
        </div>
      </header>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-3">
        <button 
          className="w-full border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors"
          onClick={handleClearCache}
          disabled={clearingCache}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-medium">Vider le cache</span>
            <p className="text-sm text-muted-foreground">Libérer de l'espace</p>
          </div>
          {clearingCache && <span className="text-sm text-muted-foreground">...</span>}
        </button>

        <Link to="/user-transactions" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Mes transactions</span>
              <p className="text-sm text-muted-foreground">Historique des paiements</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>

        <Link to="/favorites" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Mes Favoris</span>
              <p className="text-sm text-muted-foreground">Annonces sauvegardées</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>

        <Link to="/route-alerts" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Alertes de Routes</span>
              <p className="text-sm text-muted-foreground">Notifications de trajets</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default StorageSettings;
