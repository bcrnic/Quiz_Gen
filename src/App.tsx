import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LogOut } from "lucide-react";
import Index from "./pages/Index";
import History from "./pages/History";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const GlobalControls = () => {
  const { user, signOut } = useAuth();
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
      {user && (
        <button
          onClick={signOut}
          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const App = () => (
  !isSupabaseConfigured ? (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8">
        <h1 className="text-foreground font-bold text-2xl mb-2">Supabase is not configured</h1>
        <p className="text-muted-foreground mb-4">
          Set environment variables in a local <code className="font-mono">.env</code> file and restart the dev server.
        </p>
        <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground mb-4">
          <div>MODE: <code className="font-mono">{import.meta.env.MODE}</code></div>
          <div>VITE_SUPABASE_URL: <code className="font-mono">{import.meta.env.VITE_SUPABASE_URL ? "set" : "missing"}</code></div>
          <div>VITE_SUPABASE_PUBLISHABLE_KEY: <code className="font-mono">{import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "set" : "missing"}</code></div>
        </div>
        <div className="rounded-xl bg-muted px-4 py-3 font-mono text-sm text-foreground whitespace-pre-wrap">
          VITE_SUPABASE_URL=\"https://YOUR_PROJECT.supabase.co\"\nVITE_SUPABASE_PUBLISHABLE_KEY=\"YOUR_SUPABASE_ANON_KEY\"\n
        </div>
      </div>
    </div>
  ) : (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalControls />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
);

export default App;
