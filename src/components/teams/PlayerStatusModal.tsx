import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type PlayerStatus = 'ready' | 'rehabilitation' | 'sick' | 'study' | 'other' | 'injury' | 'national_team' | 'other_team';

const statusOptions = [
  { value: 'ready', labelKey: 'ready', color: 'bg-green-500', text: 'text-green-300' },
  { value: 'rehabilitation', labelKey: 'rehabilitation', color: 'bg-blue-500', text: 'text-blue-300' },
  { value: 'sick', labelKey: 'sick', color: 'bg-yellow-500', text: 'text-yellow-300' },
  { value: 'study', labelKey: 'study', color: 'bg-purple-500', text: 'text-purple-300' },
  { value: 'injury', labelKey: 'injury', color: 'bg-red-500', text: 'text-red-300' },
  { value: 'national_team', labelKey: 'national_team', color: 'bg-indigo-500', text: 'text-indigo-300' },
  { value: 'other_team', labelKey: 'other_team', color: 'bg-orange-500', text: 'text-orange-300' },
  { value: 'other', labelKey: 'other', color: 'bg-gray-500', text: 'text-gray-300' },
];

interface PlayerStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  statusError: string;
  onStatusSelect: (status: PlayerStatus) => void;
  currentStatus?: PlayerStatus; // Добавляем текущий статус игрока
}

export function PlayerStatusModal({
  open,
  onOpenChange,
  playerName,
  statusError,
  onStatusSelect,
  currentStatus, // Добавляем текущий статус
}: PlayerStatusModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-xs overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('teamPage.player_status_modal_title')}</DialogTitle>
          <DialogDescription className="text-vista-light/70">
            {playerName || t('teamPage.player')}
          </DialogDescription>
        </DialogHeader>
        {statusError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
            {statusError}
          </div>
        )}
        <div className="py-4">
          <div className="space-y-2">
            {statusOptions.map(option => {
              const isActive = currentStatus === option.value;
              // Преобразуем Tailwind классы в CSS цвета
              const getColorValue = (tailwindClass: string) => {
                const colorMap: { [key: string]: string } = {
                  'bg-green-500': 'rgba(34, 197, 94, 0.2)', // green-500 с прозрачностью 0.2
                  'bg-blue-500': 'rgba(59, 130, 246, 0.2)', // blue-500 с прозрачностью 0.2
                  'bg-yellow-500': 'rgba(234, 179, 8, 0.2)', // yellow-500 с прозрачностью 0.2
                  'bg-purple-500': 'rgba(168, 85, 247, 0.2)', // purple-500 с прозрачностью 0.2
                  'bg-red-500': 'rgba(239, 68, 68, 0.2)', // red-500 с прозрачностью 0.2
                  'bg-indigo-500': 'rgba(99, 102, 241, 0.2)', // indigo-500 с прозрачностью 0.2
                  'bg-orange-500': 'rgba(249, 115, 22, 0.2)', // orange-500 с прозрачностью 0.2
                  'bg-gray-500': 'rgba(107, 114, 128, 0.2)', // gray-500 с прозрачностью 0.2
                };
                return colorMap[tailwindClass] || 'transparent';
              };
              
              return (
                <div
                  key={option.value}
                  className={`flex items-center p-2 rounded-md cursor-pointer focus:outline-none transition-all duration-200 ${
                    isActive 
                      ? `${option.color}/20 ${option.text}` // Активный статус - нормальный вид
                      : `text-vista-light/50` // Неактивные - тусклый текст
                  }`}
                  style={{
                    backgroundColor: isActive ? undefined : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      console.log(`Hover on ${option.value}, setting bg to:`, getColorValue(option.color));
                      e.currentTarget.style.backgroundColor = getColorValue(option.color);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      console.log(`Leave ${option.value}, setting bg to transparent`);
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  tabIndex={0}
                  onClick={() => onStatusSelect(option.value as PlayerStatus)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onStatusSelect(option.value as PlayerStatus); }}
                >
                  <div className={`w-3 h-3 ${option.color} rounded-full mr-3 ${isActive ? 'opacity-100' : 'opacity-50'}`}></div>
                  <span>{t(`teamPage.${option.labelKey}`)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
          >
            {t('teamPage.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 