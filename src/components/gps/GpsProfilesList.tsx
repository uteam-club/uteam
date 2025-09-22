'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, BarChart3, RefreshCw } from 'lucide-react';
import { EditGpsProfileModal } from './EditGpsProfileModal';
import { useToast } from '@/components/ui/use-toast';

interface GpsProfile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  columnsCount: number;
}

interface GpsProfilesListProps {
  onCreateProfile?: () => void;
  onViewProfile?: (profileId: string) => void;
  onEditProfile?: (profileId: string) => void;
  onDeleteProfile?: (profileId: string) => void;
}

export function GpsProfilesList({ 
  onCreateProfile, 
  onViewProfile, 
  onEditProfile, 
  onDeleteProfile 
}: GpsProfilesListProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gps/profiles');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить профили',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleEditClick = (profileId: string) => {
    setEditingProfileId(profileId);
    setIsEditModalOpen(true);
  };


  const handleProfileUpdated = () => {
    fetchProfiles();
  };

  const handleDelete = async (profileId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот профиль?')) {
      try {
        const response = await fetch(`/api/gps/profiles/${profileId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setProfiles(prev => prev.filter(profile => profile.id !== profileId));
          onDeleteProfile?.(profileId);
        } else {
          const errorData = await response.json();
          gpsLogger.error('Component', 'Error deleting profile:', errorData.error);
          toast({
            title: 'Ошибка',
            description: `Ошибка при удалении профиля: ${errorData.error}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        gpsLogger.error('Component', 'Error deleting profile:', error);
        toast({
          title: 'Ошибка',
          description: 'Произошла ошибка при удалении профиля',
          variant: 'destructive',
        });
      }
    }
  };

  if (loading) {
    return (
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-vista-light/70" />
          <span className="ml-2 text-vista-light/70">Загрузка профилей...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Список профилей */}
      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Card key={profile.id} className="relative bg-vista-dark/30 border-vista-secondary/30 hover:border-vista-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-vista-light">{profile.name}</CardTitle>
                  <div className="flex items-center text-sm text-vista-light/70">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {profile.columnsCount} колонок
                  </div>
                </div>
                <CardDescription className="text-vista-light/70 text-sm mt-1">{profile.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditClick(profile.id)}
                    className="flex-1 border-vista-secondary/50 text-vista-light hover:bg-vista-dark/50 text-xs h-8 min-w-0"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">Редактировать</span>
                    <span className="sm:hidden">Изменить</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(profile.id)}
                    className="flex-1 bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-8 px-3 font-normal text-xs min-w-0"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">Удалить</span>
                    <span className="sm:hidden">Удалить</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-vista-dark/30 border-vista-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-vista-light/70 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-vista-light">Нет профилей</h3>
            <p className="text-vista-light/70 text-center mb-4">
              Создайте первый профиль визуализации для отображения GPS данных
            </p>
            <Button 
              onClick={onCreateProfile}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Создать профиль
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Модалы */}
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

export default GpsProfilesList;
