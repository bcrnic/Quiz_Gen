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

const buildDeterministicOrder = (seedSource: string, length: number) => {
  const arr = Array.from({ length }, (_, i) => i);
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

const QuizView: React.FC<QuizViewProps> = ({ questions, onComplete, timeLimit }) => {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>(() =>
    questions.map((q) => {
      if (q.type === "mcq") return { type: "mcq", answer: null };
      if (q.type === "yesno") {
        const len = Array.isArray(q.statements) ? q.statements.length : 0;
        return { type: "yesno", answers: Array(len).fill(null) };
      }
      const len = Array.isArray(q.pairs) ? q.pairs.length : 0;
      return { type: "matching", matches: Array(len).fill(null) };
    }),
  );
  const [selected, setSelected] = useState<McqOptionKey | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
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

  useEffect(() => {
    setCurrent(0);
    setSelected(null);
    setSelectedRight(null);
    setRevealed(false);
    setCorrectCount(0);
    setTimeLeft(timeLimit ? timeLimit * 60 : null);
    setAnswers(
      questions.map((q) => {
        if (q.type === "mcq") return { type: "mcq", answer: null };
        if (q.type === "yesno") {
          const len = Array.isArray(q.statements) ? q.statements.length : 0;
          return { type: "yesno", answers: Array(len).fill(null) };
        }
        const len = Array.isArray(q.pairs) ? q.pairs.length : 0;
        return { type: "matching", matches: Array(len).fill(null) };
      }),
    );
  }, [questions, timeLimit]);

  const q = questions[current];
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  const markAndReveal = (isCorrect: boolean) => {
    setRevealed(true);
    if (isCorrect) setCorrectCount((c) => c + 1);
  };

  const handleSelectMcq = useCallback((option: McqOptionKey) => {
    if (revealed || !q || q.type !== "mcq") return;
    setSelected(option);
    const newAnswers = [...answers];
    newAnswers[current] = { type: "mcq", answer: option };
    setAnswers(newAnswers);
    markAndReveal(option === q.correctAnswer);
  }, [answers, current, q, revealed]);

  const handleYesNo = (idx: number, value: "Yes" | "No") => {
    if (revealed || !q || q.type !== "yesno") return;
    const currentAnswer = answers[current];
    if (currentAnswer.type !== "yesno") return;
    const next = [...currentAnswer.answers];
    next[idx] = value;
    const newAnswers = [...answers];
    newAnswers[current] = { type: "yesno", answers: next };
    setAnswers(newAnswers);
  };

  const handleMatch = (leftIdx: number, rightIdx: number | null) => {
    if (revealed || !q || q.type !== "matching") return;
    const currentAnswer = answers[current];
    if (currentAnswer.type !== "matching") return;
    const next = [...currentAnswer.matches];
    if (rightIdx !== null) {
      for (let i = 0; i < next.length; i++) {
        if (i !== leftIdx && next[i] === rightIdx) {
          next[i] = null;
        }
      }
    }
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
    setSelectedRight(null);
    setRevealed(false);
  }, [answers, current, onComplete, questions.length]);

  useEffect(() => {
    setSelectedRight(null);
  }, [current]);

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
  const currentAnswer = answers[current];
  const nonMcqComplete = (() => {
    if (q.type === "yesno") {
      return currentAnswer.type === "yesno" && !currentAnswer.answers.some((x) => x === null);
    }
    if (q.type === "matching") {
      return currentAnswer.type === "matching" && !currentAnswer.matches.some((x) => x === null);
    }
    return false;
  })();

  const matchingOrder = q.type === "matching" ? buildDeterministicOrder(q.id, q.pairs.length) : [];
  const matchingAnswer = q.type === "matching" && currentAnswer.type === "matching" ? currentAnswer : null;
  const matchingRemaining = matchingAnswer ? matchingAnswer.matches.filter((x) => x === null).length : 0;
  const matchingRightAssignedTo = (() => {
    const m = new Map<number, number>();
    if (!matchingAnswer) return m;
    matchingAnswer.matches.forEach((rightIdx, leftIdx) => {
      if (rightIdx !== null) m.set(rightIdx, leftIdx);
    });
    return m;
  })();

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
        <div className="mb-6 space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-3 text-sm text-muted-foreground flex items-center justify-between gap-2">
            <span>
              {selectedRight === null
                ? "Pick an option on the right, then tap a statement on the left."
                : "Tap a statement on the left to assign the selected option."}
            </span>
            <span className="font-semibold text-foreground">{matchingRemaining}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {q.pairs.map((p, leftIdx) => {
                const picked = matchingAnswer ? matchingAnswer.matches[leftIdx] : null;
                const canAssign = !revealed && selectedRight !== null;
                return (
                  <button
                    key={leftIdx}
                    type="button"
                    onClick={() => {
                      if (!canAssign || selectedRight === null) return;
                      handleMatch(leftIdx, selectedRight);
                      setSelectedRight(null);
                    }}
                    className={`w-full text-left gradient-card rounded-xl p-4 border transition-colors ${
                      canAssign ? "border-primary/50 hover:border-primary" : "border-border"
                    }`}
                  >
                    <div className="text-foreground font-semibold mb-2 break-words">{p.left}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-sm ${picked === null ? "text-muted-foreground" : "text-foreground"}`}>
                        {picked === null ? "Not matched yet" : q.pairs[picked].right}
                      </div>
                      {picked !== null && !revealed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMatch(leftIdx, null);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {matchingOrder.map((rightIdx) => {
                const assignedLeftIdx = matchingRightAssignedTo.get(rightIdx);
                const isSelected = selectedRight === rightIdx;
                return (
                  <button
                    key={rightIdx}
                    type="button"
                    disabled={revealed}
                    onClick={() => setSelectedRight(rightIdx)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : assignedLeftIdx !== undefined
                        ? "border-success/40 bg-success/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="text-foreground font-medium break-words">{q.pairs[rightIdx].right}</div>
                    {assignedLeftIdx !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">Assigned</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!revealed && matchingAnswer && (
            <button
              type="button"
              onClick={() => {
                for (let i = 0; i < q.pairs.length; i++) handleMatch(i, null);
                setSelectedRight(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset matches
            </button>
          )}
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
          disabled={!nonMcqComplete}
          className="w-full py-4 rounded-xl font-bold text-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:hover:bg-secondary"
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
