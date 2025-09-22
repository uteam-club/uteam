'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Users, Edit, Trash2, Eye } from 'lucide-react';
import { NewGpsProfileModal } from './NewGpsProfileModal';
import { EditGpsProfileModal } from './EditGpsProfileModal';
import { useToast } from '@/components/ui/use-toast';

interface GpsProfile {
  id: string;
  name: string;
  description: string;
  columnsCount: number;
  isActive: boolean;
  createdAt: string;
}

export function GpsProfilesTab() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gps/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error loading profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить профили',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    setIsCreateModalOpen(true);
  };

  const handleProfileCreated = () => {
    loadProfiles();
    toast({
      title: 'Профиль создан',
      description: 'GPS профиль успешно создан',
    });
  };

  const handleProfileUpdated = () => {
    loadProfiles();
    toast({
      title: 'Профиль обновлен',
      description: 'GPS профиль успешно обновлен',
    });
  };

  const handleEditProfile = (profileId: string) => {
    setEditingProfileId(profileId);
    setIsEditModalOpen(true);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот профиль?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gps/profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Профиль удален',
          description: 'GPS профиль успешно удален',
        });
        loadProfiles();
      } else {
        throw new Error('Ошибка при удалении профиля');
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error deleting profile:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить профиль',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GPS Профили</h2>
          <p className="text-muted-foreground">
            Создавайте и настраивайте профили для визуализации GPS данных
          </p>
        </div>
        <Button onClick={handleCreateProfile} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Создать профиль
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vista-primary border-t-transparent" />
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Нет профилей</CardTitle>
            <CardDescription>
              Создайте первый GPS профиль для настройки отображения данных
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateProfile} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Создать первый профиль
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditProfile(profile.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{profile.description || 'Без описания'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Settings className="h-4 w-4" />
                      {profile.columnsCount} колонок
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={profile.isActive ? "default" : "secondary"}>
                      {profile.isActive ? 'Активен' : 'Неактивен'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальные окна */}
      <NewGpsProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProfileCreated}
      />
      
      <EditGpsProfileModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProfileId(null);
        }}
        onSuccess={handleProfileUpdated}
        profileId={editingProfileId}
      />
    </div>
  );
}

export default GpsProfilesTab;