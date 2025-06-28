import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';

// Список IANA timezones (можно расширить или вынести в отдельный файл)
const TIMEZONES = [
  'UTC',
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Europe/Volgograd',
  'Asia/Yerevan',
  'Asia/Tbilisi',
  'Asia/Baku',
  'Europe/Kiev',
  'Europe/Minsk',
  'Europe/Vilnius',
  'Europe/Riga',
  'Europe/Tallinn',
  'Europe/Warsaw',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Istanbul',
  'Asia/Almaty',
  'Asia/Bishkek',
  'Asia/Tashkent',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Asia/Yekaterinburg',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Kamchatka',
  'Asia/Sakhalin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Australia/Perth',
  // ... (можно добавить все IANA timezones)
];

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const TimezoneSelect: React.FC<TimezoneSelectProps> = ({ value, onChange, label, placeholder, disabled }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    TIMEZONES.filter(tz => tz.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-vista-light/60 mb-1">{label}</div>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light">
          <SelectValue placeholder={placeholder || 'Выберите часовой пояс'} />
        </SelectTrigger>
        <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light max-h-60 overflow-y-auto">
          <div className="p-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="mb-2 bg-vista-dark border-vista-secondary/30 text-vista-light"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-vista-light/60 text-xs">Не найдено</div>
          ) : (
            filtered.map(tz => (
              <SelectItem key={tz} value={tz} className="text-vista-light">
                {tz}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}; 