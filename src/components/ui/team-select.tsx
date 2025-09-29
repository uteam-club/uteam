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
import { Users } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface TeamSelectProps {
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TeamSelect({
  teams,
  value,
  onChange,
  disabled,
  placeholder = 'Выберите команду',
  className,
}: TeamSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg max-h-72 overflow-y-auto custom-scrollbar">
        {teams.map(team => (
          <SelectItem
            key={team.id}
            value={team.id}
          >
            <span className="flex flex-row items-center gap-2 w-full">
              <Users className="w-4 h-4 text-vista-primary" />
              <span className="truncate">{team.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 