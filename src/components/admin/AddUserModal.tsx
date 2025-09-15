import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newUser: { name: string; email: string; role: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAdd: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
  roles: { value: string; label: string }[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ open, onOpenChange, newUser, onChange, onAdd, onCancel, error, loading, roles }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Добавить пользователя</DialogTitle>
      </DialogHeader>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
      )}
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-vista-light/70 font-normal">Имя</Label>
          <Input id="name" name="name" value={newUser.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите имя" disabled={loading}  autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-vista-light/70 font-normal">Email</Label>
          <Input id="email" name="email" value={newUser.email} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите email" disabled={loading}  autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role" className="text-vista-light/70 font-normal">Роль</Label>
          <select id="role" name="role" value={newUser.role} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 w-full" disabled={loading}>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>Отмена</Button>
        <Button onClick={onAdd} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0" disabled={loading || !newUser.email}>{loading ? 'Создание...' : 'Добавить'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 