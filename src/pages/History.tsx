import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Trash2, Clock, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import StreakBadge from "@/components/StreakBadge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

interface QuizResult {
  id: string;
  created_at: string;
  file_name: string;
  total_questions: number;
  correct_answers: number;
  score: number;
}

const History = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      const { data, error } = await supabase
        .from("quiz_results")
        .select("id, created_at, file_name, total_questions, correct_answers, score")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error(t.failedLoadHistory);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };
    fetchResults();
  }, [authLoading, user, t.failedLoadHistory]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearHistory = async () => {
    const { error } = await supabase.from("quiz_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error(t.failedClearHistory);
    } else {
      setResults([]);
    }
    setShowClearConfirm(false);
  };

  const deleteResult = async (id: string) => {
    const { error } = await supabase.from("quiz_results").delete().eq("id", id);
    if (error) {
      toast.error(t.failedDeleteResult);
    } else {
      setResults((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const chartData = useMemo(() => {
    if (results.length < 2) return [];
    return [...results]
      .reverse()
      .map((r) => ({
        date: new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        score: Number(r.score),
      }));
  }, [results]);

  const avgScore = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length);
  }, [results]);

  const totalQuizzes = results.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-8 sm:w-28" />
          <div className="text-center">
            <h1 className="text-foreground font-bold text-xl tracking-tight">{t.appName}</h1>
            <p className="text-muted-foreground text-xs hidden sm:block">{t.quizHistory}</p>
          </div>
          <div className="flex items-center justify-end">
            <Link
              to="/"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t.back}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">{t.pastResults}</h2>
          {results.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearAll}
            </button>
          )}
        </div>

        {!loading && results.length > 0 && (
          <div className="mb-6">
            <StreakBadge quizDates={results.map((r) => r.created_at)} />
          </div>
        )}

        {showClearConfirm && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
            <p className="text-foreground font-medium text-sm mb-3">{t.clearConfirm}</p>
            <div className="flex gap-2">
              <button
                onClick={clearHistory}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t.yesDeleteAll}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}

        {!loading && results.length >= 2 && (
          <div className="mb-8 space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="flex-1 gradient-card rounded-xl border border-border p-4 text-center">
                <p className="text-muted-foreground text-xs mb-1">{t.totalQuizzes}</p>
                <p className="text-foreground text-2xl font-black">{totalQuizzes}</p>
              </div>
              <div className="flex-1 gradient-card rounded-xl border border-border p-4 text-center">
                <p className="text-muted-foreground text-xs mb-1">{t.averageScore}</p>
                <p className={`text-2xl font-black ${getScoreColor(avgScore)}`}>{avgScore}%</p>
              </div>
              <div className="flex-1 gradient-card rounded-xl border border-border p-4 text-center">
                <p className="text-muted-foreground text-xs mb-1">{t.bestScore}</p>
                <p className="text-success text-2xl font-black">{Math.max(...results.map(r => Number(r.score)))}%</p>
              </div>
            </div>
            <div className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-foreground font-semibold text-sm">{t.scoreProgress}</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="gradient-card rounded-xl border border-border p-5 flex items-center gap-4 animate-pulse">
                <div className="w-16 h-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="gradient-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-bold text-lg mb-1">{t.noQuizzesYet}</p>
            <p className="text-muted-foreground text-sm mb-6 whitespace-pre-line">
              {t.noQuizzesSubtitle}
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t.takeAQuiz}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="gradient-card rounded-xl border border-border p-5 flex items-center gap-4">
                <div className={`text-3xl font-black w-16 text-center ${getScoreColor(r.score)}`}>
                  {r.score}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-foreground font-medium text-sm truncate">{r.file_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span>{r.correct_answers}/{r.total_questions} {t.correct}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteResult(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
