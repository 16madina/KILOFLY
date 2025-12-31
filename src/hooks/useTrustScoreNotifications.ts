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

const LAST_NOTIFIED_SCORE_KEY = 'kilofly_last_notified_score';

export const useTrustScoreNotifications = (currentScore: number) => {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Skip first render to avoid showing notification on page load
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Store current score as baseline
      localStorage.setItem(LAST_NOTIFIED_SCORE_KEY, currentScore.toString());
      return;
    }

    const lastNotifiedScore = parseInt(localStorage.getItem(LAST_NOTIFIED_SCORE_KEY) || '0', 10);
    
    // Only show notification if score actually increased since last notification
    if (currentScore <= lastNotifiedScore) {
      return;
    }

    const scoreDiff = currentScore - lastNotifiedScore;
    const currentLevel = getTrustLevel(currentScore);
    const previousLevel = getTrustLevel(lastNotifiedScore);

    // Check if user reached a new level
    if (currentLevel && (!previousLevel || currentLevel.level !== previousLevel.level)) {
      toast.success(
        `${currentLevel.icon} Félicitations ! Niveau ${currentLevel.level} atteint !`,
        {
          description: `🎁 Récompense débloquée : ${currentLevel.reward}`,
          duration: 6000,
        }
      );
      localStorage.setItem(LAST_NOTIFIED_SCORE_KEY, currentScore.toString());
    }
    // Only notify for significant point gains (5+ points) without level change
    else if (scoreDiff >= 5) {
      toast.success(
        "✨ Points de confiance gagnés !",
        {
          description: `+${scoreDiff} points ! Vous avez maintenant ${currentScore} points.`,
          duration: 4000,
        }
      );
      localStorage.setItem(LAST_NOTIFIED_SCORE_KEY, currentScore.toString());
    }
  }, [currentScore]);
};
