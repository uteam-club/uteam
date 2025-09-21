'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GpsProfileColumn {
  id: string;
  canonicalMetricCode: string;
  displayName: string;
  displayUnit: string;
  displayOrder: number;
}

interface GpsProfile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  columns: GpsProfileColumn[];
}

interface ViewGpsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string | null;
}

export function ViewGpsProfileModal({ isOpen, onClose, profileId }: ViewGpsProfileModalProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile();
    }
  }, [isOpen, profileId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gps/profiles/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить профиль',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке профиля',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProfile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-vista-dark/95 border-vista-secondary/50">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-vista-light text-xl font-semibold">
            {profile?.name || 'Просмотр профиля'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-vista-light/70 hover:text-vista-light"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-vista-light/70" />
              <span className="ml-2 text-vista-light/70">Загрузка профиля...</span>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Информация о профиле */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-vista-light">{profile.name}</h3>
                  <Badge 
                    variant={profile.isActive ? 'default' : 'secondary'} 
                    className={`text-xs ${
                      profile.isActive 
                        ? 'bg-vista-primary/20 text-vista-primary border-vista-primary/30' 
                        : 'bg-vista-dark/50 text-vista-light/70 border-vista-secondary/30'
                    }`}
                  >
                    {profile.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
                {profile.description && (
                  <p className="text-vista-light/70 text-sm">{profile.description}</p>
                )}
              </div>

              {/* Пример таблицы */}
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-vista-light">Пример отображения таблицы</h4>
                <div className="border border-vista-secondary/30 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-vista-dark/50 border-vista-secondary/30">
                        <TableHead className="text-vista-light font-semibold">Игрок</TableHead>
                        {profile.columns
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((column) => (
                            <TableHead key={column.id} className="text-vista-light font-semibold text-center">
                              <div className="space-y-1">
                                <div>{column.displayName}</div>
                                <div className="text-xs text-vista-light/60 font-normal">
                                  ({column.displayUnit})
                                </div>
                              </div>
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Примеры данных */}
                      {['Игрок 1', 'Игрок 2', 'Игрок 3'].map((player, playerIndex) => (
                        <TableRow key={player} className="border-vista-secondary/30 hover:bg-vista-dark/30">
                          <TableCell className="text-vista-light font-medium">{player}</TableCell>
                          {profile.columns
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((column) => (
                              <TableCell key={column.id} className="text-vista-light/70 text-center">
                                {getExampleValue(column.canonicalMetricCode, playerIndex)}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Информация о колонках */}
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-vista-light">Настройки колонок</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.columns
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((column) => (
                      <div 
                        key={column.id} 
                        className="p-3 rounded-lg border bg-vista-primary/10 border-vista-primary/30"
                      >
                        <div className="space-y-1">
                          <div className="text-vista-light font-medium">{column.displayName}</div>
                          <div className="text-xs text-vista-light/60">
                            {column.canonicalMetricCode} • {column.displayUnit}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-vista-light/70">Профиль не найден</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Функция для генерации примеров значений
function getExampleValue(metricCode: string, playerIndex: number): string {
  const examples: { [key: string]: string[] } = {
    'total_distance': ['8.2', '7.5', '9.1'],
    'max_speed': ['32.4', '29.8', '35.2'],
    'avg_speed': ['12.3', '11.7', '13.1'],
    'sprint_distance': ['1.2', '0.8', '1.5'],
    'high_intensity_distance': ['2.1', '1.9', '2.4'],
    'total_accelerations': ['45', '38', '52'],
    'total_decelerations': ['32', '28', '41'],
    'work_rate': ['85.2', '78.9', '91.3'],
    'player_load': ['425', '398', '467'],
    'dynamic_stress_load': ['12.3', '11.1', '14.2'],
    'metabolic_power': ['8.7', '7.9', '9.4'],
    'time_in_zones': ['15:30', '12:45', '18:20'],
    'recovery_time': ['48', '52', '44'],
    'fatigue_index': ['2.3', '2.1', '2.6'],
  };

  const values = examples[metricCode] || ['--', '--', '--'];
  return values[playerIndex] || '--';
}

export default ViewGpsProfileModal;
