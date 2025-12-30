import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface TrustScoreLevel {
  level: string;
  minScore: number;
  icon: string;
  reward: string;
}

const trustLevels: TrustScoreLevel[] = [
  { level: "Platine", minScore: 90, icon: "🏆", reward: "Accès prioritaire aux nouvelles fonctionnalités + Badge exclusif" },
  { level: "Or", minScore: 70, icon: "⭐", reward: "Réduction de 5% sur les frais de service" },
  { level: "Argent", minScore: 50, icon: "🥈", reward: "Badge visible sur toutes vos annonces" },
  { level: "Bronze", minScore: 15, icon: "🥉", reward: "Mise en avant de votre profil" },
];

const getTrustLevel = (score: number): TrustScoreLevel | null => {
  return trustLevels.find(level => score >= level.minScore) || null;
};

export const useTrustScoreNotifications = (currentScore: number) => {
  const previousScore = useRef<number | null>(null);
  const previousLevel = useRef<string | null>(null);

  useEffect(() => {
    if (previousScore.current === null) {
      previousScore.current = currentScore;
      const level = getTrustLevel(currentScore);
      previousLevel.current = level?.level || null;
      return;
    }

    const scoreDiff = currentScore - previousScore.current;
    const currentLevel = getTrustLevel(currentScore);
    const oldLevel = previousLevel.current;

    // Notification de changement de niveau avec récompense
    if (currentLevel && oldLevel !== currentLevel.level && scoreDiff > 0) {
      toast.success(
        `${currentLevel.icon} Félicitations ! Niveau ${currentLevel.level} atteint !`,
        {
          description: `🎁 Récompense débloquée : ${currentLevel.reward}`,
          duration: 6000,
        }
      );
    }
    // Notification de gain de points (si pas de changement de niveau)
    else if (scoreDiff > 0 && scoreDiff >= 2) {
      toast.success(
        "✨ Points de confiance gagnés !",
        {
          description: `+${scoreDiff} points ! Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
    }
    // Notification de perte de points
    else if (scoreDiff < 0 && Math.abs(scoreDiff) >= 2) {
      toast.error(
        "Points de confiance perdus",
        {
          description: `${scoreDiff} points. Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
    }

    previousScore.current = currentScore;
    previousLevel.current = currentLevel?.level || null;
  }, [currentScore]);
};
