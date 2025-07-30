'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import CreateGpsProfileModal from './CreateGpsProfileModal';
import EditGpsProfileModal from './EditGpsProfileModal';

interface GpsProfile {
  id: string;
  name: string;
  description: string;
  gpsSystem: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function GpsProfilesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: session } = useSession();
  
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/gps-profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Ошибка при получении профилей:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setIsEditModalOpen(true);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот профиль?')) return;
    
    try {
      const response = await fetch(`/api/gps-profiles/${profileId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "Успешно",
          description: "Профиль удален",
        });
        fetchProfiles();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении');
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить профиль",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Список профилей */}
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">Профили визуализации</CardTitle>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать профиль
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-vista-light/60">Загрузка профилей...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-vista-light/50">
              Профили не найдены. Создайте первый профиль для настройки визуализации.
            </div>
          ) : (
            <div className="grid gap-4">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 border border-vista-secondary/30 rounded-lg bg-vista-dark/30 hover:bg-vista-dark/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-vista-light">{profile.name}</h3>
                        {profile.isDefault && (
                          <Badge className="bg-vista-primary text-vista-dark">По умолчанию</Badge>
                        )}
                        {!profile.isActive && (
                          <Badge className="bg-vista-secondary/50 text-vista-light/70">Неактивен</Badge>
                        )}
                      </div>
                      <p className="text-sm text-vista-light/60">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditProfile(profile.id)}
                      className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно создания профиля */}
      <CreateGpsProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchProfiles}
      />

      {/* Модальное окно редактирования профиля */}
      <EditGpsProfileModal
        isOpen={isEditModalOpen}
        profileId={selectedProfileId}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProfileId(null);
        }}
        onUpdated={fetchProfiles}
      />
    </div>
  );
} 