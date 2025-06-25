import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';

export type PlayerStatus = 'ready' | 'rehabilitation' | 'sick' | 'study' | 'other';

const statusOptions: { value: PlayerStatus; label: string; color: string; text: string }[] = [
  { value: 'ready', label: 'Готов', color: 'bg-green-500', text: 'text-green-300' },
  { value: 'rehabilitation', label: 'Реабилитация', color: 'bg-blue-500', text: 'text-blue-300' },
  { value: 'sick', label: 'Болеет', color: 'bg-yellow-500', text: 'text-yellow-300' },
  { value: 'study', label: 'Учеба', color: 'bg-purple-500', text: 'text-purple-300' },
  { value: 'other', label: 'Другое', color: 'bg-gray-500', text: 'text-gray-300' },
];

interface PlayerStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  statusError: string;
  onStatusSelect: (status: PlayerStatus) => void;
}

export function PlayerStatusModal({
  open,
  onOpenChange,
  playerName,
  statusError,
  onStatusSelect,
}: PlayerStatusModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-xs overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Изменение статуса</DialogTitle>
          <DialogDescription className="text-vista-light/70">
            {playerName || 'Игрок'}
          </DialogDescription>
        </DialogHeader>
        {statusError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
            {statusError}
          </div>
        )}
        <div className="py-4">
          <div className="space-y-2">
            {statusOptions.map(option => (
              <div
                key={option.value}
                className={`flex items-center p-2 rounded-md ${option.color}/20 hover:${option.color}/30 cursor-pointer focus:outline-none`}
                tabIndex={0}
                onClick={() => onStatusSelect(option.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onStatusSelect(option.value); }}
              >
                <div className={`w-3 h-3 ${option.color} rounded-full mr-3`}></div>
                <span className={option.text}>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 