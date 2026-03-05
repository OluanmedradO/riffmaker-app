import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import enUS from "@/src/i18n/en-US";
import ptBR from "@/src/i18n/pt-BR";

export type Language = "pt-BR" | "en-US";

type Translations = typeof ptBR;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof Translations, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Language, Translations> = {
  "pt-BR": ptBR,
  "en-US": enUS,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt-BR");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@app_language").then((stored) => {
      if (stored === "en-US") {
        setLanguageState("en-US");
      }
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("@app_language", lang);
  };

  const t = (key: keyof Translations, params?: Record<string, string>): string => {
    let str = translations[language][key] || translations["pt-BR"][key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(`{{${k}}}`, params[k]);
      });
    }
    return str;
  };

  if (!isLoaded) return null;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

