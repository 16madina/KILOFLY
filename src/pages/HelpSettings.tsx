import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight,
  HelpCircle, 
  Users, 
  AlertTriangle, 
  Headphones, 
  Star 
} from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

const HelpSettings = () => {
  const navigate = useNavigate();

  const handleRateApp = () => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    if (isNative) {
      if (platform === 'ios') {
        window.open('https://apps.apple.com/app/kilofly/id123456789', '_blank');
      } else if (platform === 'android') {
        window.open('https://play.google.com/store/apps/details?id=com.kilofly.app', '_blank');
      }
    } else {
      toast.info("Téléchargez l'application pour la noter");
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
          <h1 className="text-xl font-bold">Support & aide</h1>
        </div>
      </header>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-3">
        <Link to="/faq" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Questions fréquentes (FAQ)</span>
              <p className="text-sm text-muted-foreground">Trouvez des réponses rapidement</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>

        <Link to="/terms" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Règles de la communauté</span>
              <p className="text-sm text-muted-foreground">Conditions et bonnes pratiques</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>

        <a href="mailto:support@kilofly.com?subject=Signalement d'un problème" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Signaler un problème</span>
              <p className="text-sm text-muted-foreground">Nous contacter</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </a>

        <a href="mailto:support@kilofly.com" className="block">
          <div className="border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Contacter le support</span>
              <p className="text-sm text-muted-foreground">support@kilofly.com</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </a>

        <button 
          className="w-full border rounded-xl px-4 py-4 bg-card/50 flex items-center gap-3 hover:bg-accent transition-colors"
          onClick={handleRateApp}
        >
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-medium">Noter l'application</span>
            <p className="text-sm text-muted-foreground">Donnez-nous votre avis</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default HelpSettings;
