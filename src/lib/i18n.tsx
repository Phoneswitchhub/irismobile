'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from './translations';

type Language = 'ko' | 'th' | 'mm' | 'en';

interface LanguageContextType {
  lang: Language;
  changeLanguage: (newLang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('th');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage on client mount
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang && ['ko', 'th', 'mm', 'en'].includes(savedLang)) {
      setLang(savedLang);
    } else {
      // Auto-detect browser/phone language
      if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language || (navigator as any).userLanguage || '';
        const code = browserLang.toLowerCase();
        
        let detected: Language = 'th'; // Default fallback
        if (code.startsWith('ko')) {
          detected = 'ko';
        } else if (code.startsWith('th')) {
          detected = 'th';
        } else if (code.startsWith('my') || code.startsWith('mm')) {
          detected = 'mm';
        } else {
          detected = 'en';
        }
        setLang(detected);
      }
    }
    setMounted(true);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    
    // Dispatch custom event for vanilla JS compatibility if any legacy code listens to it
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('languageChanged'));
    }
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const translationSet = TRANSLATIONS[lang] || TRANSLATIONS['th'];
    let translated = translationSet[key] || TRANSLATIONS['th'][key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        translated = translated.replace(new RegExp(`{${placeholder}}`, 'g'), String(value));
      });
    }

    return translated;
  };

  // Prevent hydration mismatch by rendering a fallback or children after mount
  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
