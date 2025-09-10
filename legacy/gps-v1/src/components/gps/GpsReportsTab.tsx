'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UploadGpsReportModal from './UploadGpsReportModal';
import GpsReportTable from "@/components/gps/GpsReportTable";

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


export default function GpsReportsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: session } = useSession();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Фильтры
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<'TRAINING' | 'MATCH' | ''>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  
  // Состояния для таблицы отчета
  const [reportCanonRows, setReportCanonRows] = React.useState<any[] | null>(null);
  const [reportProfile, setReportProfile] = React.useState<any | null>(null);
  const [reportMeta, setReportMeta] = React.useState<any | null>(null);
  const [isTableLoading, setIsTableLoading] = React.useState(false);
  const [tableError, setTableError] = React.useState<string | null>(null);

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

  // Загрузка отчета и профиля при выборе события
  React.useEffect(() => {
    const selectedMatch = matches.find(m => m.id === selectedEvent);
    const selectedTraining = trainings.find(t => t.id === selectedEvent);
    const reportId = selectedMatch?.reportId ?? selectedTraining?.reportId;
    
    if (!reportId) {
      setReportCanonRows(null);
      setReportProfile(null);
      setReportMeta(null);
      setTableError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsTableLoading(true);
      setTableError(null);
      try {
        const r = await fetch(`/api/gps-reports/${reportId}`);
        if (!r.ok) throw new Error("Не удалось загрузить отчет");
        const report = await r.json();

        // Временные логи для диагностики
        console.log('[GPS] resp keys:', Object.keys(report || {}));
        console.log('[GPS] canonical rows:', report?.processedData?.canonical?.rows?.length);
        console.log('[GPS] canonical meta:', report?.processedData?.canonical?.meta);

        const canon = report?.processedData?.canonical;
            if (!canon?.rows?.length) {
              setReportCanonRows([]);
              setReportProfile(null);
              setReportMeta(null);
              setTableError("В отчете нет канонических данных. Перезагрузите файл через профиль.");
              // Добавляем логирование предупреждений
              if (canon?.meta?.warnings && canon.meta.warnings.length > 0) {
                console.warn('[GPS] Canonical warnings:', JSON.stringify(canon.meta.warnings, null, 2));
              }
              return;
            }

        // Используем profileSnapshot из отчёта вместо живого профиля
        const profileSnapshot = report.profileSnapshot;
        
        if (!profileSnapshot) {
          // Fallback для старых отчётов без snapshot
          console.warn('Отчёт без profileSnapshot, загружаем живой профиль');
          const p = await fetch(`/api/gps-profiles/${report.profileId}`);
          if (!p.ok) throw new Error("Не удалось загрузить профиль отчета");
          const profile = await p.json();
          
          if (!cancelled) {
            setReportCanonRows(canon.rows);
            setReportProfile(profile);
            setReportMeta(canon.meta);
          }
        } else {
          // Используем snapshot для стабильной визуализации
          if (!cancelled) {
            setReportCanonRows(canon.rows);
            setReportProfile({
              id: report.profileId,
              columnMapping: profileSnapshot.columns.map((col: any) => ({
                name: col.displayName,
                mappedColumn: col.sourceHeader,
                canonicalKey: col.canonicalKey,
                isVisible: col.isVisible,
                order: col.order,
                unit: col.unit,
                transform: col.transform,
              })),
              gpsSystem: profileSnapshot.gpsSystem,
            });
            setReportMeta(canon.meta);
          }
        }
      } catch (e:any) {
        if (!cancelled) setTableError(e.message || "Ошибка загрузки данных");
      } finally {
        if (!cancelled) setIsTableLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedEvent, matches, trainings]);




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
        setMatches(matchesWithReports);
      }
    } catch (error) {
      console.error('Ошибка при получении матчей:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const deleteReport = async (reportId: string, reportName: string) => {
    // Подтверждение удаления
    if (!confirm(`Вы уверены, что хотите удалить отчет "${reportName}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/gps-reports/${reportId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Успешно",
          description: `Отчет "${reportName}" удален`,
        });
        
      } else {
        const errorData = await response.json();
        
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
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal shadow-lg data-[value]:text-vista-light">
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-light/20 shadow-2xl rounded-lg">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select 
                value={selectedEventType} 
                onValueChange={(value) => setSelectedEventType(value as 'TRAINING' | 'MATCH')}
                disabled={!selectedTeam}
              >
                <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal shadow-lg data-[value]:text-vista-light">
                  <SelectValue placeholder="Выберите тип события" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-light/20 shadow-2xl rounded-lg">
                  <SelectItem value="TRAINING">Тренировка</SelectItem>
                  <SelectItem value="MATCH">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select 
                value={selectedEvent} 
                onValueChange={setSelectedEvent}
                disabled={!selectedEventType || isLoading}
              >
                <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal shadow-lg data-[value]:text-vista-light">
                  <SelectValue placeholder={isLoading ? 'Загрузка...' : `Выберите ${selectedEventType === 'TRAINING' ? 'тренировку' : 'матч'}`} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-light/20 shadow-2xl rounded-lg">
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
            
            <div className="flex items-end justify-end gap-2">
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                variant="outline"
                className="bg-vista-dark/30 backdrop-blur-sm border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal shadow-lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Загрузить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список отчетов команды */}

      {/* Таблица отчета */}
      {isTableLoading ? (
        <div className="mt-6 rounded-lg border border-border/50 bg-card/30 p-10 text-center text-muted-foreground">
          Загрузка данных отчёта…
        </div>
      ) : tableError ? (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-10 text-center text-destructive">
          {tableError}
        </div>
      ) : reportCanonRows && reportProfile ? (
        <>
          {/* Диагностическая панель */}
          <div className="mt-6 rounded-lg border border-vista-secondary/30 bg-vista-dark/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-vista-light">Диагностика отчёта</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(() => {
                const rowsLen = reportCanonRows.length;
                let input = reportMeta?.counts?.input ?? 0;
                let filtered = reportMeta?.counts?.filtered ?? 0;
                let canonical = reportMeta?.counts?.canonical ?? rowsLen;

                // если сервер по какой-то причине не проставил counts, но rows есть — подстрахуйся
                if ((input === 0 && canonical === 0) && rowsLen > 0) {
                  input = rowsLen; 
                  filtered = 0; 
                  canonical = rowsLen;
                }

                return (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-vista-light">
                        {input}
                      </div>
                      <div className="text-xs text-vista-light/70">Всего строк входных</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {filtered}
                      </div>
                      <div className="text-xs text-vista-light/70">Отфильтровано из-за отсутствия маппинга</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {canonical}
                      </div>
                      <div className="text-xs text-vista-light/70">Вошло в отчёт (canonical)</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Предупреждения */}
            {reportMeta?.warnings && reportMeta.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-vista-light">Предупреждения:</div>
                {reportMeta.warnings.map((warning: string, index: number) => {
                  let message = warning;
                  let alertType = 'info';
                  
                  if (warning.startsWith('unmapped_rows_dropped:')) {
                    const count = warning.split(':')[1];
                    message = `Отфильтровано без маппинга: ${count}`;
                    alertType = 'warning';
                  } else if (warning === 'mapping:no-matches') {
                    message = 'Нет ни одной строки с маппингом';
                    alertType = 'error';
                  } else if (warning.startsWith('mapping:missing-columns:')) {
                    const columns = warning.split(':')[1];
                    message = `В файле отсутствуют нужные колонки: ${columns}`;
                    alertType = 'warning';
                  } else if (warning.startsWith('no-conversion:')) {
                    const parts = warning.split(':')[1];
                    message = `Не удалось конвертировать единицы ${parts}`;
                    alertType = 'warning';
                  }

                  return (
                    <div key={index} className={`text-sm ${
                      alertType === 'error' ? 'text-red-400' : 
                      alertType === 'warning' ? 'text-orange-400' : 
                      'text-blue-400'
                    }`}>
                      • {message}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alert если нет канонических данных */}
            {(() => {
              const rowsLen = reportCanonRows.length;
              let canonical = reportMeta?.counts?.canonical ?? rowsLen;
              
              // если сервер по какой-то причине не проставил counts, но rows есть — подстрахуйся
              if ((reportMeta?.counts?.input ?? 0) === 0 && canonical === 0 && rowsLen > 0) {
                canonical = rowsLen;
              }
              
              return canonical === 0 ? (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <div className="text-sm text-red-400">
                    ⚠️ В отчёте нет канонических данных — проверьте маппинг игроков и соответствие профилю
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          <GpsReportTable rows={reportCanonRows} profile={reportProfile} meta={reportMeta} />
        </>
      ) : null}

      {/* Модальное окно загрузки */}
      <UploadGpsReportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={() => {
          // Обновляем списки тренировок/матчей после загрузки
          if (selectedTeam && selectedEventType) {
            if (selectedEventType === 'TRAINING') {
              fetchTrainings(selectedTeam);
            } else if (selectedEventType === 'MATCH') {
              fetchMatches(selectedTeam);
            }
          }
        }}
      />
    </div>
  );
} 