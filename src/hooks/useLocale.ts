import { useState } from "react";
import { translations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "beatbubble-locale";

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ja";
    return (localStorage.getItem(STORAGE_KEY) as Locale) ?? "ja";
  });

  const changeLocale = (next: Locale) => {
    setLocale(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { locale, t: translations[locale], changeLocale };
}
