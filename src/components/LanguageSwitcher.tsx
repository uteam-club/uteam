"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { SupportedLang } from '@/types/i18n';

const languages: { code: SupportedLang; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

export default function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation();
  const [lang, setLang] = useState<SupportedLang>(i18nInstance.language === 'en' ? 'en' : 'ru');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const handleButtonClick = () => setDropdownOpen((open) => !open);
  const handleSelect = (code: SupportedLang) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    setLang(code);
    setDropdownOpen(false);
  };
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang && storedLang !== lang) {
      const safeLang: SupportedLang = storedLang === 'en' ? 'en' : 'ru';
      i18n.changeLanguage(safeLang);
      setLang(safeLang);
    }
  }, []);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="flex items-center px-3 py-2 text-sm font-medium text-vista-light bg-vista-secondary/20 rounded-md hover:bg-vista-secondary/40 transition-colors relative"
        onClick={handleButtonClick}
        type="button"
      >
        <GlobeAltIcon className="w-4 h-4 mr-1" />
        {isMounted ? (languages.find(l => l.code === lang)?.code.toUpperCase() || lang.toUpperCase()) : ''}
        <ChevronDownIcon className="ml-1 h-4 w-4 transition-transform" />
      </button>
      {dropdownOpen && (
        <div
          className="absolute z-[99999] top-full mt-1 rounded-md shadow-lg bg-vista-dark border-2 border-vista-secondary/40"
          style={{ width: buttonRef.current ? `${buttonRef.current.offsetWidth}px` : '8rem' }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              className={`block w-full text-left px-2 py-2 text-sm transition-colors hover:bg-vista-secondary/20 hover:text-vista-primary
                ${lang === l.code ? 'text-vista-primary' : 'text-vista-light/70'}`}
              onClick={() => handleSelect(l.code)}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 