import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';

interface UserCreatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; email: string };
  onClose: () => void;
}

export const UserCreatedModal: React.FC<UserCreatedModalProps> = ({ open, onOpenChange, user, onClose }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Пользователь создан</DialogTitle>
      </DialogHeader>
      <div className="py-4 text-center text-vista-light/80">
        Пользователь <span className="font-semibold text-vista-light">{user.name}</span> (<span className="text-vista-light/60">{user.email}</span>) успешно создан.
      </div>
      <DialogFooter className="flex justify-center mt-4">
        <Button onClick={onClose} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0">Ок</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 