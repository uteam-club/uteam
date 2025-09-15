'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, BarChart3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getGpsReportById, getGpsProfileById, getGpsColumnMappingsByProfileId, fetchGpsPlayerMappings } from '@/lib/gps-api';
import { GpsReport, GpsProfile, GpsColumnMapping, GpsPlayerMapping } from '@/types/gps';
import GpsReportSelector from './GpsReportSelector';
import GpsReportVisualization from './GpsReportVisualization';
import NewUploadGpsReportModal from './NewUploadGpsReportModal';

export default function GpsAnalysisTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GpsReport | null>(null);
  const [gpsProfile, setGpsProfile] = useState<GpsProfile | null>(null);
  const [columnMappings, setColumnMappings] = useState<GpsColumnMapping[]>([]);
  const [playerMappings, setPlayerMappings] = useState<GpsPlayerMapping[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleReportSelected = async (report: GpsReport) => {
    setSelectedReport(report);
    setLoading(true);
    
    try {
      // Загружаем GPS профиль
      if (!report.profileId) {
        throw new Error('GPS профиль не указан в отчете');
      }
      
      const profile = await getGpsProfileById(report.profileId);
      if (!profile) {
        throw new Error('GPS профиль не найден');
      }
      setGpsProfile(profile);

      // Загружаем настройки колонок
      const mappings = await getGpsColumnMappingsByProfileId(profile.id);
      setColumnMappings(mappings);

      // Загружаем маппинги игроков
      const playerMaps = await fetchGpsPlayerMappings(report.id);
      setPlayerMappings(playerMaps);

      // Загружаем данные отчета (rawData)
      const reportDataResponse = await fetch(`/api/gps/reports/${report.id}/data`);
      if (!reportDataResponse.ok) {
        throw new Error('Не удалось загрузить данные отчета');
      }
      const reportData = await reportDataResponse.json();
      
      // Обновляем отчет с загруженными данными
      const updatedReport = {
        ...report,
        rawData: reportData.rawData || [],
        columns: reportData.columns || []
      };
      setSelectedReport(updatedReport);

    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные отчета',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок с кнопкой загрузки и селектором отчетов */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <GpsReportSelector onReportSelected={handleReportSelected} />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-[200px] bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-2 font-normal text-sm flex-shrink-0"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Новый отчет
        </Button>
      </div>

      {/* Визуализация отчета */}
      {selectedReport && (
        <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
            </div>
          ) : gpsProfile && columnMappings.length > 0 ? (
            <GpsReportVisualization
              gpsReport={selectedReport}
              gpsProfile={gpsProfile}
              columnMappings={columnMappings}
              playerMappings={playerMappings}
            />
          ) : (
            <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
              <p className="text-vista-light/60">Не удалось загрузить данные отчета</p>
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние */}
      {!selectedReport && (
        <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
          <BarChart3 className="h-12 w-12 text-vista-light/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-vista-light">Нет выбранного отчета</h3>
          <p className="text-vista-light/60 text-center">
            Выберите GPS отчет для анализа данных
          </p>
          <p className="text-sm mt-2 text-vista-light/50">Используйте селектор выше для выбора команды и события</p>
        </div>
      )}

      {/* Модал загрузки отчета */}
      <NewUploadGpsReportModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onReportUploaded={() => {
          setShowUploadModal(false);
          toast({
            title: 'Успех',
            description: 'GPS отчет успешно загружен',
          });
        }}
      />
    </div>
  );
}