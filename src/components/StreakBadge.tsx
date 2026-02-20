import React, { useMemo } from "react";
import { Flame, Award, Star, Zap, Crown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface StreakBadgeProps {
  quizDates: string[];
}

const milestones = [
  { days: 3, labelKey: "3-Day Streak", icon: Zap, color: "text-warning" },
  { days: 7, labelKey: "7-Day Streak", icon: Star, color: "text-primary" },
  { days: 14, labelKey: "14-Day Streak", icon: Award, color: "text-accent" },
  { days: 30, labelKey: "30-Day Streak", icon: Crown, color: "text-warning" },
];

const StreakBadge: React.FC<StreakBadgeProps> = ({ quizDates }) => {
  const { t } = useLanguage();

  const streak = useMemo(() => {
    if (quizDates.length === 0) return 0;
    const uniqueDays = new Set(
      quizDates.map((d) => new Date(d).toISOString().slice(0, 10))
    );
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sortedDays[0] !== today && sortedDays[0] !== yesterday) return 0;
    let count = 1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const curr = new Date(sortedDays[i]).getTime();
      const next = new Date(sortedDays[i + 1]).getTime();
      if (curr - next === 86400000) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [quizDates]);

  const earnedBadges = milestones.filter((m) => streak >= m.days);

  if (streak === 0) return null;

  return (
    <div className="gradient-card rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-warning" />
          <h3 className="text-foreground font-semibold text-sm">{t.currentStreak}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-warning" />
          <span className="text-warning text-xl font-black">{streak}</span>
          <span className="text-muted-foreground text-xs">{streak > 1 ? t.days : t.day}</span>
        </div>
      </div>

      {earnedBadges.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {earnedBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.days}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm"
              >
                <Icon className={`w-3.5 h-3.5 ${badge.color}`} />
                <span className="text-foreground font-medium text-xs">{t.streakLabels[badge.labelKey] || badge.labelKey}</span>
              </div>
            );
          })}
        </div>
      )}

      {streak < 30 && (
        <div className="mt-3">
          {(() => {
            const next = milestones.find((m) => m.days > streak);
            if (!next) return null;
            const remaining = next.days - streak;
            const progress = (streak / next.days) * 100;
            const nextLabel = t.streakLabels[next.labelKey] || next.labelKey;
            return (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t.daysTo(remaining, nextLabel)}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default StreakBadge;
