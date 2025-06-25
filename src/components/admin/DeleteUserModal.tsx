import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React from 'react';

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; email: string };
  onDelete: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ open, onOpenChange, user, onDelete, onCancel, loading }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Удалить пользователя</DialogTitle>
      </DialogHeader>
      <div className="py-4 text-center text-vista-light/80">
        Вы уверены, что хотите удалить пользователя <span className="font-semibold text-vista-light">{user.name}</span> (<span className="text-vista-light/60">{user.email}</span>)?
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>Отмена</Button>
        <Button onClick={onDelete} className="bg-red-500 hover:bg-red-600 text-vista-light focus:outline-none focus:ring-0" disabled={loading}>{loading ? 'Удаление...' : 'Удалить'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 