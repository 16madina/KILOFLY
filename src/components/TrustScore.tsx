import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrustScoreProps {
  score: number;
  className?: string;
}

export const TrustScore = ({ score, className }: TrustScoreProps) => {
  const getTrustLevel = (score: number) => {
    if (score >= 80) return { level: "Platine", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "🏆" };
    if (score >= 60) return { level: "Or", color: "bg-gradient-to-r from-yellow-400 to-yellow-600", icon: "⭐" };
    if (score >= 40) return { level: "Argent", color: "bg-gradient-to-r from-gray-300 to-gray-400", icon: "🥈" };
    return { level: "Bronze", color: "bg-gradient-to-r from-orange-400 to-orange-600", icon: "🥉" };
  };

  const trust = getTrustLevel(score);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${trust.color} text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 hover:scale-105`}>
        <Shield className="w-4 h-4" />
        <span>{trust.icon} {trust.level}</span>
      </div>
      <span className="text-xs text-muted-foreground">{score} pts</span>
    </div>
  );
};
