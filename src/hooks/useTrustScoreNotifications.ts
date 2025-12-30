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

const NOTIFICATION_STORAGE_KEY = 'kilofly_trust_score_notified';

export const useTrustScoreNotifications = (currentScore: number) => {
  const previousScore = useRef<number | null>(null);
  const previousLevel = useRef<string | null>(null);
  const hasShownInitialToast = useRef(false);

  useEffect(() => {
    // Check localStorage to see if we've already shown the initial notification
    const alreadyNotified = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    
    if (previousScore.current === null) {
      previousScore.current = currentScore;
      const level = getTrustLevel(currentScore);
      previousLevel.current = level?.level || null;
      hasShownInitialToast.current = !!alreadyNotified;
      return;
    }

    const scoreDiff = currentScore - previousScore.current;
    const currentLevel = getTrustLevel(currentScore);
    const oldLevel = previousLevel.current;

    // Only show notifications for actual score changes (not initial load)
    if (scoreDiff === 0) {
      previousScore.current = currentScore;
      previousLevel.current = currentLevel?.level || null;
      return;
    }

    // Notification de changement de niveau avec récompense
    if (currentLevel && oldLevel !== currentLevel.level && scoreDiff > 0) {
      // Level changes are always important, show them
      toast.success(
        `${currentLevel.icon} Félicitations ! Niveau ${currentLevel.level} atteint !`,
        {
          description: `🎁 Récompense débloquée : ${currentLevel.reward}`,
          duration: 6000,
        }
      );
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
    }
    // Only show point gain/loss notifications if there's a real change from user actions
    else if (scoreDiff > 0 && scoreDiff >= 5) {
      // Higher threshold to avoid spam
      toast.success(
        "✨ Points de confiance gagnés !",
        {
          description: `+${scoreDiff} points ! Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
    }
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
    previousLevel.current = currentLevel?.level || null;
  }, [currentScore]);
};
