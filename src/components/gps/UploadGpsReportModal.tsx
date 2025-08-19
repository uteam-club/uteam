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
import { Upload, FileSpreadsheet, CheckCircle, Users } from 'lucide-react';
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
  const [file, setFile] = useState<File | null>(null);
  
  // Данные для выбора
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
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

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/gps-profiles');
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
    if (!file || !selectedTeam || !eventType || !selectedEvent || !selectedProfile) {
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
    if (!file || !selectedTeam || !eventType || !selectedEvent || !selectedProfile) {
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
    setFile(null);
    setTrainings([]);
    setMatches([]);
    setPlayerNames([]);
    setPlayerMappings([]);
    setShowPlayerMapping(false);
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
        className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[85vh] overflow-y-auto backdrop-blur-xl mt-8 custom-scrollbar"
        aria-describedby="upload-gps-description"
      >
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Загрузить GPS отчет</DialogTitle>
        </DialogHeader>
        <div id="upload-gps-description" className="sr-only">
          Модальное окно для загрузки GPS отчета
        </div>
        
        <div className="space-y-6">
          {/* Шаг 1: Выбор команды */}
          <div className="space-y-2">
            <Label className="text-vista-light/40 font-normal">1. Выберите команду</Label>
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

          {/* Шаг 2: Тип события */}
          {selectedTeam && (
            <div className="space-y-2">
              <Label className="text-vista-light/40 font-normal">2. Тип события</Label>
              <Select value={eventType} onValueChange={(value) => setEventType(value as 'TRAINING' | 'MATCH')}>
                <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder="Выберите тип события" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="TRAINING">Тренировка</SelectItem>
                  <SelectItem value="MATCH">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Шаг 3: Конкретное событие */}
          {selectedTeam && eventType && (
            <div className="space-y-2">
              <Label className="text-vista-light/40 font-normal">3. Выберите {eventType === 'TRAINING' ? 'тренировку' : 'матч'}</Label>
              {isLoadingData ? (
                <div className="text-center py-4 text-vista-light/60">Загрузка...</div>
              ) : (
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                    <SelectValue placeholder={`Выберите ${eventType === 'TRAINING' ? 'тренировку' : 'матч'}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
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

          {/* Шаг 4: Профиль отчета */}
          {selectedEvent && (
            <div className="space-y-2">
              <Label className="text-vista-light/40 font-normal">4. Профиль отчета</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder="Выберите профиль отчета" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Шаг 5: Загрузка файла */}
          {selectedProfile && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-vista-light/40 font-normal">5. Файл отчета (Excel/CSV)</Label>
                <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-6 text-center hover:border-vista-primary/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-vista-light/40" />
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-vista-primary hover:text-vista-primary/80 transition-colors">
                      Выберите Excel или CSV файл
                    </span>
                  </label>
                </div>
              </div>

              {file && (
                <div className="flex items-center gap-2 text-vista-success">
                  <CheckCircle className="w-4 h-4" />
                  <span>{file.name} выбран</span>
                </div>
              )}
            </div>
          )}

          {/* Сводка */}
          {selectedEvent && selectedProfile && (
            <div className="bg-vista-secondary/20 border border-vista-secondary/30 rounded-lg p-4">
              <h3 className="text-vista-light font-medium mb-3">Сводка</h3>
              <div className="space-y-2 text-sm text-vista-light/80">
                <div><strong>Команда:</strong> {teams.find(t => t.id === selectedTeam)?.name}</div>
                <div><strong>Событие:</strong> {getEventName()}</div>
                <div><strong>Профиль:</strong> {getProfileName()}</div>
                {file && <div><strong>Файл:</strong> {file.name}</div>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!file || !selectedTeam || !eventType || !selectedEvent || !selectedProfile || isLoading}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
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