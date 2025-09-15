'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Eye, EyeOff } from 'lucide-react';
import { GpsProfile, GpsColumnMapping } from '@/types/gps';
import {
  fetchGpsColumnMappings,
  createGpsColumnMapping,
  updateGpsColumnMapping,
  deleteGpsColumnMapping 
} from '@/lib/gps-api';
import { getAllCanonicalMetrics, getMetricLabel } from '@/lib/canonical-metrics';
import { toast } from '@/components/ui/use-toast';
import CreateColumnMappingModal from './CreateColumnMappingModal';
import EditColumnMappingModal from './EditColumnMappingModal';

interface GpsProfileDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: GpsProfile & { usedReportsCount?: number };
}

export default function GpsProfileDetailsModal({
  open,
  onOpenChange,
  profile,
}: GpsProfileDetailsModalProps) {
  const [mappings, setMappings] = useState<GpsColumnMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMapping, setShowCreateMapping] = useState(false);
  const [showEditMapping, setShowEditMapping] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<GpsColumnMapping | null>(null);

  const canonicalMetrics = getAllCanonicalMetrics();

  const loadMappings = async () => {
    setLoading(true);
    try {
      const data = await fetchGpsColumnMappings(profile.id);
      setMappings(data);
    } catch (error) {
      console.error('Error loading column mappings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить маппинги столбцов',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && profile) {
      loadMappings();
    }
  }, [open, profile]);

  const handleCreateMapping = () => {
    setSelectedMapping(null);
    setShowCreateMapping(true);
  };

  const handleEditMapping = (mapping: GpsColumnMapping) => {
    setSelectedMapping(mapping);
    setShowEditMapping(true);
  };

  const handleDeleteMapping = async (mapping: GpsColumnMapping) => {
    if (!confirm(`Удалить маппинг для столбца "${mapping.sourceColumn}"?`)) {
      return;
    }

    try {
      await deleteGpsColumnMapping(mapping.id, mapping.gpsProfileId);
      toast({
        title: 'Успех',
        description: 'Маппинг удален',
      });
      loadMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить маппинг',
        variant: 'destructive',
      });
    }
  };

  const handleToggleVisibility = async (mapping: GpsColumnMapping) => {
    try {
      const updated = await updateGpsColumnMapping(mapping.id, {
        gpsProfileId: mapping.gpsProfileId,
        isVisible: !mapping.isVisible,
      });
      
      if (updated) {
        toast({
          title: 'Успех',
          description: `Столбец ${mapping.isVisible ? 'скрыт' : 'показан'}`,
        });
        loadMappings();
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить видимость столбца',
        variant: 'destructive',
      });
    }
  };

  const handleMappingCreated = () => {
    setShowCreateMapping(false);
    loadMappings();
  };

  const handleMappingUpdated = () => {
    setShowEditMapping(false);
    loadMappings();
  };

  const getMetricLabelByKey = (key: string) => {
    const metric = canonicalMetrics.find(m => m.key === key);
    return metric ? getMetricLabel(key) : key;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {profile.name}
            </DialogTitle>
            <DialogDescription>
              Настройка маппинга столбцов для GPS системы {profile.gpsSystem}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="mappings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mappings">Маппинги столбцов</TabsTrigger>
              <TabsTrigger value="preview">Предварительный просмотр</TabsTrigger>
            </TabsList>

            <TabsContent value="mappings" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Маппинги столбцов</h3>
                  <p className="text-sm text-muted-foreground">
                    Сопоставьте столбцы из GPS файлов с каноническими метриками
                  </p>
                </div>
                <Button 
                  onClick={handleCreateMapping} 
                  className="flex items-center gap-2"
                  disabled={!!(profile.usedReportsCount && profile.usedReportsCount > 0)}
                >
                  <Plus className="h-4 w-4" />
                  Добавить маппинг
                </Button>
              </div>

              {profile.usedReportsCount && profile.usedReportsCount > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  Структура профиля заморожена: можно менять только отображение (названия, порядок, видимость, единицы).
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Загрузка маппингов...</div>
                </div>
              ) : mappings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет маппингов</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Добавьте маппинги столбцов для корректной обработки GPS данных
                    </p>
                    <Button 
                      onClick={handleCreateMapping} 
                      className="flex items-center gap-2"
                      disabled={!!(profile.usedReportsCount && profile.usedReportsCount > 0)}
                    >
                      <Plus className="h-4 w-4" />
                      Добавить маппинг
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <Card key={mapping.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Исходный столбец
                              </div>
                              <div className="font-mono text-sm">{mapping.sourceColumn}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Кастомное название
                              </div>
                              <div className="font-medium">{mapping.customName}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Каноническая метрика
                              </div>
                              <div className="text-sm">
                                {getMetricLabelByKey(mapping.canonicalMetric)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Единица отображения
                              </div>
                              <div className="text-sm">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {mapping.displayUnit || 'Авто'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleVisibility(mapping)}
                              disabled={!!(profile.usedReportsCount && profile.usedReportsCount > 0)}
                              title={profile.usedReportsCount && profile.usedReportsCount > 0 
                                ? "Профиль уже используется в отчётах. Включать/выключать колонки нельзя." 
                                : mapping.isVisible ? "Скрыть столбец" : "Показать столбец"
                              }
                            >
                              {mapping.isVisible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMapping(mapping)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {mapping.description && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {mapping.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={mapping.isVisible ? 'default' : 'secondary'}>
                            {mapping.isVisible ? 'Видимый' : 'Скрытый'}
                          </Badge>
                          <Badge variant="outline">
                            Порядок: {mapping.displayOrder}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Предварительный просмотр</h3>
                <p className="text-sm text-muted-foreground">
                  Как будут выглядеть столбцы в GPS отчетах
                </p>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Игрок</th>
                          {mappings
                            .filter(m => m.isVisible)
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((mapping) => (
                              <th key={mapping.id} className="text-left p-3 font-medium">
                                {mapping.customName}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3 text-muted-foreground">Иванов И.И.</td>
                          {mappings
                            .filter(m => m.isVisible)
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((mapping) => (
                              <td key={mapping.id} className="p-3 text-muted-foreground">
                                —
                              </td>
                            ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {showCreateMapping && (
        <CreateColumnMappingModal
          open={showCreateMapping}
          onOpenChange={setShowCreateMapping}
          profileId={profile.id}
          onMappingCreated={handleMappingCreated}
          usedReportsCount={profile.usedReportsCount}
        />
      )}

      {showEditMapping && selectedMapping && (
        <EditColumnMappingModal
          open={showEditMapping}
          onOpenChange={setShowEditMapping}
          mapping={selectedMapping}
          onMappingUpdated={handleMappingUpdated}
          usedReportsCount={profile.usedReportsCount}
        />
      )}
    </>
  );
}
