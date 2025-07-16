'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { countries as countriesList } from '@/lib/countries';
import type { SupportedLang } from '@/types/i18n';

interface Country {
  code: string;
  name: {
    ru: string;
    en: string;
    [key: string]: string;
  };
}

function countryCodeToEmoji(code: string) {
  // Для кода типа GB-ENG, GB-SCT и т.д. возвращаем 🇬🇧
  if (code.startsWith('GB-')) return '🇬🇧';
  // Для других кодов
  return code
    .replace(/-/g, '')
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  disabled,
  placeholder = 'Выберите страну',
  className,
}: CountrySelectProps) {
  const { i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'ru';
  const countries: Country[] = countriesList;
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'w-full bg-vista-dark/70 border-vista-secondary/30 text-vista-light placeholder:text-vista-light/70',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-vista-dark border-vista-secondary/30 max-h-72 overflow-y-auto" hideScrollButtons={true}>
        {countries.map((country) => (
          <SelectItem
            key={country.code}
            value={country.code}
            className="flex items-center gap-2 focus:bg-vista-secondary/40 hover:bg-vista-secondary/30 focus:text-vista-primary hover:text-vista-primary"
          >
            <span className="mr-2 text-lg">
              {countryCodeToEmoji(country.code)}
            </span>
            {country.name[lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}