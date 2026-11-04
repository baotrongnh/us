"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage, type Language } from "@/components/dashboard/language-context";

const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "de", label: "Deutsch" },
];

function LanguageFlag({ language }: { language: Language }) {
  const flagContent: Record<Language, React.ReactNode> = {
    en: (
      <>
        <path fill="#eee" d="M0 0h512v512H0z" />
        <path fill="#d80027" d="M0 0h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v32H0z" />
        <path fill="#0052b4" d="M0 0h256v256H0z" />
        <path fill="#eee" d="m45 38 7 15h16L55 63l5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zM45 115l7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16z" />
      </>
    ),
    vi: (
      <>
        <path fill="#d80027" d="M0 0h512v512H0z" />
        <path fill="#ffda44" d="m256 110 34 104h110l-89 64 34 104-89-64-89 64 34-104-89-64h110z" />
      </>
    ),
    ja: (
      <>
        <path fill="#eee" d="M0 0h512v512H0z" />
        <circle cx="256" cy="256" r="112" fill="#d80027" />
      </>
    ),
    zh: (
      <>
        <path fill="#d80027" d="M0 0h512v512H0z" />
        <path fill="#ffda44" d="m130 90 18 54h57l-46 34 18 54-47-34-46 34 18-54-46-34h57zm125 20 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm58 53 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm-2 78 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm-56 55 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25z" />
      </>
    ),
    de: (
      <>
        <path fill="#222" d="M0 0h512v171H0z" />
        <path fill="#d80027" d="M0 171h512v170H0z" />
        <path fill="#ffda44" d="M0 341h512v171H0z" />
      </>
    ),
  };

  return (
    <span className="language-flag" aria-hidden="true">
      <svg viewBox="0 0 512 512">{flagContent[language]}</svg>
    </span>
  );
}

export function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`theme-picker language-picker ${isOpen ? "open" : ""}`} ref={pickerRef}>
      <button
        type="button"
        className="theme-picker-trigger language-picker-trigger"
        aria-label={t("chooseLanguage")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <LanguageFlag language={language} />
      </button>
      {isOpen && (
        <div className="theme-picker-menu language-picker-menu" role="listbox" aria-label={t("chooseLanguage")}>
          <p className="language-picker-label">{t("language")}</p>
          {languageOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={language === option.value}
              className={`theme-picker-option ${language === option.value ? "selected" : ""}`}
              onClick={() => {
                setLanguage(option.value);
                setIsOpen(false);
              }}
            >
              <LanguageFlag language={option.value} />
              <span>{option.label}</span>
              {language === option.value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
