'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, BarChart3, Activity, MapPin, Clock, Users, Trash2, Share2, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UploadGpsReportModal from './UploadGpsReportModal';
import GpsVisualization from './GpsVisualization';

interface Team {
  id: string;
  name: string;
}

interface Training {
  id: string;
  name: string;
  date: string;
  time: string;
  reportId: string;
  reportName: string;
}

interface Match {
  id: string;
  name: string;
  date: string;
  opponent: string;
  teamGoals: number;
  opponentGoals: number;
  reportId: string;
  reportName: string;
}

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  gpsSystem: string;
  eventType: 'TRAINING' | 'MATCH';
  eventId: string;
  teamId: string;
  profileId?: string;
  processedData: any[];
  rawData: any[];
  createdAt: string;
  isProcessed: boolean;
}

interface GpsDataPoint {
  name: string;
  [key: string]: any; // Динамические поля из профиля
}

export default function GpsReportsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: session } = useSession();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedReport, setSelectedReport] = useState<GpsReport | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Фильтры
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<'TRAINING' | 'MATCH' | ''>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  useEffect(() => {
    fetchTeams();
  }, []);

  // Загрузка событий при выборе команды и типа события
  useEffect(() => {
    if (selectedTeam && selectedEventType) {
      if (selectedEventType === 'TRAINING') {
        fetchTrainings(selectedTeam);
      } else if (selectedEventType === 'MATCH') {
        fetchMatches(selectedTeam);
      }
    }
  }, [selectedTeam, selectedEventType]);



  // Загрузка отчета при выборе события
  useEffect(() => {
    if (selectedEvent) {
      // Находим выбранное событие и получаем reportId
      const selectedTraining = trainings.find(t => t.id === selectedEvent);
      const selectedMatch = matches.find(m => m.id === selectedEvent);
      
      if (selectedTraining && selectedTraining.reportId) {
        fetchReportById(selectedTraining.reportId);
      } else if (selectedMatch && selectedMatch.reportId) {
        fetchReportById(selectedMatch.reportId);
      } else {
        setSelectedReport(null);
      }
    }
  }, [selectedEvent, trainings, matches]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Ошибка при получении команд:', error);
    }
  };

  const fetchTrainings = async (teamId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trainings?teamId=${teamId}&forUpload=false`);
      if (response.ok) {
        const data = await response.json();
        // Фильтруем только тренировки с GPS отчетами
        const trainingsWithReports = data.filter((training: any) => training.reportId);
        console.log(`📊 Тренировки: ${data.length} всего, ${trainingsWithReports.length} с GPS отчетами`);
        setTrainings(trainingsWithReports);
      }
    } catch (error) {
      console.error('Ошибка при получении тренировок:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatches = async (teamId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/matches?teamId=${teamId}&forUpload=false`);
      if (response.ok) {
        const data = await response.json();
        // Фильтруем только матчи с GPS отчетами
        const matchesWithReports = data.filter((match: any) => match.reportId);
        console.log(`📊 Матчи: ${data.length} всего, ${matchesWithReports.length} с GPS отчетами`);
        setMatches(matchesWithReports);
      }
    } catch (error) {
      console.error('Ошибка при получении матчей:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const deleteReport = async (reportId: string, reportName: string) => {
    console.log('🗑️ Попытка удаления отчета:', { reportId, reportName });
    
    // Подтверждение удаления
    if (!confirm(`Вы уверены, что хотите удалить отчет "${reportName}"? Это действие нельзя отменить.`)) {
      console.log('❌ Удаление отменено пользователем');
      return;
    }

    try {
      console.log('📡 Отправляем запрос на удаление:', `/api/gps-reports/${reportId}`);
      const response = await fetch(`/api/gps-reports/${reportId}`, {
        method: 'DELETE'
      });
      
      console.log('📊 Ответ сервера:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Успешное удаление:', result);
        
        toast({
          title: "Успешно",
          description: `Отчет "${reportName}" удален`,
        });
        

        
        // Если удаляемый отчет был выбран, очищаем выбор
        if (selectedReport?.id === reportId) {
          console.log('🧹 Очищаем выбранный отчет');
          setSelectedReport(null);
          setSelectedProfile(null);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Ошибка сервера:', errorData);
        
        toast({
          title: "Ошибка",
          description: errorData.error || "Не удалось удалить отчет",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Ошибка при удалении отчета:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отчет",
        variant: "destructive",
      });
    }
  };

  const fetchReportById = async (reportId: string) => {
    if (!reportId) {
      console.error('❌ ReportId не передан');
      setSelectedReport(null);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Запрашиваем отчет:', reportId);
      
      const response = await fetch(`/api/gps-reports/${reportId}`);
      
      if (response.ok) {
        const report = await response.json();
        logImportant('Найден отчет', { 
          name: report.name, 
          processedDataLength: Array.isArray(report.processedData) ? report.processedData.length : 0,
          eventId: report.eventId 
        });
        setSelectedReport(report);
        
        // Загружаем профиль для отчета
        if (report.profileId) {
          await fetchProfile(report.profileId);
        } else {
          setSelectedProfile(createDemoProfile());
        }
      } else {
        console.error('❌ Ошибка API:', response.status, response.statusText);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('❌ Ошибка при получении отчета:', error);
      setSelectedReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/gps-profiles/${profileId}`);
      if (response.ok) {
        const profile = await response.json();
        logImportant('Профиль загружен', { 
          id: profile.id, 
          name: profile.name,
          columnMappingLength: Array.isArray(profile.columnMapping) ? profile.columnMapping.length : 0
        });
        setSelectedProfile(profile);
      } else {
        console.log('⚠️ Профиль не найден, создаем демо профиль');
        setSelectedProfile(createDemoProfile());
      }
    } catch (error) {
      console.error('❌ Ошибка при получении профиля:', error);
      console.log('🔧 Создаем демо профиль из-за ошибки');
      setSelectedProfile(createDemoProfile());
    }
  };

  const createDemoProfile = () => {
    return {
      id: 'demo-profile',
      name: 'Демо профиль',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        { type: 'column', name: 'total', mappedColumn: 'TOTAL', displayName: 'Общее расстояние', dataType: 'number', isVisible: true },
        { type: 'column', name: 'zone3', mappedColumn: 'ZONE 3', displayName: 'Зона 3', dataType: 'number', isVisible: true },
        { type: 'column', name: 'zone4', mappedColumn: 'ZONE 4', displayName: 'Зона 4', dataType: 'number', isVisible: true },
        { type: 'column', name: 'zone5', mappedColumn: 'ZONE 5', displayName: 'Зона 5', dataType: 'number', isVisible: true },
        { type: 'column', name: 'sprints', mappedColumn: 'SPRINTS', displayName: 'Спринты', dataType: 'number', isVisible: true },
        { type: 'column', name: 'maxSpeed', mappedColumn: 'MAX SPEED', displayName: 'Макс. скорость', dataType: 'number', isVisible: true },
        { type: 'column', name: 'mPerMin', mappedColumn: 'M/MIN', displayName: 'М/мин', dataType: 'number', isVisible: true },
        { type: 'column', name: 'minutes', mappedColumn: 'MIN', displayName: 'Время', dataType: 'number', isVisible: true }
      ],
      metricsConfig: {
        primaryMetrics: ['total', 'zone3', 'zone4', 'zone5', 'sprints', 'maxSpeed'],
        secondaryMetrics: ['mPerMin', 'minutes'],
        chartTypes: {
          total: 'bar',
          zone3: 'bar',
          zone4: 'bar',
          zone5: 'bar',
          sprints: 'bar',
          maxSpeed: 'line'
        }
      },
      visualizationConfig: {
        colors: {
          total: '#3B82F6',
          zone3: '#F59E0B',
          zone4: '#EF4444',
          zone5: '#8B5CF6',
          sprints: '#10B981',
          maxSpeed: '#EC4899'
        },
        defaultChartType: 'bar'
      }
    };
  };

  const generateDemoData = () => {
    return [
      { name: 'Youssouf Adji', total: 10991, zone3: 2089, zone4: 801, zone5: 159, sprints: 13, mPerMin: 122, sTdPercent: 1.4, accDec: '149/148', maxSpeed: 31.2, minutes: 90 },
      { name: 'Akanni Adedayo', total: 10631, zone3: 1577, zone4: 799, zone5: 314, sprints: 24, mPerMin: 118, sTdPercent: 3.0, accDec: '181/148', maxSpeed: 33.9, minutes: 90 },
      { name: 'Lweendo Chimuka', total: 10517, zone3: 2051, zone4: 493, zone5: 5, sprints: 1, mPerMin: 117, sTdPercent: 0.0, accDec: '114/112', maxSpeed: 25.6, minutes: 90 },
      { name: 'Miguel Correa Jose', total: 9654, zone3: 1742, zone4: 566, zone5: 150, sprints: 8, mPerMin: 107, sTdPercent: 1.6, accDec: '102/114', maxSpeed: 32.8, minutes: 90 },
      { name: 'Bationo Julien Eymard', total: 8704, zone3: 1255, zone4: 473, zone5: 61, sprints: 7, mPerMin: 97, sTdPercent: 0.7, accDec: '142/128', maxSpeed: 27.1, minutes: 90 },
      { name: 'Emmanuel Osondu', total: 8636, zone3: 1573, zone4: 556, zone5: 304, sprints: 18, mPerMin: 133, sTdPercent: 3.5, accDec: '97/103', maxSpeed: 33.4, minutes: 65 },
      { name: 'Manuel Campos Juan', total: 7812, zone3: 1118, zone4: 427, zone5: 88, sprints: 9, mPerMin: 112, sTdPercent: 1.1, accDec: '89/76', maxSpeed: 28.8, minutes: 70 },
      { name: 'Nelson Japhet', total: 6214, zone3: 1503, zone4: 451, zone5: 29, sprints: 4, mPerMin: 138, sTdPercent: 0.5, accDec: '92/112', maxSpeed: 28.9, minutes: 45 },
      { name: 'Fagboun Ayomide', total: 5776, zone3: 1375, zone4: 283, zone5: 72, sprints: 4, mPerMin: 128, sTdPercent: 1.2, accDec: '68/80', maxSpeed: 29.9, minutes: 45 },
      { name: 'Atchoglo Ibrahim Raymond', total: 5576, zone3: 956, zone4: 367, zone5: 136, sprints: 10, mPerMin: 124, sTdPercent: 2.4, accDec: '94/82', maxSpeed: 32.7, minutes: 45 },
      { name: 'Juan Sebastian Mosquera', total: 5341, zone3: 863, zone4: 345, zone5: 95, sprints: 8, mPerMin: 119, sTdPercent: 1.8, accDec: '88/81', maxSpeed: 30.7, minutes: 45 },
      { name: 'Senesie Janneh', total: 5183, zone3: 1091, zone4: 357, zone5: 39, sprints: 5, mPerMin: 115, sTdPercent: 0.8, accDec: '84/66', maxSpeed: 28.4, minutes: 45 }
    ];
  };

  const clearConsole = () => {
    console.clear();
    console.log('🧹 Консоль очищена');
  };

  const logImportant = (message: string, data?: any) => {
    console.log(`🔍 ${message}`, data || '');
  };

  const copyPublicLink = async () => {
    if (!selectedReport) return;
    
    try {
      // Генерируем публичную ссылку
      const publicUrl = `${window.location.origin}/public/gps-report/${selectedReport.id}`;
      
      // Копируем в буфер обмена
      await navigator.clipboard.writeText(publicUrl);
      
      // Показываем уведомление
      toast({
        title: "Ссылка скопирована!",
        description: "Публичная ссылка на отчет скопирована в буфер обмена",
      });
      
      // Временно показываем галочку
      setCopiedLink(selectedReport.id);
      setTimeout(() => setCopiedLink(null), 2000);
      
    } catch (error) {
      console.error('Ошибка при копировании ссылки:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  const generateTestData = () => {
    console.log('🧪 Генерируем тестовые данные');
    
    // Создаем тестовый отчет
    const testReport = {
      id: 'test-report',
      name: 'Тестовый отчет',
      fileName: 'test.xlsx',
      gpsSystem: 'B-SIGHT',
      eventType: 'TRAINING' as const,
      eventId: selectedEvent || 'test-event',
      teamId: selectedTeam || 'test-team',
      profileId: 'test-profile',
      processedData: [
        { name: 'Игрок 1', total: 10000, zone3: 2000, zone4: 800, zone5: 150, sprints: 12, maxSpeed: 30.5, mPerMin: 120, minutes: 90 },
        { name: 'Игрок 2', total: 9500, zone3: 1800, zone4: 750, zone5: 120, sprints: 10, maxSpeed: 29.8, mPerMin: 115, minutes: 90 },
        { name: 'Игрок 3', total: 11000, zone3: 2200, zone4: 900, zone5: 180, sprints: 15, maxSpeed: 32.1, mPerMin: 125, minutes: 90 },
        { name: 'Игрок 4', total: 8800, zone3: 1600, zone4: 700, zone5: 100, sprints: 8, maxSpeed: 28.5, mPerMin: 110, minutes: 90 },
        { name: 'Игрок 5', total: 10200, zone3: 1900, zone4: 850, zone5: 140, sprints: 11, maxSpeed: 31.2, mPerMin: 118, minutes: 90 }
      ],
      rawData: [],
      createdAt: new Date().toISOString(),
      isProcessed: true
    };
    
    console.log('📊 Тестовый отчет:', testReport);
    setSelectedReport(testReport);
    setSelectedProfile(createDemoProfile());
  };

  const transformGpsData = (processedData: any[]): GpsDataPoint[] => {
    if (!processedData || !Array.isArray(processedData)) {
      return [];
    }
    
    if (processedData.length === 0) {
      return [];
    }
    
    const transformed = processedData.map((row: any, index: number) => {
      const transformedRow: GpsDataPoint = {
        name: row.name || row.Name || row.NAME || row.playerName || `Неизвестный игрок ${index + 1}`
      };
      
      // Добавляем все остальные поля как есть
      Object.keys(row).forEach(key => {
        if (key !== 'name' && key !== 'Name' && key !== 'NAME' && key !== 'playerName') {
          transformedRow[key] = row[key];
        }
      });
      
      return transformedRow;
    });
    
    logImportant('Данные трансформированы', { 
      inputLength: processedData.length, 
      outputLength: transformed.length,
      firstRecordKeys: transformed[0] ? Object.keys(transformed[0]) : []
    });
    
    return transformed;
  };

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">Выбор события для анализа</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-vista-light/70">Команда</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-vista-light/70">Тип события</label>
              <Select 
                value={selectedEventType} 
                onValueChange={(value) => setSelectedEventType(value as 'TRAINING' | 'MATCH')}
                disabled={!selectedTeam}
              >
                <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder="Выберите тип события" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="TRAINING">Тренировка</SelectItem>
                  <SelectItem value="MATCH">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-vista-light/70">
                {selectedEventType === 'TRAINING' ? 'Тренировка' : selectedEventType === 'MATCH' ? 'Матч' : 'Событие'}
              </label>
              <Select 
                value={selectedEvent} 
                onValueChange={setSelectedEvent}
                disabled={!selectedEventType || isLoading}
              >
                <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={isLoading ? 'Загрузка...' : `Выберите ${selectedEventType === 'TRAINING' ? 'тренировку' : 'матч'}`} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {selectedEventType === 'TRAINING' ? (
                    trainings.length > 0 ? (
                      trainings.map(training => (
                        <SelectItem key={training.id} value={training.id}>
                          {new Date(training.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })} {training.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-vista-light/50">
                        Нет тренировок с GPS отчетами
                      </div>
                    )
                  ) : selectedEventType === 'MATCH' ? (
                    matches.length > 0 ? (
                      matches.map(match => (
                        <SelectItem key={match.id} value={match.id}>
                          {new Date(match.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })} {match.name} {match.teamGoals}:{match.opponentGoals} {match.opponent}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-vista-light/50">
                        Нет матчей с GPS отчетами
                      </div>
                    )
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex-1 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              >
                <Upload className="w-4 h-4 mr-2" />
                Загрузить
              </Button>
              {selectedReport && (
                <>
                  <Button
                    variant="outline"
                    onClick={copyPublicLink}
                    className="border-vista-primary/50 text-vista-primary hover:bg-vista-primary/10"
                    title="Поделиться отчетом"
                  >
                    {copiedLink === selectedReport.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => deleteReport(selectedReport.id, selectedReport.name)}
                    className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                    title="Удалить отчет"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список отчетов команды */}


      {/* Визуализация отчета */}
      {selectedReport && selectedProfile ? (
        (() => {
          const transformedData = transformGpsData(selectedReport.processedData);
          console.log('🎨 Рендерим визуализацию с данными:', transformedData);
          console.log('📊 Профиль:', selectedProfile);
          console.log('📋 Структура профиля:', selectedProfile ? Object.keys(selectedProfile) : 'нет профиля');
          console.log('🔧 columnMapping:', selectedProfile?.columnMapping);
          
          if (transformedData.length === 0) {
            return (
              <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-vista-light">Нет данных для отображения</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-vista-light/50">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Отчет не содержит обработанных данных</p>
                    <p className="text-sm mt-2">Попробуйте загрузить отчет заново или проверьте формат файла</p>
                  </div>
                </CardContent>
              </Card>
            );
          }
          
          // Находим название выбранной команды
          const selectedTeamName = teams.find(team => team.id === selectedTeam)?.name || 'Неизвестно';
          
          return (
            <GpsVisualization
              data={transformedData}
              profile={selectedProfile}
              eventName={selectedReport.name}
              eventDate={selectedReport.createdAt}
              teamName={selectedTeamName}
              reportId={selectedReport.id}
              teamId={selectedTeam}
              eventType={selectedReport.eventType}
            />
          );
        })()
      ) : selectedEvent ? (
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-vista-light">Отчет не найден</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-vista-light/50">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Для выбранного события нет загруженного GPS отчета</p>
              <p className="text-sm mt-2">Загрузите отчет для этого события, чтобы увидеть анализ</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Модальное окно загрузки */}
      <UploadGpsReportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={() => {
              if (selectedEvent) {
      // Находим выбранное событие и получаем reportId
      const selectedTraining = trainings.find(t => t.id === selectedEvent);
      const selectedMatch = matches.find(m => m.id === selectedEvent);
      
      if (selectedTraining) {
        fetchReportById(selectedTraining.reportId);
      } else if (selectedMatch) {
        fetchReportById(selectedMatch.reportId);
      }
    }
        }}
      />
    </div>
  );
} 