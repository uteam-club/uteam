import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { UserIcon } from 'lucide-react';
import React from 'react';

interface CoachCandidate {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: string;
}

interface AddCoachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCoaches: CoachCandidate[];
  selectedCoachIds: string[];
  onCoachSelect: (coachId: string, isSelected: boolean) => void;
  onAdd: () => void;
  isAdding: boolean;
  addCoachError: string;
}

const AddCoachModal: React.FC<AddCoachModalProps> = ({
  open,
  onOpenChange,
  availableCoaches,
  selectedCoachIds,
  onCoachSelect,
  onAdd,
  isAdding,
  addCoachError,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
      <DialogHeader>
        <DialogTitle className="text-vista-light text-xl">Добавление тренера</DialogTitle>
        <DialogDescription className="text-vista-light/70">
          Выберите тренеров, которых хотите добавить в команду
        </DialogDescription>
      </DialogHeader>
      {addCoachError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
          {addCoachError}
        </div>
      )}
      <div className="py-4 max-h-[400px] overflow-y-auto custom-scrollbar border border-vista-secondary/20 rounded-lg bg-vista-dark/30 p-3">
        {availableCoaches.length > 0 ? (
          <div className="space-y-2">
            {availableCoaches.map(coach => (
              <div key={coach.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                <Checkbox
                  id={`coach-${coach.id}`}
                  checked={selectedCoachIds.includes(coach.id)}
                  onCheckedChange={checked => onCoachSelect(coach.id, checked === true)}
                  className="border-vista-secondary/50 focus:outline-none focus:ring-0"
                />
                <Label htmlFor={`coach-${coach.id}`} className="cursor-pointer flex-1 flex items-center">
                  <div className="flex items-center w-full">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                      {coach.imageUrl ? (
                        <img
                          src={coach.imageUrl}
                          alt={coach.name || 'Тренер'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <UserIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-vista-light font-medium">{coach.name || 'Не указано'}</p>
                      <p className="text-xs text-vista-light/70">{coach.email}</p>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-vista-light/70">Нет доступных тренеров для добавления</p>
          </div>
        )}
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isAdding}
          className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
        >
          Отмена
        </Button>
        <Button
          type="button"
          onClick={onAdd}
          disabled={isAdding || selectedCoachIds.length === 0}
          className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
        >
          {isAdding ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border border-vista-primary border-t-transparent rounded-full"></div>
              Добавление...
            </>
          ) : (
            `Добавить ${selectedCoachIds.length ? `(${selectedCoachIds.length})` : ''}`
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default AddCoachModal; 