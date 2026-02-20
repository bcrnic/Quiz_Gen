import React, { useState, useRef, useEffect } from "react";
import { useLanguage, type Language } from "@/i18n/LanguageContext";
import { ChevronDown } from "lucide-react";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "sr", label: "Srpski", flag: "🇷🇸" },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find((l) => l.value === language)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2 rounded-lg bg-secondary flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <span>{current.flag}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[140px] py-1 animate-fade-in">
          {languages.map((l) => (
            <button
              key={l.value}
              onClick={() => { setLanguage(l.value); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
                language === l.value ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
