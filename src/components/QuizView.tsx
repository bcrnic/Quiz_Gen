import React, { useState, useEffect, useCallback } from "react";
import { McqOptionKey, QuizAnswer, QuizQuestion } from "@/types/quiz";
import { CheckCircle2, XCircle, Timer, Lightbulb } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface QuizViewProps {
  questions: QuizQuestion[];
  onComplete: (answers: QuizAnswer[]) => void;
  timeLimit: number | null;
}

const optionKeys = ["A", "B", "C", "D"] as const;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const QuizView: React.FC<QuizViewProps> = ({ questions, onComplete, timeLimit }) => {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>(() =>
    questions.map((q) => {
      if (q.type === "mcq") return { type: "mcq", answer: null };
      if (q.type === "yesno") return { type: "yesno", answers: Array(q.statements.length).fill(null) };
      return { type: "matching", matches: Array(q.pairs.length).fill(null) };
    }),
  );
  const [selected, setSelected] = useState<McqOptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit ? timeLimit * 60 : null);

  const finishQuiz = useCallback(() => {
    onComplete(answers);
  }, [answers, onComplete]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      finishQuiz();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, finishQuiz]);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const markAndReveal = (isCorrect: boolean) => {
    setRevealed(true);
    if (isCorrect) setCorrectCount((c) => c + 1);
  };

  const handleSelectMcq = useCallback((option: McqOptionKey) => {
    if (revealed || q.type !== "mcq") return;
    setSelected(option);
    const newAnswers = [...answers];
    newAnswers[current] = { type: "mcq", answer: option };
    setAnswers(newAnswers);
    markAndReveal(option === q.correctAnswer);
  }, [answers, current, q, revealed]);

  const handleYesNo = (idx: number, value: "Yes" | "No") => {
    if (revealed || q.type !== "yesno") return;
    const currentAnswer = answers[current];
    if (currentAnswer.type !== "yesno") return;
    const next = [...currentAnswer.answers];
    next[idx] = value;
    const newAnswers = [...answers];
    newAnswers[current] = { type: "yesno", answers: next };
    setAnswers(newAnswers);
  };

  const handleMatch = (leftIdx: number, rightIdx: number | null) => {
    if (revealed || q.type !== "matching") return;
    const currentAnswer = answers[current];
    if (currentAnswer.type !== "matching") return;
    const next = [...currentAnswer.matches];
    next[leftIdx] = rightIdx;
    const newAnswers = [...answers];
    newAnswers[current] = { type: "matching", matches: next };
    setAnswers(newAnswers);
  };

  const handleNext = useCallback(() => {
    if (current === questions.length - 1) {
      onComplete(answers);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setRevealed(false);
  }, [answers, current, onComplete, questions.length]);

  const revealNonMcqIfComplete = () => {
    if (revealed) return;
    if (q.type === "yesno") {
      const a = answers[current];
      if (a.type !== "yesno") return;
      if (a.answers.some((x) => x === null)) return;
      const ok = a.answers.every((v, i) => v === q.correct[i]);
      markAndReveal(ok);
    }
    if (q.type === "matching") {
      const a = answers[current];
      if (a.type !== "matching") return;
      if (a.matches.some((x) => x === null)) return;
      const ok = a.matches.every((v, i) => v === i);
      markAndReveal(ok);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && revealed) {
        handleNext();
      } else if (!revealed && q.type === "mcq") {
        const keyMap: Record<string, McqOptionKey> = { "1": "A", "2": "B", "3": "C", "4": "D", a: "A", b: "B", c: "C", d: "D" };
        const mapped = keyMap[e.key.toLowerCase()];
        if (mapped) handleSelectMcq(mapped);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNext, handleSelectMcq, q.type, revealed]);

  const getOptionStyle = (key: McqOptionKey) => {
    if (!revealed) {
      return selected === key
        ? "border-primary bg-primary/10"
        : "border-border bg-card hover:border-primary/50 hover:bg-card/80";
    }
    if (q.type !== "mcq") return "border-border bg-card";
    if (key === q.correctAnswer) return "border-success bg-success/10 glow-success";
    if (key === selected && key !== q.correctAnswer) return "border-destructive bg-destructive/10 glow-error";
    return "border-border bg-card opacity-50";
  };

  const timerUrgent = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t.question} {current + 1}/{questions.length}
          </span>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <span className={`text-sm font-semibold flex items-center gap-1 ${timerUrgent ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
                <Timer className="w-4 h-4" />
                {formatTime(timeLeft)}
              </span>
            )}
            <span className="text-primary text-sm font-semibold">
              {correctCount}/{current + (revealed ? 1 : 0)} {t.correct}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="gradient-card rounded-xl p-6 border border-border mb-6">
        <h2 className="text-foreground text-xl font-bold leading-relaxed">{q.question}</h2>
      </div>

      {q.type === "mcq" && (
        <div className="space-y-3 mb-6">
          {optionKeys.map((key) => (
            <button
              key={key}
              onClick={() => handleSelectMcq(key)}
              disabled={revealed}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${getOptionStyle(key)}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                revealed && key === q.correctAnswer
                  ? "bg-success text-success-foreground"
                  : revealed && key === selected
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {key}
              </span>
              <span className="text-foreground font-medium flex-1">{q.options[key]}</span>
              {revealed && key === q.correctAnswer && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              {revealed && key === selected && key !== q.correctAnswer && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {q.type === "yesno" && (
        <div className="space-y-4 mb-6">
          {q.statements.map((s, idx) => {
            const a = answers[current];
            const picked = a.type === "yesno" ? a.answers[idx] : null;
            const correct = revealed ? q.correct[idx] : null;
            return (
              <div key={idx} className="gradient-card rounded-xl p-5 border border-border">
                <p className="text-foreground font-medium mb-3">{s}</p>
                <div className="flex gap-3">
                  {(["Yes", "No"] as const).map((v) => {
                    const isPicked = picked === v;
                    const isCorrect = correct === v;
                    const style = !revealed
                      ? isPicked
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
                      : isCorrect
                      ? "border-success bg-success/10"
                      : isPicked
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-card opacity-50";
                    return (
                      <button
                        key={v}
                        onClick={() => handleYesNo(idx, v)}
                        disabled={revealed}
                        className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all ${style}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "matching" && (
        <div className="space-y-3 mb-6">
          {q.pairs.map((p, leftIdx) => {
            const a = answers[current];
            const picked = a.type === "matching" ? a.matches[leftIdx] : null;
            return (
              <div key={leftIdx} className="gradient-card rounded-xl p-5 border border-border flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="text-foreground font-semibold flex-1 min-w-0 break-words">{p.left}</div>
                <select
                  className="bg-card border border-border rounded-lg px-3 py-2 text-foreground w-full sm:w-96 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                  disabled={revealed}
                  value={picked === null ? "" : String(picked)}
                  onChange={(e) => handleMatch(leftIdx, e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="">Select...</option>
                  {q.pairs.map((pp, idx) => (
                    <option key={idx} value={idx}>
                      {pp.right}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {revealed && q.explanation && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3 animate-fade-in">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-foreground text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {!revealed && q.type !== "mcq" && (
        <button
          onClick={revealNonMcqIfComplete}
          className="w-full py-4 rounded-xl font-bold text-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          {t.nextQuestion}
        </button>
      )}

      {revealed && (
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl font-bold text-lg gradient-primary text-primary-foreground hover:opacity-90 transition-all duration-200 animate-fade-in"
        >
          {current === questions.length - 1 ? t.seeResults : t.nextQuestion}
        </button>
      )}
    </div>
  );
};

export default QuizView;
