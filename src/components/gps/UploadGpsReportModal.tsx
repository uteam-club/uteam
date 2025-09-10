'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PlayerMappingModal from './PlayerMappingModal';

interface UploadGpsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

interface Team {
  id: string;
  name: string;
}

interface Training {
  id: string;
  name: string;
  date: string;
  team: string;
  category: string;
}

interface Match {
  id: string;
  name: string;
  date: string;
  opponent: string;
  teamGoals: number;
  opponentGoals: number;
  teamName: string;
}

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
}

export default function UploadGpsReportModal({ isOpen, onClose, onUploaded }: UploadGpsReportModalProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  
  // Состояние формы
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [eventType, setEventType] = useState<'TRAINING' | 'MATCH' | ''>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedGpsSystem, setSelectedGpsSystem] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  // Данные для выбора
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Состояние сопоставления игроков
  const [showPlayerMapping, setShowPlayerMapping] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [playerMappings, setPlayerMappings] = useState<any[]>([]);

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      fetchProfiles();
    }
  }, [isOpen]);

  // Загрузка событий при выборе команды и типа события
  useEffect(() => {
    if (selectedTeam && eventType) {
      if (eventType === 'TRAINING') {
        fetchTrainings(selectedTeam);
      } else if (eventType === 'MATCH') {
        fetchMatches(selectedTeam);
      }
    }
  }, [selectedTeam, eventType]);

  // Загрузка профилей при выборе GPS системы
  useEffect(() => {
    if (selectedGpsSystem) {
      fetchProfiles(selectedGpsSystem);
      setSelectedProfile(''); // Сбрасываем выбранный профиль
    }
  }, [selectedGpsSystem]);

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

  const fetchProfiles = async (gpsSystem?: string) => {
    try {
      const url = gpsSystem ? `/api/gps-profiles?gpsSystem=${gpsSystem}` : '/api/gps-profiles';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Ошибка при получении профилей:', error);
    }
  };

  const fetchTrainings = async (teamId: string) => {
    try {
      setIsLoadingData(true);
      const response = await fetch(`/api/trainings?teamId=${teamId}&forUpload=true`);
      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
      }
    } catch (error) {
      console.error('Ошибка при получении тренировок:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchMatches = async (teamId: string) => {
    try {
      setIsLoadingData(true);
      const response = await fetch(`/api/matches?teamId=${teamId}&forUpload=true`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Ошибка при получении матчей:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Извлекаем имена игроков из файла
      await extractPlayerNames(selectedFile);
    }
  };

  // Обработчики drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type.includes('sheet') || droppedFile.type.includes('csv') || 
          droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || 
          droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        await extractPlayerNames(droppedFile);
      } else {
        toast({
          title: "Неверный формат файла",
          description: "Пожалуйста, выберите файл Excel (.xlsx, .xls) или CSV",
          variant: "destructive"
        });
      }
    }
  };

  const extractPlayerNames = async (file: File) => {
    if (!selectedProfile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('profileId', selectedProfile);

      const response = await fetch('/api/gps-reports/extract-players', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerNames(data.playerNames);
      } else {
        console.error('Ошибка при извлечении игроков из файла');
      }
    } catch (error) {
      console.error('Ошибка при извлечении игроков:', error);
    }
  };

  const handleSubmit = async () => {
    if (!file || !selectedTeam || !eventType || !selectedEvent || !selectedGpsSystem || !selectedProfile) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    // Если есть имена игроков, показываем модальное окно сопоставления
    if (playerNames.length > 0) {
      setShowPlayerMapping(true);
      return;
    }

    // Иначе загружаем отчет напрямую
    await uploadReport();
  };

  const uploadReport = async (customMappings?: { reportName: string; selectedPlayerId: string }[]) => {
    if (!file || !selectedTeam || !eventType || !selectedEvent || !selectedGpsSystem || !selectedProfile) {
      return;
    }

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Используем имя файла без расширения
      formData.append('teamId', selectedTeam);
      formData.append('eventType', eventType);
      formData.append('eventId', selectedEvent);
      formData.append('gpsSystem', selectedGpsSystem);
      formData.append('profileId', selectedProfile);
      
      // Добавляем маппинги игроков, если они есть
      const mappingsToUse = customMappings || playerMappings;
      console.log('🔗 playerMappings перед отправкой:', mappingsToUse);
      if (mappingsToUse.length > 0) {
        formData.append('playerMappings', JSON.stringify(mappingsToUse));
        console.log('🔗 playerMappings добавлены в formData');
      } else {
        console.log('⚠️ playerMappings пустые');
      }

      const response = await fetch('/api/gps-reports', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Обработка специфических ошибок
        if (response.status === 400 && errorData.error === 'PROFILE_REQUIRED') {
          toast({
            title: "Ошибка",
            description: "Нужно выбрать профиль GPS. Загрузите файл через профиль или укажите профиль перед загрузкой.",
            variant: "destructive"
          });
          return;
        }
        
        if (response.status === 404 && errorData.error === 'PROFILE_NOT_FOUND') {
          toast({
            title: "Ошибка",
            description: "Выбранный профиль не найден. Пожалуйста, выберите другой профиль.",
            variant: "destructive"
          });
          return;
        }
        
        throw new Error(errorData.error || 'Ошибка при загрузке отчета');
      }

      toast({
        title: "Успешно",
        description: "GPS отчет загружен и обработан",
      });

      // Сброс формы
      resetForm();
      onClose();
      onUploaded();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить отчет",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerMappingConfirm = async (mappings: { reportName: string; selectedPlayerId: string }[]) => {
    console.log('🔗 Получены маппинги от PlayerMappingModal:', mappings);
    setPlayerMappings(mappings);
    setShowPlayerMapping(false);
    
    // Теперь загружаем отчет с учетом сопоставления игроков
    await uploadReport(mappings);
  };

  const resetForm = () => {
    setSelectedTeam('');
    setEventType('');
    setSelectedEvent('');
    setSelectedProfile('');
    setSelectedGpsSystem('');
    setFile(null);
    setTrainings([]);
    setMatches([]);
    setPlayerNames([]);
    setPlayerMappings([]);
    setShowPlayerMapping(false);
    setIsDragOver(false);
    // Очищаем файловый input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getEventName = () => {
    if (eventType === 'TRAINING') {
      const training = trainings.find(t => t.id === selectedEvent);
      return training?.name || '';
    } else if (eventType === 'MATCH') {
      const match = matches.find(m => m.id === selectedEvent);
      return match?.name || '';
    }
    return '';
  };

  const getProfileName = () => {
    const profile = profiles.find(p => p.id === selectedProfile);
    return profile?.name || '';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar"
        aria-describedby="upload-gps-description"
      >
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Upload className="h-5 w-5 text-vista-primary" />
            Загрузить GPS отчет
          </DialogTitle>
        </DialogHeader>
        <div id="upload-gps-description" className="sr-only">
          Модальное окно для загрузки GPS отчета
        </div>
        
        <div className="grid gap-4 py-4 custom-scrollbar">
          {/* Выбор команды */}
          <div className="space-y-2">
            <Label htmlFor="team" className="text-vista-light/40 font-normal">Команда</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger 
                id="team"
                className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
              >
                <SelectValue placeholder="Выберите команду" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Тип события */}
          {selectedTeam && (
            <div className="space-y-2">
              <Label htmlFor="event-type" className="text-vista-light/40 font-normal">Тип события</Label>
              <Select value={eventType} onValueChange={(value) => setEventType(value as 'TRAINING' | 'MATCH')}>
                <SelectTrigger 
                  id="event-type"
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                >
                  <SelectValue placeholder="Выберите тип события" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                  <SelectItem value="TRAINING">Тренировка</SelectItem>
                  <SelectItem value="MATCH">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Конкретное событие */}
          {selectedTeam && eventType && (
            <div className="space-y-2">
              <Label htmlFor="event" className="text-vista-light/40 font-normal">{eventType === 'TRAINING' ? 'Тренировка' : 'Матч'}</Label>
              {isLoadingData ? (
                <div className="text-center py-4 text-vista-light/60">Загрузка...</div>
              ) : (
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger 
                    id="event"
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                  >
                    <SelectValue placeholder={`Выберите ${eventType === 'TRAINING' ? 'тренировку' : 'матч'}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                    {eventType === 'TRAINING' ? (
                      trainings.map(training => (
                        <SelectItem key={training.id} value={training.id}>
                          {training.name} - {new Date(training.date).toLocaleDateString()}
                        </SelectItem>
                      ))
                    ) : (
                      matches.map(match => (
                        <SelectItem key={match.id} value={match.id}>
                          {new Date(match.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })} {match.name} {match.teamGoals}:{match.opponentGoals} {match.opponent}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* GPS система */}
          {selectedEvent && (
            <div className="space-y-2">
              <Label htmlFor="gps-system" className="text-vista-light/40 font-normal">GPS система</Label>
              <Select value={selectedGpsSystem} onValueChange={setSelectedGpsSystem}>
                <SelectTrigger 
                  id="gps-system"
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                >
                  <SelectValue placeholder="Выберите GPS систему" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                  <SelectItem value="B-SIGHT">B-SIGHT</SelectItem>
                  <SelectItem value="STATSPORTS">STATSPORTS</SelectItem>
                  <SelectItem value="CATAPULT">CATAPULT</SelectItem>
                  <SelectItem value="GPSPORTS">GPSPORTS</SelectItem>
                  <SelectItem value="OTHER">Другая</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Профиль отчета */}
          {selectedGpsSystem && (
            <div className="space-y-2">
              <Label htmlFor="profile" className="text-vista-light/40 font-normal">Профиль отчета</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger 
                  id="profile"
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                >
                  <SelectValue placeholder="Выберите профиль отчета" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                  {profiles.length > 0 ? (
                    profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-vista-light/50">
                      Нет профилей для выбранной GPS системы
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Загрузка файла */}
          {selectedProfile && (
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-vista-light/40 font-normal">Файл отчета (Excel/CSV)</Label>
              
              {/* Скрытый input для файла */}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
                id="file-upload"
              />
              
              {/* Кастомное поле загрузки */}
              <div 
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer group ${
                  isDragOver 
                    ? 'border-vista-primary/60 bg-vista-primary/5' 
                    : 'border-vista-secondary/30 hover:border-vista-primary/40'
                }`}
                onClick={() => document.getElementById('file-upload')?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-vista-secondary/10 rounded-full flex items-center justify-center group-hover:bg-vista-primary/10 transition-colors flex-shrink-0">
                    <Upload className="h-4 w-4 text-vista-light/60 group-hover:text-vista-primary transition-colors" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="text-vista-light font-medium text-sm">
                      {file 
                        ? file.name 
                        : (isDragOver 
                          ? 'Отпустите файл здесь' 
                          : (
                            <>
                              Выберите файл <span className="font-normal text-vista-light/60">(.xlsx, .xls, .csv)</span>
                            </>
                          )
                        )
                      }
                    </p>
                    <p className="text-vista-light/60 text-xs">
                      {file 
                        ? 'Файл загружен' 
                        : isDragOver 
                          ? 'Отпустите файл для загрузки'
                          : 'Нажмите для выбора или перетащите сюда'
                      }
                    </p>
                  </div>

                  {!file && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      size="sm"
                      className="bg-vista-primary/10 border-vista-primary/40 text-vista-primary hover:bg-vista-primary/20 h-8 px-3 font-normal flex-shrink-0"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Выбрать
                    </Button>
                  )}
                  
                  {file && (
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          (document.getElementById('file-upload') as HTMLInputElement).value = '';
                        }}
                        className="text-vista-light/60 hover:text-vista-error hover:bg-vista-error/10 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
          >
            Отмена
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={!file || !selectedTeam || !eventType || !selectedEvent || !selectedGpsSystem || !selectedProfile || isLoading}
            className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить отчет'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Модальное окно сопоставления игроков */}
    <PlayerMappingModal
      isOpen={showPlayerMapping}
      onClose={() => setShowPlayerMapping(false)}
      onConfirm={handlePlayerMappingConfirm}
      reportNames={playerNames}
      gpsSystem={profiles.find(p => p.id === selectedProfile)?.gpsSystem || ''}
      teamId={selectedTeam}
      clubId={session?.user?.clubId || ''}
      createdById={session?.user?.id || ''}
    />
    </>
  );
} 