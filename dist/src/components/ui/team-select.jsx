'use client';
import * as React from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
export function TeamSelect({ teams, value, onChange, disabled, placeholder = "Выберите команду", className, }) {
    const [open, setOpen] = React.useState(false);
    // Получаем команду по ID
    const getTeamById = (id) => {
        if (!Array.isArray(teams))
            return undefined;
        return teams.find((team) => team.id === id);
    };
    // Выбранная команда
    const selectedTeam = getTeamById(value);
    return (<Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button role="combobox" aria-expanded={open} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-vista-secondary/30 bg-vista-dark px-3 py-2 text-sm text-vista-light ring-offset-vista-dark placeholder:text-vista-light/70 focus:outline-none focus:ring-2 focus:ring-vista-primary/70 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} disabled={disabled}>
          {selectedTeam ? (<div className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-vista-primary/20 flex items-center justify-center mr-2">
                <Users className="w-3 h-3 text-vista-primary"/>
              </div>
              {selectedTeam.name}
            </div>) : (placeholder)}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-vista-dark border-vista-secondary/30" side="bottom" align="start" sideOffset={8}>
        <Command className="bg-vista-dark">
          <CommandInput placeholder="Поиск команды..." className="h-9 text-vista-light bg-vista-dark"/>
          <CommandList className="bg-vista-dark text-vista-light max-h-[200px]">
            <CommandEmpty className="text-vista-light/70">Команда не найдена</CommandEmpty>
            <CommandGroup>
              {Array.isArray(teams) && teams.map((team) => (<CommandItem key={team.id} value={`${team.name} ${team.id}`} onSelect={() => {
                onChange(team.id);
                setOpen(false);
            }} className="flex items-center text-vista-light hover:bg-vista-secondary/30 cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-vista-primary/20 flex items-center justify-center mr-2">
                    <Users className="w-3 h-3 text-vista-primary"/>
                  </div>
                  {team.name}
                  <Check className={cn("ml-auto h-4 w-4", value === team.id ? "opacity-100" : "opacity-0")}/>
                </CommandItem>))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>);
}
