import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { UserIcon } from 'lucide-react';
import React from 'react';

interface Coach {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
    role: string;
  };
  role?: string;
  teamId: string;
  userId: string;
}

interface DeleteCoachesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coaches: Coach[];
  selectedCoachIdsToDelete: string[];
  onCoachSelect: (userId: string, isSelected: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
  deleteCoachError: string;
}

const DeleteCoachesModal: React.FC<DeleteCoachesModalProps> = ({
  open,
  onOpenChange,
  coaches,
  selectedCoachIdsToDelete,
  onCoachSelect,
  onDelete,
  isDeleting,
  deleteCoachError,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl focus:outline-none focus:ring-0">
      <DialogHeader>
        <DialogTitle className="text-vista-light text-xl">Удаление тренеров</DialogTitle>
        <DialogDescription className="text-vista-light/70">
          Выберите тренеров, которых нужно удалить из команды
        </DialogDescription>
      </DialogHeader>
      {deleteCoachError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
          {deleteCoachError}
        </div>
      )}
      <div className="py-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {coaches.length > 0 ? (
          <div className="space-y-2">
            {coaches.map(coach => (
              <div key={coach.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                <Checkbox
                  id={`coach-delete-${coach.userId}`}
                  checked={selectedCoachIdsToDelete.includes(coach.userId)}
                  onCheckedChange={checked => onCoachSelect(coach.userId, checked === true)}
                  className="border-vista-secondary/50 focus:outline-none focus:ring-0"
                />
                <Label htmlFor={`coach-delete-${coach.userId}`} className="cursor-pointer flex-1 flex items-center">
                  <div className="flex items-center w-full">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                      {coach.user.imageUrl ? (
                        <img
                          src={coach.user.imageUrl}
                          alt={coach.user.name || 'Тренер'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <UserIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-vista-light font-medium">{coach.user.name || 'Не указано'}</p>
                      <p className="text-xs text-vista-light/70">{coach.user.email}</p>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-vista-light/70">Нет тренеров для удаления</p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isDeleting}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
        >
          Отмена
        </Button>
        <Button
          type="button"
          onClick={onDelete}
          disabled={isDeleting || selectedCoachIdsToDelete.length === 0}
          className="bg-red-500/80 hover:bg-red-500 text-white focus:outline-none focus:ring-0"
        >
          {isDeleting ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Удаление...
            </>
          ) : (
            `Удалить ${selectedCoachIdsToDelete.length ? `(${selectedCoachIdsToDelete.length})` : ''}`
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DeleteCoachesModal; 