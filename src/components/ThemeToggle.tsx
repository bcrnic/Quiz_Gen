import React, { useEffect, useState } from "react";
import { LampDesk, Brain } from "lucide-react";

const ThemeToggle: React.FC = () => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored ? stored === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <LampDesk className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
    </button>
  );
};

export default ThemeToggle;
