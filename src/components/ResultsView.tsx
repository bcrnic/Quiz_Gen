import React from "react";
import { QuizAnswer, QuizQuestion } from "@/types/quiz";
import { Trophy, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Download, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import confetti from "canvas-confetti";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Json } from "@/integrations/supabase/types";

interface ResultsViewProps {
  questions: QuizQuestion[];
  userAnswers: QuizAnswer[];
  fileName: string;
  onNewQuiz: () => void;
  onUploadNew: () => void;
  onRetryWrong?: (wrongQuestions: QuizQuestion[]) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  questions, userAnswers, fileName, onNewQuiz, onUploadNew, onRetryWrong,
}) => {
  const { t } = useLanguage();
  const [showReview, setShowReview] = React.useState(false);
  const { user } = useAuth();
  const savedRef = React.useRef(false);
  const correct = questions.filter((q, i) => {
    const a = userAnswers[i];
    if (!a) return false;
    if (q.type === "mcq") return a.type === "mcq" && a.answer === q.correctAnswer;
    if (q.type === "yesno") return a.type === "yesno" && a.answers.every((v, idx) => v === q.correct[idx]);
    if (q.type === "matching") return a.type === "matching" && a.matches.every((v, idx) => v === idx);
    return false;
  }).length;
  const score = Math.round((correct / questions.length) * 100);

  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreGlow = () => {
    if (score >= 80) return "glow-success";
    if (score >= 50) return "";
    return "glow-error";
  };

  React.useEffect(() => {
    if (score >= 70) {
      const duration = score >= 90 ? 3000 : 1500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#22c55e", "#10b981", "#34d399"] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#22c55e", "#10b981", "#34d399"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [score]);

  React.useEffect(() => {
    if (!user) return;
    if (savedRef.current) return;

    const signatureRaw = JSON.stringify({
      u: user.id,
      f: fileName,
      q: questions.map((q) => q.id),
      s: score,
      c: correct,
    });
    const signature = Array.from(signatureRaw).reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
    const idempotencyKey = `quiz_result_saved_${signature}`;
    if (sessionStorage.getItem(idempotencyKey) === "1") {
      savedRef.current = true;
      return;
    }
    sessionStorage.setItem(idempotencyKey, "1");
    savedRef.current = true;

    const saveResult = async () => {
      const { error } = await supabase.from("quiz_results").insert({
        user_id: user.id,
        file_name: fileName,
        total_questions: questions.length,
        correct_answers: correct,
        score,
        questions: questions as unknown as Json,
        user_answers: userAnswers as unknown as Json,
      });
      if (error) {
        console.error("Failed to save result:", error);
        toast.error(t.failedSaveResult);
        sessionStorage.removeItem(idempotencyKey);
        savedRef.current = false;
        return;
      }
    };
    saveResult();
  }, [user, fileName, questions, userAnswers, correct, score, t.failedSaveResult]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(t.pdfTitle, margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`${t.pdfFile}: ${fileName}  |  ${t.pdfDate}: ${new Date().toLocaleDateString()}`, margin, y);
    y += 12;

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(score >= 80 ? 34 : score >= 50 ? 200 : 220, score >= 80 ? 160 : score >= 50 ? 150 : 50, score >= 80 ? 100 : score >= 50 ? 0 : 50);
    doc.text(`${score}%`, margin, y);
    doc.setFontSize(14);
    doc.setTextColor(80);
    doc.text(`  (${correct}/${questions.length} ${t.correct})`, margin + 30, y);
    y += 16;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    questions.forEach((q, i) => {
      checkPage(45);
      const isCorrect = (() => {
        const a = userAnswers[i];
        if (!a) return false;
        if (q.type === "mcq") return a.type === "mcq" && a.answer === q.correctAnswer;
        if (q.type === "yesno") return a.type === "yesno" && a.answers.every((v, idx) => v === q.correct[idx]);
        if (q.type === "matching") return a.type === "matching" && a.matches.every((v, idx) => v === idx);
        return false;
      })();

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isCorrect ? 34 : 220, isCorrect ? 160 : 50, isCorrect ? 100 : 50);
      doc.text(isCorrect ? "✓" : "✗", margin, y);

      doc.setTextColor(40);
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, pageWidth - margin * 2 - 10);
      doc.text(qLines, margin + 8, y);
      y += qLines.length * 5 + 3;

      if (q.type === "mcq") {
        (["A", "B", "C", "D"] as const).forEach((key) => {
          checkPage(8);
          const isAnswer = key === q.correctAnswer;
          const isUserPick = userAnswers[i]?.type === "mcq" ? key === userAnswers[i].answer : false;

          doc.setFont("helvetica", isAnswer ? "bold" : "normal");
          doc.setFontSize(10);

          if (isAnswer) {
            doc.setTextColor(34, 160, 100);
          } else if (isUserPick) {
            doc.setTextColor(220, 50, 50);
          } else {
            doc.setTextColor(120);
          }

          const optText = `${key}) ${q.options[key]}${isAnswer ? " ✓" : ""}${isUserPick && !isAnswer ? ` ${t.pdfYourAnswer}` : ""}`;
          const optLines = doc.splitTextToSize(optText, pageWidth - margin * 2 - 15);
          doc.text(optLines, margin + 12, y);
          y += optLines.length * 5 + 1;
        });
      }

      if (q.type === "yesno") {
        const a = userAnswers[i];
        q.statements.forEach((s, idx) => {
          checkPage(10);
          doc.setTextColor(40);
          const line = `- ${s} (correct: ${q.correct[idx]}) (yours: ${a?.type === "yesno" ? a.answers?.[idx] ?? "" : ""})`;
          const lns = doc.splitTextToSize(line, pageWidth - margin * 2);
          doc.text(lns, margin + 8, y);
          y += lns.length * 5 + 1;
        });
      }

      if (q.type === "matching") {
        const a = userAnswers[i];
        q.pairs.forEach((p, idx) => {
          checkPage(10);
          const yours = a?.type === "matching" && a.matches?.[idx] !== null && a.matches?.[idx] !== undefined
            ? q.pairs[a.matches[idx]]?.right
            : "";
          const line = `- ${p.left} => ${p.right} (yours: ${yours})`;
          const lns = doc.splitTextToSize(line, pageWidth - margin * 2);
          doc.text(lns, margin + 8, y);
          y += lns.length * 5 + 1;
        });
      }

      y += 6;
    });

    doc.save(`quizgen-${fileName.replace(".txt", "")}-${score}pct.pdf`);
  };

  const wrongCount = questions.length - correct;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className={`gradient-card rounded-2xl p-8 border border-border text-center mb-8 ${getScoreGlow()}`}>
        <Trophy className={`w-12 h-12 mx-auto mb-4 ${getScoreColor()}`} />
        <div className={`text-6xl font-black mb-2 ${getScoreColor()}`}>
          {score}%
        </div>
        <p className="text-foreground text-xl font-semibold mb-1">
          {correct}/{questions.length} {t.correctAnswers}
        </p>
        <p className="text-muted-foreground text-sm">{fileName}</p>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={onNewQuiz}
          className="flex-1 py-4 rounded-xl font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t.newQuiz}
        </button>
        <button
          onClick={onUploadNew}
          className="flex-1 py-4 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          {t.uploadNewFile}
        </button>
      </div>

      {onRetryWrong && correct < questions.length && (
        <button
          onClick={() => {
            const wrong = questions.filter((q, i) => {
              const a = userAnswers[i];
              if (!a) return true;
              if (q.type === "mcq") return !(a.type === "mcq" && a.answer === q.correctAnswer);
              if (q.type === "yesno") return !(a.type === "yesno" && a.answers.every((v, idx) => v === q.correct[idx]));
              if (q.type === "matching") return !(a.type === "matching" && a.matches.every((v, idx) => v === idx));
              return true;
            });
            onRetryWrong(wrong);
          }}
          className="w-full py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors mb-4"
        >
          <XCircle className="w-4 h-4" />
          {t.retryWrong(wrongCount)}
        </button>
      )}

      <button
        onClick={exportPDF}
        className="w-full py-3 rounded-xl bg-card border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-card/80 transition-colors mb-4"
      >
        <Download className="w-4 h-4" />
        {t.exportPdf}
      </button>

      <button
        onClick={() => setShowReview(!showReview)}
        className="w-full py-3 rounded-xl bg-card border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-card/80 transition-colors mb-4"
      >
        {t.reviewAnswers}
        {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showReview && (
        <div className="space-y-4 animate-fade-in">
          {questions.map((q, i) => {
            const a = userAnswers[i];
            const isCorrect = (() => {
              if (!a) return false;
              if (q.type === "mcq") return a.type === "mcq" && a.answer === q.correctAnswer;
              if (q.type === "yesno") return a.type === "yesno" && a.answers.every((v, idx) => v === q.correct[idx]);
              if (q.type === "matching") return a.type === "matching" && a.matches.every((v, idx) => v === idx);
              return false;
            })();
            return (
              <div key={i} className="gradient-card rounded-xl p-5 border border-border">
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <p className="text-foreground font-semibold text-sm leading-relaxed">
                    {i + 1}. {q.question}
                  </p>
                </div>
                <div className="ml-8 space-y-1">
                  {q.type === "mcq" && (["A", "B", "C", "D"] as const).map((key) => {
                    const isAnswer = key === q.correctAnswer;
                    const isUserPick = a?.type === "mcq" ? key === a.answer : false;
                    return (
                      <div
                        key={key}
                        className={`text-sm px-3 py-1.5 rounded-md ${
                          isAnswer
                            ? "bg-success/10 text-success font-medium"
                            : isUserPick
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {key}) {q.options[key]}
                      </div>
                    );
                  })}

                  {q.type === "yesno" && (
                    <div className="space-y-2">
                      {q.statements.map((s, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="text-muted-foreground">{s}</div>
                          <div className="text-foreground">
                            correct: <span className="text-success font-medium">{q.correct[idx]}</span> / yours: <span className={a?.type === "yesno" && a.answers?.[idx] === q.correct[idx] ? "text-success" : "text-destructive"}>{a?.type === "yesno" ? a.answers?.[idx] ?? "" : ""}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "matching" && (
                    <div className="space-y-2">
                      {q.pairs.map((p, idx) => {
                        const yoursIdx = a?.type === "matching" ? a.matches?.[idx] : null;
                        const yours = typeof yoursIdx === "number" ? q.pairs[yoursIdx]?.right : "";
                        return (
                          <div key={idx} className="text-sm">
                            <div className="text-muted-foreground">{p.left}</div>
                            <div className="text-foreground">
                              correct: <span className="text-success font-medium">{p.right}</span> / yours: <span className={yours === p.right ? "text-success" : "text-destructive"}>{yours}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {q.explanation && (
                  <div className="ml-8 mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 flex gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResultsView;
