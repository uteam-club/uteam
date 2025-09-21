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
      <SelectTrigger className={cn('w-full bg-vista-dark/70 border-vista-secondary/30 text-vista-light hover:border-vista-primary/50 focus:border-vista-primary transition-all duration-200 group', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light max-h-72 overflow-y-auto custom-scrollbar">
        {teams.map(team => (
          <SelectItem
            key={team.id}
            value={team.id}
            className="h-10"
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