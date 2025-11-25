import { ChevronLeft, Shield, Star, CheckCircle, Phone, Plane, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const TrustScoreInfo = () => {
  const navigate = useNavigate();

  const badges = [
    { level: "Bronze", color: "from-orange-400 to-orange-600", range: "0-39", icon: "🥉" },
    { level: "Argent", color: "from-gray-300 to-gray-400", range: "40-59", icon: "🥈" },
    { level: "Or", color: "from-yellow-400 to-yellow-600", range: "60-79", icon: "⭐" },
    { level: "Platine", color: "from-purple-500 to-pink-500", range: "80-100", icon: "🏆" },
  ];

  const criteria = [
    {
      icon: CheckCircle,
      title: "Vérification d'identité",
      points: "+30 points",
      description: "Faites vérifier votre pièce d'identité par notre équipe"
    },
    {
      icon: Phone,
      title: "Vérification téléphone",
      points: "+20 points",
      description: "Confirmez votre numéro de téléphone avec un code SMS"
    },
    {
      icon: Plane,
      title: "Voyages complétés",
      points: "+2 points/voyage",
      description: "Chaque voyage complété augmente votre score de confiance"
    },
    {
      icon: Star,
      title: "Notes moyennes",
      points: "Jusqu'à +30 points",
      description: "Maintenez une excellente note moyenne (5/5 = +30 points)"
    },
    {
      icon: Clock,
      title: "Taux de réponse",
      points: "Jusqu'à +20 points",
      description: "Répondez rapidement aux messages (100% = +20 points)"
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
        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Niveaux de badges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {badges.map((badge) => (
              <div key={badge.level} className="flex items-center gap-4">
                <div className={`bg-gradient-to-r ${badge.color} text-white px-4 py-2 rounded-full flex items-center gap-2 min-w-[140px]`}>
                  <span className="text-xl">{badge.icon}</span>
                  <span className="font-semibold">{badge.level}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{badge.range} points</p>
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
                  <span>Nouveau membre</span>
                  <span className="font-semibold">0 pts - Bronze 🥉</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Identité + Téléphone vérifiés</span>
                  <span className="font-semibold">50 pts - Argent 🥈</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span>+ 5 voyages avec notes parfaites</span>
                  <span className="font-semibold">80 pts - Platine 🏆</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-sky text-primary-foreground">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-90" />
            <h3 className="font-bold text-lg mb-2">Augmentez votre score !</h3>
            <p className="text-sm opacity-90 mb-4">
              Un score élevé inspire confiance et augmente vos chances de conclure des transactions
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
