import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t.resetLinkSent);
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t.loggedIn);
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t.checkEmail);
      }
    } catch (error: unknown) {
      const message = typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : t.authFailed;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "forgot" ? t.resetPassword : mode === "login" ? t.welcomeBack : t.createAccount;
  const subtitle = mode === "forgot" ? t.resetSubtitle : mode === "login" ? t.signInSubtitle : t.signUpSubtitle;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-24" />
          <div className="text-center">
            <h1 className="text-foreground font-bold text-xl tracking-tight">{t.appName}</h1>
            <p className="text-muted-foreground text-xs">{t.appSubtitle}</p>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <main className="container max-w-sm mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-foreground text-3xl font-black tracking-tight mb-2">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {mode !== "forgot" && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t.forgotPassword}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : mode === "forgot" ? (
              <>
                <Mail className="w-5 h-5" />
                {t.sendResetLink}
              </>
            ) : mode === "login" ? (
              <>
                <LogIn className="w-5 h-5" />
                {t.signIn}
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                {t.signUp}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "forgot" ? (
            <button
              onClick={() => setMode("login")}
              className="text-primary font-medium hover:underline flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.backToSignIn}
            </button>
          ) : (
            <>
              {mode === "login" ? t.noAccount : t.haveAccount}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary font-medium hover:underline"
              >
                {mode === "login" ? t.signUp : t.signIn}
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
};

export default Auth;
