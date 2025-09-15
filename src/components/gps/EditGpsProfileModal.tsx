'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GpsProfile } from '@/types/gps';
import { updateGpsProfile } from '@/lib/gps-api';
import { getAvailableGpsSystems } from '@/lib/canonical-metrics';
import { toast } from '@/components/ui/use-toast';

interface EditGpsProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: GpsProfile;
  onProfileUpdated: () => void;
}

export default function EditGpsProfileModal({
  open,
  onOpenChange,
  profile,
  onProfileUpdated,
}: EditGpsProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gpsSystem: '',
    description: '',
    isActive: true,
  });

  const gpsSystems = getAvailableGpsSystems();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        gpsSystem: profile.gpsSystem,
        description: profile.description || '',
        isActive: profile.isActive,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.gpsSystem) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const updatedProfile = await updateGpsProfile(profile.id, formData);

      if (updatedProfile) {
        toast({
          title: 'Успех',
          description: 'GPS профиль обновлен успешно',
        });
        onProfileUpdated();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating GPS profile:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить GPS профиль',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Редактировать GPS профиль</DialogTitle>
            <DialogDescription>
              Измените настройки GPS профиля
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название профиля *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Polar Team A"
                autoComplete="off"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="gpsSystem">GPS система *</Label>
              <Select
                value={formData.gpsSystem}
                onValueChange={(value) => setFormData(prev => ({ ...prev, gpsSystem: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите GPS систему" />
                </SelectTrigger>
                <SelectContent>
                  {gpsSystems.map((system) => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание профиля (необязательно)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Активный профиль</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
