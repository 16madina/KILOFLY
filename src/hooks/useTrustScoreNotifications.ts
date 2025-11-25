import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface TrustScoreLevel {
  level: string;
  minScore: number;
  icon: string;
}

const trustLevels: TrustScoreLevel[] = [
  { level: "Platine", minScore: 80, icon: "🏆" },
  { level: "Or", minScore: 60, icon: "⭐" },
  { level: "Argent", minScore: 40, icon: "🥈" },
  { level: "Bronze", minScore: 0, icon: "🥉" },
];

const getTrustLevel = (score: number): TrustScoreLevel => {
  return trustLevels.find(level => score >= level.minScore) || trustLevels[trustLevels.length - 1];
};

export const useTrustScoreNotifications = (currentScore: number) => {
  const previousScore = useRef<number | null>(null);
  const previousLevel = useRef<string | null>(null);

  useEffect(() => {
    if (previousScore.current === null) {
      previousScore.current = currentScore;
      previousLevel.current = getTrustLevel(currentScore).level;
      return;
    }

    const scoreDiff = currentScore - previousScore.current;
    const currentLevel = getTrustLevel(currentScore);
    const oldLevel = previousLevel.current;

    // Notification de changement de niveau
    if (oldLevel !== currentLevel.level && scoreDiff > 0) {
      toast.success(
        `${currentLevel.icon} Nouveau niveau atteint !`,
        {
          description: `Vous êtes maintenant au niveau ${currentLevel.level} avec ${currentScore} points de confiance.`,
          duration: 5000,
        }
      );
    }
    // Notification de gain de points (si pas de changement de niveau)
    else if (scoreDiff > 0 && scoreDiff >= 5) {
      toast.success(
        "✨ Points de confiance gagnés !",
        {
          description: `+${scoreDiff} points ! Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
    }
    // Notification de perte de points
    else if (scoreDiff < 0 && Math.abs(scoreDiff) >= 5) {
      toast.error(
        "Points de confiance perdus",
        {
          description: `${scoreDiff} points. Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
    }

    previousScore.current = currentScore;
    previousLevel.current = currentLevel.level;
  }, [currentScore]);
};
