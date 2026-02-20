import React from "react";
import { Difficulty } from "@/types/quiz";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Flame, Timer, TimerOff } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface QuizSetupProps {
  onStart: (count: number, difficulty: Difficulty, timeLimit: number | null) => void;
  isLoading: boolean;
}

const QuizSetup: React.FC<QuizSetupProps> = ({ onStart, isLoading }) => {
  const { t } = useLanguage();
  const [count, setCount] = React.useState(20);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");
  const [timeLimit, setTimeLimit] = React.useState<number | null>(null);

  const counts = [10, 20, 30];
  const difficulties: { value: Difficulty; label: string; icon: React.ReactNode }[] = [
    { value: "easy", label: t.easy, icon: <Brain className="w-4 h-4" /> },
    { value: "medium", label: t.medium, icon: <Zap className="w-4 h-4" /> },
    { value: "hard", label: t.hard, icon: <Flame className="w-4 h-4" /> },
  ];
  const timeLimits: { value: number | null; label: string }[] = [
    { value: null, label: t.noLimit },
    { value: 5, label: "5 min" },
    { value: 10, label: "10 min" },
    { value: 20, label: "20 min" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h3 className="text-foreground font-semibold text-lg mb-3">{t.numberOfQuestions}</h3>
        <div className="flex gap-3">
          {counts.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
                count === c
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-foreground font-semibold text-lg mb-3">{t.difficulty}</h3>
        <div className="flex gap-3">
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                difficulty === d.value
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {d.icon}
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-foreground font-semibold text-lg mb-3 flex items-center gap-2">
          <Timer className="w-5 h-5" />
          {t.timeLimit}
        </h3>
        <div className="flex gap-3">
          {timeLimits.map((tl) => (
            <button
              key={tl.label}
              onClick={() => setTimeLimit(tl.value)}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                timeLimit === tl.value
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tl.value === null && <TimerOff className="w-4 h-4" />}
              {tl.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onStart(count, difficulty, timeLimit)}
        disabled={isLoading}
        className="w-full py-6 text-lg font-bold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity glow-primary animate-pulse-glow"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            {t.generatingQuiz}
          </span>
        ) : (
          t.generateQuiz
        )}
      </Button>
    </div>
  );
};

export default QuizSetup;
