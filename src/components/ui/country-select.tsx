'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Список стран с кодами
const countries = [
  { name: 'Россия', code: 'RU' },
  { name: 'Албания', code: 'AL' },
  { name: 'Англия', code: 'GB-ENG' },
  { name: 'Бразилия', code: 'BR' },
  { name: 'Аргентина', code: 'AR' },
  { name: 'Испания', code: 'ES' },
  { name: 'Италия', code: 'IT' },
  { name: 'Германия', code: 'DE' },
  { name: 'Франция', code: 'FR' },
  { name: 'Нидерланды', code: 'NL' },
  { name: 'Португалия', code: 'PT' },
  { name: 'Бельгия', code: 'BE' },
  { name: 'Уругвай', code: 'UY' },
  { name: 'Колумбия', code: 'CO' },
  { name: 'Мексика', code: 'MX' },
  { name: 'США', code: 'US' },
  { name: 'Канада', code: 'CA' },
  { name: 'Япония', code: 'JP' },
  { name: 'Китай', code: 'CN' },
  { name: 'Австралия', code: 'AU' },
  { name: 'Корея', code: 'KR' },
  { name: 'Египет', code: 'EG' },
  { name: 'Марокко', code: 'MA' },
  { name: 'Нигерия', code: 'NG' },
  { name: 'Сенегал', code: 'SN' },
  { name: 'Гана', code: 'GH' },
  { name: 'Камерун', code: 'CM' },
  { name: 'Алжир', code: 'DZ' },
  { name: 'Украина', code: 'UA' },
  { name: 'Беларусь', code: 'BY' },
  { name: 'Казахстан', code: 'KZ' },
  { name: 'Узбекистан', code: 'UZ' },
  { name: 'Таджикистан', code: 'TJ' },
  { name: 'Кыргызстан', code: 'KG' },
  { name: 'Сербия', code: 'RS' },
  { name: 'Хорватия', code: 'HR' },
  { name: 'Швеция', code: 'SE' },
  { name: 'Дания', code: 'DK' },
  { name: 'Норвегия', code: 'NO' },
  { name: 'Финляндия', code: 'FI' },
  { name: 'Исландия', code: 'IS' },
  { name: 'Польша', code: 'PL' },
  { name: 'Чехия', code: 'CZ' },
  { name: 'Словакия', code: 'SK' },
  { name: 'Венгрия', code: 'HU' },
  { name: 'Австрия', code: 'AT' },
  { name: 'Швейцария', code: 'CH' },
  { name: 'Греция', code: 'GR' },
  { name: 'Турция', code: 'TR' },
  { name: 'Румыния', code: 'RO' },
  { name: 'Болгария', code: 'BG' },
  { name: 'Молдова', code: 'MD' },
  { name: 'Черногория', code: 'ME' },
  { name: 'Босния и Герцеговина', code: 'BA' },
  { name: 'Армения', code: 'AM' },
  { name: 'Азербайджан', code: 'AZ' },
  { name: 'Грузия', code: 'GE' },
  { name: 'Иран', code: 'IR' },
  { name: 'Ирак', code: 'IQ' },
  { name: 'Саудовская Аравия', code: 'SA' },
  { name: 'Катар', code: 'QA' },
  { name: 'ОАЭ', code: 'AE' },
  { name: 'Кувейт', code: 'KW' },
  { name: 'Оман', code: 'OM' },
  { name: 'Израиль', code: 'IL' },
  { name: 'Индия', code: 'IN' },
  { name: 'Пакистан', code: 'PK' },
  { name: 'Бангладеш', code: 'BD' },
  // Добавленные страны
  { name: 'Кот-д\'Ивуар', code: 'CI' },
  { name: 'ЮАР', code: 'ZA' },
  { name: 'Гвинея', code: 'GN' },
  { name: 'Мали', code: 'ML' },
  { name: 'Буркина-Фасо', code: 'BF' },
  { name: 'Тунис', code: 'TN' },
  { name: 'Либерия', code: 'LR' },
  { name: 'Судан', code: 'SD' },
  { name: 'Эфиопия', code: 'ET' },
  { name: 'Кения', code: 'KE' },
  { name: 'Танзания', code: 'TZ' },
  { name: 'Уганда', code: 'UG' },
  { name: 'Зимбабве', code: 'ZW' },
  { name: 'Ангола', code: 'AO' },
  { name: 'Перу', code: 'PE' },
  { name: 'Чили', code: 'CL' },
  { name: 'Эквадор', code: 'EC' },
  { name: 'Венесуэла', code: 'VE' },
  { name: 'Парагвай', code: 'PY' },
  { name: 'Боливия', code: 'BO' },
  { name: 'Коста-Рика', code: 'CR' },
  { name: 'Панама', code: 'PA' },
  { name: 'Гондурас', code: 'HN' },
  { name: 'Сальвадор', code: 'SV' },
  { name: 'Ямайка', code: 'JM' },
  { name: 'Тайланд', code: 'TH' },
  { name: 'Вьетнам', code: 'VN' },
  { name: 'Индонезия', code: 'ID' },
  { name: 'Малайзия', code: 'MY' },
  { name: 'Филиппины', code: 'PH' },
  { name: 'Новая Зеландия', code: 'NZ' },
  { name: 'Гаити', code: 'HT' },
  { name: 'Монголия', code: 'MN' },
  { name: 'Шотландия', code: 'GB-SCT' },
  { name: 'Уэльс', code: 'GB-WLS' },
  { name: 'Северная Ирландия', code: 'GB-NIR' },
  { name: 'Люксембург', code: 'LU' },
  { name: 'Фарерские острова', code: 'FO' },
  { name: 'Андорра', code: 'AD' },
  { name: 'Мальта', code: 'MT' },
  { name: 'Кипр', code: 'CY' },
  { name: 'Макао', code: 'MO' },
  { name: 'Гонконг', code: 'HK' },
  { name: 'Сингапур', code: 'SG' },
];

// Сортируем страны по имени
countries.sort((a, b) => a.name.localeCompare(b.name));

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
  placeholder = "Выберите страну",
  className,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Получаем страну по коду
  const getCountryByCode = (code: string) => {
    return countries.find((country) => country.code === code);
  };

  // Выбранная страна
  const selectedCountry = getCountryByCode(value);
  
  // Фильтрация стран по поисковому запросу
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries;
    
    return countries.filter(
      country => country.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  
  // Обработчик выбора страны
  const handleSelectCountry = (countryCode: string) => {
    onChange(countryCode);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-vista-secondary/30 bg-vista-dark/70 px-3 py-2 text-sm text-vista-light ring-offset-vista-dark placeholder:text-vista-light/70 focus:outline-none focus:ring-2 focus:ring-vista-primary/70 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={disabled}
        >
          {selectedCountry ? (
            <div className="flex items-center">
              <img
                src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                alt={selectedCountry.name}
                className="mr-2 h-4 w-6 object-contain"
              />
              {selectedCountry.name}
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-vista-dark border border-vista-secondary/50 shadow-xl rounded-md overflow-hidden">
        <div className="w-full p-2 border-b border-vista-secondary/30 bg-vista-dark flex items-center">
          <Search className="w-4 h-4 mr-2 text-vista-light/50" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск страны..."
            className="w-full bg-transparent border-none text-vista-light text-sm focus:outline-none placeholder:text-vista-light/50"
          />
        </div>
        
        <div className="max-h-[320px] overflow-y-auto py-1">
          {filteredCountries.length > 0 ? (
            <div className="p-1">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountry(country.code)}
                  className={cn(
                    "w-full flex items-center text-vista-light py-2 px-3 rounded-md hover:bg-vista-secondary/30 text-left text-sm mb-1", 
                    value === country.code && "bg-vista-primary/20 text-vista-primary"
                  )}
                >
                  <img
                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                    alt={country.name}
                    className="mr-3 h-4 w-6 object-contain"
                  />
                  <span className="flex-1 truncate">{country.name}</span>
                  {value === country.code && (
                    <Check className="ml-auto h-4 w-4 text-vista-primary" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-vista-light py-6 text-center text-sm">
              Страна не найдена
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}