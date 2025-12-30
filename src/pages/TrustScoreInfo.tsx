import { ChevronLeft, Shield, Star, CheckCircle, Phone, Plane, UserPlus, Mail, Gift, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const TrustScoreInfo = () => {
  const navigate = useNavigate();

  const badges = [
    { level: "Bronze", color: "from-orange-400 to-orange-600", range: "15-49", icon: "🥉", reward: "Mise en avant de votre profil" },
    { level: "Argent", color: "from-gray-300 to-gray-400", range: "50-69", icon: "🥈", reward: "Badge visible sur toutes vos annonces" },
    { level: "Or", color: "from-yellow-400 to-yellow-600", range: "70-89", icon: "⭐", reward: "Réduction de 5% sur les frais de service" },
    { level: "Platine", color: "from-purple-500 to-pink-500", range: "90+", icon: "🏆", reward: "Accès prioritaire + Badge exclusif" },
  ];

  const criteria = [
    {
      icon: UserPlus,
      title: "Inscription",
      points: "+5 points",
      description: "Créez votre compte sur KiloFly"
    },
    {
      icon: Mail,
      title: "Email vérifié",
      points: "+5 points",
      description: "Confirmez votre adresse email"
    },
    {
      icon: CheckCircle,
      title: "Identité vérifiée",
      points: "+5 points",
      description: "Faites vérifier votre pièce d'identité"
    },
    {
      icon: Phone,
      title: "Téléphone vérifié",
      points: "+5 points",
      description: "Confirmez votre numéro de téléphone"
    },
    {
      icon: Plane,
      title: "Voyages complétés",
      points: "+2 points/voyage",
      description: "Chaque voyage complété (voyageur ou expéditeur)"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-sky text-primary-foreground px-4 py-6 safe-top">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Score de confiance</h1>
        </div>
        
        <div className="bg-background/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-8 w-8" />
            <div>
              <p className="text-lg font-semibold">Qu'est-ce que le score de confiance ?</p>
              <p className="text-sm opacity-90">Un indicateur de fiabilité basé sur vos actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Badges Section with Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Niveaux de badges & Récompenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {badges.map((badge) => (
              <div key={badge.level} className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className={`bg-gradient-to-r ${badge.color} text-white px-4 py-2 rounded-full flex items-center gap-2 min-w-[140px]`}>
                    <span className="text-xl">{badge.icon}</span>
                    <span className="font-semibold">{badge.level}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{badge.range} points</p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Gift className="h-4 w-4 text-primary" />
                  <span>{badge.reward}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* How to Earn Points */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Comment gagner des points ?
          </h2>
          <div className="space-y-3">
            {criteria.map((criterion, index) => {
              const Icon = criterion.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="bg-primary/10 rounded-full p-3 h-fit">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold">{criterion.title}</h3>
                          <span className="text-primary font-bold text-sm whitespace-nowrap ml-2">
                            {criterion.points}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{criterion.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Example Progress */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Exemple de progression
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Inscription seule</span>
                  <span className="font-semibold">5 pts - Pas de badge</span>
                </div>
                <Progress value={5} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ Email vérifié</span>
                  <span className="font-semibold">10 pts - Pas de badge</span>
                </div>
                <Progress value={10} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ Identité vérifiée</span>
                  <span className="font-semibold">15 pts - Bronze 🥉</span>
                </div>
                <Progress value={15} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ Téléphone vérifié</span>
                  <span className="font-semibold">20 pts - Bronze 🥉</span>
                </div>
                <Progress value={20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ 15 voyages complétés</span>
                  <span className="font-semibold">50 pts - Argent 🥈</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ 25 voyages de plus</span>
                  <span className="font-semibold">100 pts - Platine 🏆</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-sky text-primary-foreground">
          <CardContent className="p-6 text-center">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-90" />
            <h3 className="font-bold text-lg mb-2">Débloquez des récompenses !</h3>
            <p className="text-sm opacity-90 mb-4">
              Chaque niveau atteint vous offre des avantages exclusifs
            </p>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/profile')}
            >
              Voir mon profil
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrustScoreInfo;
