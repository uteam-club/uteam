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
  { name: 'Замбия', code: 'ZM' },
  { name: 'Габон', code: 'GA' },
  { name: 'Мозамбик', code: 'MZ' },
  { name: 'Ботсвана', code: 'BW' },
  { name: 'Малави', code: 'MW' },
  { name: 'Намибия', code: 'NA' },
  { name: 'Бенин', code: 'BJ' },
  { name: 'Того', code: 'TG' },
  { name: 'Чад', code: 'TD' },
  { name: 'Центральноафриканская Республика', code: 'CF' },
  { name: 'Конго', code: 'CG' },
  { name: 'Демократическая Республика Конго', code: 'CD' },
  { name: 'Сьерра-Леоне', code: 'SL' },
  { name: 'Гамбия', code: 'GM' },
  { name: 'Кабо-Верде', code: 'CV' },
  { name: 'Мавритания', code: 'MR' },
  { name: 'Маврикий', code: 'MU' },
  { name: 'Сейшелы', code: 'SC' },
  { name: 'Коморы', code: 'KM' },
  { name: 'Сомали', code: 'SO' },
  { name: 'Руанда', code: 'RW' },
  { name: 'Бурунди', code: 'BI' },
  { name: 'Лесото', code: 'LS' },
  { name: 'Эсватини', code: 'SZ' },
  { name: 'Джибути', code: 'DJ' },
  { name: 'Гвинея-Бисау', code: 'GW' },
  { name: 'Экваториальная Гвинея', code: 'GQ' },
  { name: 'Сан-Томе и Принсипи', code: 'ST' },
  { name: 'Эритрея', code: 'ER' },
  { name: 'Ливия', code: 'LY' },
  { name: 'Мадагаскар', code: 'MG' },
];

countries.sort((a, b) => a.name.localeCompare(b.name));

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
        {countries.map(country => (
          <SelectItem
            key={country.code}
            value={country.code}
            className="flex items-center gap-2 focus:bg-vista-secondary/40 hover:bg-vista-secondary/30 focus:text-vista-primary hover:text-vista-primary"
          >
            <span className="mr-2 text-lg">
              {countryCodeToEmoji(country.code)}
            </span>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}