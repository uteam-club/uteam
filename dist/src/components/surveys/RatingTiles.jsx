'use client';
import { cn } from "@/lib/utils";
const COLORS = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-lime-500',
    5: 'bg-green-500',
};
const INACTIVE_COLORS = {
    1: 'bg-red-100/20',
    2: 'bg-orange-100/20',
    3: 'bg-yellow-100/20',
    4: 'bg-lime-100/20',
    5: 'bg-green-100/20',
};
const BORDER_COLORS = {
    1: 'border-red-600',
    2: 'border-orange-600',
    3: 'border-yellow-600',
    4: 'border-lime-600',
    5: 'border-green-600',
};
export function RatingTiles({ value, onChange }) {
    return (<div className="grid grid-cols-5 gap-2 w-full">
      {[1, 2, 3, 4, 5].map((number) => (<button key={number} onClick={() => onChange(number)} className={cn("py-4 rounded-lg flex items-center justify-center text-lg font-medium transition-colors border-2", value === number
                ? `${COLORS[number]} ${BORDER_COLORS[number]} text-white shadow-md`
                : `${INACTIVE_COLORS[number]} border-gray-200/20 text-gray-500`)}>
          {number}
        </button>))}
    </div>);
}
