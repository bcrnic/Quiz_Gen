import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

import FileUpload from "@/components/FileUpload";
import QuizSetup from "@/components/QuizSetup";
import QuizView from "@/components/QuizView";
import ResultsView from "@/components/ResultsView";
import { QuizQuestion, Difficulty } from "@/types/quiz";

type AppState = "upload" | "setup" | "quiz" | "results";

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [state, setState] = useState<AppState>("upload");
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const handleFilesReady = (content: string, names: string[]) => {
    setTextContent(content);
    setFileName(names.join(", "));
    setState("setup");
  };

  const handleStartQuiz = async (count: number, difficulty: Difficulty, timeLimitMinutes: number | null) => {
    if (authLoading) return;
    if (!user) {
      toast.error(t.authFailed);
      navigate("/auth");
      return;
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    const accessToken = refreshData.session?.access_token;
    if (refreshError || !accessToken) {
      await supabase.auth.signOut();
      toast.error(t.authFailed);
      navigate("/auth");
      return;
    }

    try {
      const payload = JSON.parse(
        decodeURIComponent(
          atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
            .join(""),
        ),
      );
      console.log("jwt payload", { iss: payload?.iss, aud: payload?.aud, exp: payload?.exp });
    } catch (_e) {
      console.log("jwt payload", "<failed to decode>");
    }

    setTimeLimit(timeLimitMinutes);
    setIsLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          apikey,
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ textContent, questionCount: count, difficulty }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || data?.message || "Failed to generate quiz. Please try again.";
        toast.error(msg);
        console.error("generate-quiz failed:", res.status, data);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data?.questions || data.questions.length === 0) {
        toast.error("No questions could be generated from this content.");
        return;
      }

      setQuestions(data.questions);
      setState("quiz");
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (answers: (string | null)[]) => {
    setUserAnswers(answers);
    setState("results");
  };

  const handleNewQuiz = () => {
    setQuestions([]);
    setUserAnswers([]);
    setState("setup");
  };

  const handleRetryWrong = (wrongQuestions: QuizQuestion[]) => {
    setQuestions(wrongQuestions);
    setUserAnswers([]);
    setState("quiz");
  };

  const handleUploadNew = () => {
    setTextContent("");
    setFileName("");
    setQuestions([]);
    setUserAnswers([]);
    setState("upload");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-8 sm:w-24" />
          <div className="text-center">
            <h1 className="text-foreground font-bold text-xl tracking-tight">{t.appName}</h1>
            <p className="text-muted-foreground text-xs hidden sm:block">{t.appSubtitle}</p>
          </div>
          <div className="flex items-center justify-end">
            <Link
              to="/history"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.history}
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {state === "upload" && (
            <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <div className="text-center mb-10">
                <h2 className="text-foreground text-3xl font-black mb-3 tracking-tight">
                  {t.uploadTitle}
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto whitespace-pre-line">
                  {t.uploadSubtitle}
                </p>
              </div>
              <FileUpload onFilesReady={handleFilesReady} />
            </motion.div>
          )}

          {state === "setup" && (
            <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <div className="text-center mb-10">
                <h2 className="text-foreground text-3xl font-black mb-3 tracking-tight">
                  {t.configureTitle}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {t.configureSubtitle(fileName)} <span className="text-primary font-medium">{fileName}</span>
                </p>
              </div>
              <QuizSetup onStart={handleStartQuiz} isLoading={isLoading} />
            </motion.div>
          )}

          {state === "quiz" && (
            <motion.div key="quiz" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <QuizView questions={questions} onComplete={handleQuizComplete} timeLimit={timeLimit} />
            </motion.div>
          )}

          {state === "results" && (
            <motion.div key="results" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ResultsView
                questions={questions}
                userAnswers={userAnswers}
                fileName={fileName}
                onNewQuiz={handleNewQuiz}
                onUploadNew={handleUploadNew}
                onRetryWrong={handleRetryWrong}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
