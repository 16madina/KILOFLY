import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Star, Award, Crown, Lock, Check, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface Reward {
  id: string;
  level: string;
  minScore: number;
  maxScore: number;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  rewards: string[];
  unlocked: boolean;
}

const MyRewards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trustScore, setTrustScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrustScore = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id_verified, phone_verified, completed_trips")
          .eq("id", user.id)
          .single();

        const { data: authUser } = await supabase.auth.getUser();

        let score = 5; // Inscription

        if (authUser?.user?.email_confirmed_at) {
          score += 5;
        }

        if (profile?.id_verified) {
          score += 5;
        }

        if (profile?.phone_verified) {
          score += 5;
        }

        const completedTrips = profile?.completed_trips || 0;
        score += completedTrips * 2;

        setTrustScore(score);
      } catch (error) {
        console.error("Error fetching trust score:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustScore();
  }, [user]);

  const rewards: Reward[] = [
    {
      id: "bronze",
      level: "Bronze",
      minScore: 15,
      maxScore: 49,
      icon: <Award className="h-8 w-8" />,
      color: "text-amber-600",
      bgGradient: "from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30",
      rewards: [
        "Profil mis en avant dans les résultats de recherche",
        "Badge Bronze visible sur votre profil"
      ],
      unlocked: trustScore >= 15
    },
    {
      id: "argent",
      level: "Argent",
      minScore: 50,
      maxScore: 69,
      icon: <Star className="h-8 w-8" />,
      color: "text-slate-400",
      bgGradient: "from-slate-100 to-slate-200 dark:from-slate-800/30 dark:to-slate-700/30",
      rewards: [
        "Réduction de 3% sur les frais de service",
        "Badge Argent visible sur vos annonces",
        "Statistiques détaillées de votre profil"
      ],
      unlocked: trustScore >= 50
    },
    {
      id: "or",
      level: "Or",
      minScore: 70,
      maxScore: 89,
      icon: <Trophy className="h-8 w-8" />,
      color: "text-yellow-500",
      bgGradient: "from-yellow-100 to-amber-200 dark:from-yellow-900/30 dark:to-amber-800/30",
      rewards: [
        "Réduction de 5% sur les frais de service",
        "Support client prioritaire",
        "Badge Or exclusif",
        "Annonces mises en avant 24h/mois"
      ],
      unlocked: trustScore >= 70
    },
    {
      id: "platine",
      level: "Platine",
      minScore: 90,
      maxScore: 999,
      icon: <Crown className="h-8 w-8" />,
      color: "text-purple-500",
      bgGradient: "from-purple-100 to-pink-200 dark:from-purple-900/30 dark:to-pink-800/30",
      rewards: [
        "Réduction de 10% sur les frais de service",
        "Accès prioritaire aux nouvelles fonctionnalités",
        "Badge Platine exclusif animé",
        "Support VIP dédié",
        "Accès aux fonctionnalités bêta"
      ],
      unlocked: trustScore >= 90
    }
  ];

  const getCurrentLevel = () => {
    if (trustScore >= 90) return "platine";
    if (trustScore >= 70) return "or";
    if (trustScore >= 50) return "argent";
    if (trustScore >= 15) return "bronze";
    return null;
  };

  const getNextLevel = () => {
    if (trustScore >= 90) return null;
    if (trustScore >= 70) return rewards.find(r => r.id === "platine");
    if (trustScore >= 50) return rewards.find(r => r.id === "or");
    if (trustScore >= 15) return rewards.find(r => r.id === "argent");
    return rewards.find(r => r.id === "bronze");
  };

  const getProgressToNextLevel = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 100;
    
    const currentLevel = getCurrentLevel();
    const currentMin = currentLevel 
      ? rewards.find(r => r.id === currentLevel)?.minScore || 0 
      : 0;
    
    const range = nextLevel.minScore - currentMin;
    const progress = trustScore - currentMin;
    
    return Math.min(100, Math.max(0, (progress / range) * 100));
  };

  const pointsToNextLevel = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 0;
    return nextLevel.minScore - trustScore;
  };

  const currentLevelData = getCurrentLevel() 
    ? rewards.find(r => r.id === getCurrentLevel()) 
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-nav">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Mes Récompenses</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 glass-card overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${currentLevelData?.bgGradient || 'from-muted to-muted/50'}`}>
                  {currentLevelData?.icon || <Gift className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau actuel</p>
                  <p className={`text-2xl font-bold ${currentLevelData?.color || 'text-muted-foreground'}`}>
                    {currentLevelData?.level || "Débutant"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold">{trustScore} pts</span>
                {getNextLevel() && (
                  <span className="text-sm text-muted-foreground">
                    {pointsToNextLevel()} pts pour {getNextLevel()?.level}
                  </span>
                )}
              </div>

              <Progress value={getProgressToNextLevel()} className="h-3 mb-2" />
              
              {getNextLevel() ? (
                <p className="text-xs text-muted-foreground text-center">
                  Prochain niveau : {getNextLevel()?.minScore} pts
                </p>
              ) : (
                <p className="text-xs text-center text-primary font-medium flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> Niveau maximum atteint !
                </p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Rewards List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Récompenses par niveau
          </h2>

          {rewards.map((reward, index) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-4 relative overflow-hidden transition-all ${
                reward.unlocked 
                  ? 'glass-card border-primary/20' 
                  : 'bg-muted/30 opacity-70'
              }`}>
                {/* Background gradient */}
                {reward.unlocked && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${reward.bgGradient} opacity-30`} />
                )}

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${reward.bgGradient} ${reward.color} shrink-0`}>
                      {reward.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold ${reward.color}`}>
                          {reward.level}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {reward.minScore} - {reward.maxScore === 999 ? '∞' : reward.maxScore} pts
                        </span>
                      </div>

                      <ul className="space-y-1.5">
                        {reward.rewards.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            {reward.unlocked ? (
                              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <span className={reward.unlocked ? '' : 'text-muted-foreground'}>
                              {r}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Unlocked Badge */}
                  {reward.unlocked && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                        <Check className="h-3 w-3" />
                        Débloqué
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* How to earn points */}
        <Card className="p-4 glass-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Comment gagner des points ?
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Inscription</span>
              <span className="font-medium text-primary">+5 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Email vérifié</span>
              <span className="font-medium text-primary">+5 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Identité vérifiée</span>
              <span className="font-medium text-primary">+5 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Téléphone vérifié</span>
              <span className="font-medium text-primary">+5 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Chaque voyage complété</span>
              <span className="font-medium text-primary">+2 pts</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default MyRewards;
