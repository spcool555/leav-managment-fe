import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const setGoogleTranslateCookie = (langCode) => {
  const cookieVal = `/en/${langCode}`;
  const domain = window.location.hostname;

  // Clear existing cookies
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  if (domain) {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
  }

  // If not English, set target language cookie
  if (langCode && langCode !== 'en') {
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (domain) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${domain};`;
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('preferred_language') || 'en';
  });

  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    setGoogleTranslateCookie(savedLang);

    // Keep body top 0px if Google Translate attempts layout shift
    const fixBodyTop = () => {
      if (document.body.style.top && document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      if (document.documentElement.style.top && document.documentElement.style.top !== '0px') {
        document.documentElement.style.top = '0px';
      }
    };

    const observer = new MutationObserver(fixBodyTop);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

    fixBodyTop();
    return () => observer.disconnect();
  }, []);

  const changeLanguage = async (langCode, userId = null) => {
    try {
      setCurrentLanguage(langCode);
      localStorage.setItem('preferred_language', langCode);
      setGoogleTranslateCookie(langCode);

      // Save to backend DB
      const storedUser = localStorage.getItem('user');
      const empId = userId || (storedUser ? JSON.parse(storedUser)?.id : null);
      if (empId) {
        try {
          await api.put('/user/language', {
            employee_id: empId,
            language: langCode
          });
        } catch (err) {
          console.error('Backend language sync error:', err);
        }
      }

      // Try combo update first
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event('change'));
      }

      // Reload page to force Google Translate to translate full DOM cleanly
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error('Failed to update language');
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
