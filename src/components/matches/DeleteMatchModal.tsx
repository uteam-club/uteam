import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface DeleteMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onDelete: () => void;
  onCancel: () => void;
}

const DeleteMatchModal: React.FC<DeleteMatchModalProps> = ({
  open,
  onOpenChange,
  isDeleting,
  onDelete,
  onCancel,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
      <DialogHeader>
        <DialogTitle>Удалить матч?</DialogTitle>
        <DialogDescription>
          Вы уверены, что хотите удалить этот матч? Все связанные данные (статистика, состав, формации и т.д.) будут удалены безвозвратно.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isDeleting} className="focus:outline-none focus:ring-0">Отмена</Button>
        <Button className="border-vista-error/50 text-vista-error hover:bg-vista-error/10 focus:outline-none focus:ring-0" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? 'Удаление...' : 'Удалить матч'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DeleteMatchModal; 