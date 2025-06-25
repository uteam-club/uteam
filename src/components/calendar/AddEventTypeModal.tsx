import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import React from 'react';

interface AddEventTypeModalProps {
  isOpen: boolean;
  date: Date;
  onClose: () => void;
  onSelect: (type: 'TRAINING' | 'MATCH') => void;
}

export const AddEventTypeModal: React.FC<AddEventTypeModalProps> = ({ isOpen, date, onClose, onSelect }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-xs w-full overflow-hidden backdrop-blur-xl flex flex-col items-center gap-6 py-6 px-4">
        <DialogHeader className="w-full">
          <DialogTitle className="text-vista-light text-base text-center truncate w-full">
            Добавить событие на {format(date, 'dd.MM.yyyy')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 w-full justify-center">
          <Button
            className="flex-1 min-w-[120px] h-10 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow text-base font-medium focus:outline-none focus:ring-0"
            onClick={() => onSelect('TRAINING')}
            type="button"
          >
            Тренировка
          </Button>
          <Button
            className="flex-1 min-w-[120px] h-10 bg-vista-primary/80 hover:bg-vista-primary text-vista-dark shadow text-base font-medium focus:outline-none focus:ring-0"
            onClick={() => onSelect('MATCH')}
            type="button"
          >
            Матч
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 