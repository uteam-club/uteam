'use client';

import { cn } from "@/lib/utils";

interface RPERatingTilesProps {
  value: number | undefined;
  onChange: (value: number) => void;
  lang?: 'ru' | 'en';
}

const COLORS = {
  1: 'bg-green-500',
  2: 'bg-green-400',
  3: 'bg-lime-500',
  4: 'bg-lime-400',
  5: 'bg-yellow-500',
  6: 'bg-yellow-400',
  7: 'bg-orange-500',
  8: 'bg-orange-400',
  9: 'bg-red-500',
  10: 'bg-red-600',
} as const;

const INACTIVE_COLORS = {
  1: 'bg-green-100/20',
  2: 'bg-green-100/20',
  3: 'bg-lime-100/20',
  4: 'bg-lime-100/20',
  5: 'bg-yellow-100/20',
  6: 'bg-yellow-100/20',
  7: 'bg-orange-100/20',
  8: 'bg-orange-100/20',
  9: 'bg-red-100/20',
  10: 'bg-red-100/20',
} as const;

const BORDER_COLORS = {
  1: 'border-green-600',
  2: 'border-green-500',
  3: 'border-lime-600',
  4: 'border-lime-500',
  5: 'border-yellow-600',
  6: 'border-yellow-500',
  7: 'border-orange-600',
  8: 'border-orange-500',
  9: 'border-red-600',
  10: 'border-red-700',
} as const;

const RPE_LABELS = {
  ru: {
    1: 'Очень легко',
    2: 'Легко',
    3: 'Умеренно легко',
    4: 'Умеренно',
    5: 'Умеренно тяжело',
    6: 'Тяжело',
    7: 'Очень тяжело',
    8: 'Крайне тяжело',
    9: 'Максимально',
    10: 'За пределами',
  },
  en: {
    1: 'Very easy',
    2: 'Easy',
    3: 'Moderately easy',
    4: 'Moderate',
    5: 'Moderately hard',
    6: 'Hard',
    7: 'Very hard',
    8: 'Extremely hard',
    9: 'Maximal',
    10: 'Beyond limits',
  }
} as const;

const SELECTED_LABEL = {
  ru: 'Выбранная оценка',
  en: 'Selected score',
};

export function RPERatingTiles({ value, onChange, lang = 'ru' }: RPERatingTilesProps) {
  const labels = RPE_LABELS[lang] || RPE_LABELS['ru'];
  return (
    <div className="space-y-4">
      {/* 1-9: по 3 в ряд, 10 — на всю ширину */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {[1,2,3,4,5,6,7,8,9].map((number) => (
          <button
            key={number}
            onClick={() => onChange(number)}
            className={cn(
              "py-3 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-colors border-2 min-h-[60px]",
              value !== undefined && value === number 
                ? `${COLORS[number as keyof typeof COLORS]} ${BORDER_COLORS[number as keyof typeof BORDER_COLORS]} text-white shadow-md` 
                : `${INACTIVE_COLORS[number as keyof typeof INACTIVE_COLORS]} border-gray-200/20 text-gray-500`
            )}
          >
            <span className="text-lg font-bold">{number}</span>
            <span className="text-xs text-center leading-tight">
              {labels[number as keyof typeof labels]}
            </span>
          </button>
        ))}
        {/* 10 — на всю ширину */}
        <button
          key={10}
          onClick={() => onChange(10)}
          className={cn(
            "col-span-3 py-3 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-colors border-2 min-h-[60px]",
            value !== undefined && value === 10
              ? `${COLORS[10]} ${BORDER_COLORS[10]} text-white shadow-md`
              : `${INACTIVE_COLORS[10]} border-gray-200/20 text-gray-500`
          )}
        >
          <span className="text-lg font-bold">10</span>
          <span className="text-xs text-center leading-tight">
            {labels[10]}
          </span>
        </button>
      </div>
      {value !== undefined && value > 0 && (
        <div className="text-center p-3 bg-vista-dark/30 rounded-lg">
          <p className="text-vista-light font-medium">
            {SELECTED_LABEL[lang] || SELECTED_LABEL['ru']}: <span className="text-lg font-bold">{value}</span>
          </p>
          <p className="text-vista-light/70 text-sm">
            {labels[value as keyof typeof labels]}
          </p>
        </div>
      )}
    </div>
  );
} 