'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Users, 
  Calendar,
  Settings,
  ArrowRight,
  ArrowLeft,
  Save
} from 'lucide-react';

// Кастомные иконки
const CircleStarIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M11.051 7.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.867l-1.156-1.152a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const TrafficConeIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/>
    <path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/>
    <path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/>
    <path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/>
  </svg>
);
import { useToast } from '@/components/ui/use-toast';
import { useClub } from '@/providers/club-provider';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  createGpsReport, 
  createGpsReportWithFile,
  uploadGpsReportFile, 
  fetchGpsProfiles,
  processGpsFile
} from '@/lib/gps-api';
import SmartPlayerMappingModal from './SmartPlayerMappingModal';
import UploadWizardMappingStep from './UploadWizardMappingStep';

interface Team {
  id: string;
  name: string;
  order: number;
}

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  teamId: string;
  team: string;
  category: string;
  categoryName?: string; // альтернативное поле для названия категории
  type: string;
}

interface Match {
  id: string;
  title: string;
  date: string;
  time: string;
  teamId: string;
  team: {
    id: string;
    name: string;
  };
  opponent: string;
  opponentName: string;
  competitionType: string;
  isHome: boolean;
  teamGoals: number;
  opponentGoals: number;
  teamName?: string; // название команды (для совместимости)
}

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  description: string | null;
  clubId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface NewUploadGpsReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportUploaded: () => void;
}

export default function NewUploadGpsReportModal({
  open,
  onOpenChange,
  onReportUploaded,
}: NewUploadGpsReportModalProps) {
  const { club } = useClub();
  const { toast } = useToast();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'team' | 'eventType' | 'event' | 'profile' | 'file' | 'mapping'>('team');
  const [mappingSaveHandler, setMappingSaveHandler] = useState<(() => void) | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [eventType, setEventType] = useState<'training' | 'match' | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Training | Match | null>(null);
  const [gpsProfiles, setGpsProfiles] = useState<GpsProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<GpsProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedReport, setUploadedReport] = useState<any>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  
  // Feature flag для встроенного маппинга
  const USE_INLINE_MAPPING = true; // v2 - исправлены ложные срабатывания

  useEffect(() => {
    if (open) {
      setStep('team');
      setSelectedTeam(null);
      setEventType(null);
      setSelectedEvent(null);
      setSelectedProfile(null);
      setSelectedFile(null);
      setUploadedReport(null);
      setShowMappingModal(false);
      loadTeams();
      loadGpsProfiles();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTeam && eventType) {
      setSelectedEvent(null);
      if (eventType === 'training') {
        loadTrainings(selectedTeam.id);
      } else {
        loadMatches(selectedTeam.id);
      }
    }
  }, [selectedTeam, eventType]);

  // Автоматически показываем модальное окно маппинга на этапе mapping (только если не используется встроенный маппинг)
  useEffect(() => {
    if (!USE_INLINE_MAPPING && step === 'mapping' && uploadedReport) {
      setShowMappingModal(true);
    }
  }, [step, uploadedReport]);

  // Слушатель для открытия старого маппинга
  useEffect(() => {
    const handler = () => setShowMappingModal(true);
    window.addEventListener('gps:openLegacyMapping', handler);
    return () => window.removeEventListener('gps:openLegacyMapping', handler);
  }, []);

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить команды',
        variant: 'destructive',
      });
    }
  };

  const loadTrainings = async (teamId: string) => {
    try {
      // Загружаем все тренировки команды
      const response = await fetch(`/api/trainings?teamId=${teamId}`);
      if (response.ok) {
        const allTrainings = await response.json();
        
        // Загружаем GPS отчеты команды для тренировок
        const gpsResponse = await fetch(`/api/gps/reports?teamId=${teamId}&eventType=training`);
        if (gpsResponse.ok) {
          const gpsReports = await gpsResponse.json();
          
          const eventIdsWithGps = new Set(gpsReports.map((report: any) => report.eventId));
          
          
          // Фильтруем тренировки БЕЗ GPS отчетов
          const trainingsWithoutGps = allTrainings.filter((training: Training) => 
            !eventIdsWithGps.has(training.id)
          );
          
          setTrainings(trainingsWithoutGps);
        } else {
          // Если не удалось загрузить GPS отчеты, показываем все тренировки
          setTrainings(allTrainings);
        }
      }
    } catch (error) {
      console.error('Error loading trainings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить тренировки',
        variant: 'destructive',
      });
    }
  };

  const loadMatches = async (teamId: string) => {
    try {
      // Загружаем все матчи команды
      const response = await fetch(`/api/matches?teamId=${teamId}`);
      if (response.ok) {
        const allMatches = await response.json();
        
        
        // Загружаем GPS отчеты команды для матчей
        const gpsResponse = await fetch(`/api/gps/reports?teamId=${teamId}&eventType=match`);
        if (gpsResponse.ok) {
          const gpsReports = await gpsResponse.json();
          const eventIdsWithGps = new Set(gpsReports.map((report: any) => report.eventId));
          
          // Фильтруем матчи БЕЗ GPS отчетов
          const matchesWithoutGps = allMatches.filter((match: Match) => 
            !eventIdsWithGps.has(match.id)
          );
          
          setMatches(matchesWithoutGps);
        } else {
          // Если не удалось загрузить GPS отчеты, показываем все матчи
          setMatches(allMatches);
        }
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить матчи',
        variant: 'destructive',
      });
    }
  };

  const loadGpsProfiles = async () => {
    try {
      if (!club?.id) return;
      const profiles = await fetchGpsProfiles(club.id);
      setGpsProfiles(profiles.filter(p => p.isActive));
    } catch (error) {
      console.error('Error loading GPS profiles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить GPS профили',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Ошибка',
          description: 'Размер файла превышает 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleNext = () => {
    
    if (step === 'team' && selectedTeam) {
      setStep('eventType');
    } else if (step === 'eventType' && eventType) {
      setStep('event');
    } else if (step === 'event' && selectedEvent) {
      setStep('profile');
    } else if (step === 'profile' && selectedProfile) {
      setStep('file');
    } else if (step === 'file' && selectedFile) {
      
      handleUpload();
    }
  };

  const handleBack = () => {
    if (step === 'eventType') {
      setStep('team');
    } else if (step === 'event') {
      setStep('eventType');
    } else if (step === 'profile') {
      setStep('event');
    } else if (step === 'file') {
      setStep('profile');
    } else if (step === 'mapping') {
      setStep('file');
    }
  };

  const handleUpload = async () => {
    
    if (!selectedFile || !selectedProfile || !selectedEvent || !club?.id) return;

    // Не сохраняем файл сразу, просто переходим к маппингу
    
    setStep('mapping');
  };

  const handleMappingCompleted = () => {
    setShowMappingModal(false);
    handleClose();
    onReportUploaded();
  };

  const handleClose = () => {
    
    if (!loading) {
      setStep('team');
      setSelectedTeam(null);
      setEventType(null);
      setSelectedEvent(null);
      setSelectedProfile(null);
      setSelectedFile(null);
      setUploadedReport(null);
      onOpenChange(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'team':
        return selectedTeam !== null;
      case 'eventType':
        return eventType !== null;
      case 'event':
        return selectedEvent !== null;
      case 'profile':
        return selectedProfile !== null;
      case 'file':
        return selectedFile !== null;
      case 'mapping':
        return false; // На этапе маппинга нет кнопки "Далее"
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'team':
        return 'Выбор команды';
      case 'eventType':
        return 'Тип события';
      case 'event':
        return eventType === 'training' ? 'Выбор тренировки' : 'Выбор матча';
      case 'profile':
        return 'GPS профиль';
      case 'file':
        return 'Загрузка файла';
      case 'mapping':
        return 'Маппинг игроков';
      default:
        return 'Загрузка GPS отчета';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'team':
        return 'Выберите команду для загрузки GPS отчета';
      case 'eventType':
        return 'Выберите тип события';
      case 'event':
        return eventType === 'training' 
          ? 'Выберите тренировку для привязки GPS отчета'
          : 'Выберите матч для привязки GPS отчета';
      case 'profile':
        return 'Выберите GPS профиль для обработки данных';
      case 'file':
        return 'Загрузите GPS файл для привязки к событию';
      case 'mapping':
        return 'Настройте маппинг игроков для корректной обработки данных';
      default:
        return '';
    }
  };

  // Функция для определения отображаемого названия тренировки в зависимости от типа
  const getTrainingTypeDisplay = (type: string | null | undefined) => {
    switch(type) {
      case 'GYM':
        return t('trainingsPage.type_gym');
      case 'TRAINING':
      default:
        return t('trainingsPage.type_training');
    }
  };

  // Функция для получения отображаемого названия матча
  const getMatchDisplayName = (match: Match) => {
    const teamName = match.team?.name || 'Наша команда';
    const homeTeam = match.isHome ? teamName : match.opponentName;
    const awayTeam = match.isHome ? match.opponentName : teamName;
    const score = `${match.teamGoals || 0} - ${match.opponentGoals || 0}`;
    return `${homeTeam} ${score} ${awayTeam}`;
  };

  // Функция для получения отображаемого типа соревнования
  const getCompetitionTypeDisplay = (competitionType: string) => {
    const typeMap: Record<string, string> = {
      'FRIENDLY': 'Товарищеский',
      'CUP': 'Кубок',
      'LEAGUE': 'Лига',
      'CHAMPIONSHIP': 'Чемпионат'
    };
    return typeMap[competitionType] || competitionType;
  };

  // Функция для получения стилей типа соревнования
  const getCompetitionTypeStyles = (competitionType: string) => {
    switch (competitionType) {
      case 'FRIENDLY':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'CUP':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LEAGUE':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CHAMPIONSHIP':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-vista-secondary/20 text-vista-light border-vista-secondary/30';
    }
  };

  // Функция для сортировки тренировок по дате и времени (новые сверху)
  const getSortedTrainings = () => {
    return [...trainings].sort((a, b) => {
      // Создаем объекты Date для сравнения
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      
      // Сортируем по убыванию (новые сверху)
      return dateB.getTime() - dateA.getTime();
    });
  };

  // Функция для сортировки матчей по дате (новые сверху)
  const getSortedMatches = () => {
    return [...matches].sort((a, b) => {
      // Создаем объекты Date для сравнения
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Сортируем по убыванию (новые сверху)
      return dateB.getTime() - dateA.getTime();
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={`bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl flex flex-col p-0 custom-scrollbar max-h-[90vh] overflow-hidden mt-12 sm:mt-6 ${
          step === 'team' ? 'max-w-md h-[70vh]' : 
          step === 'eventType' ? 'max-w-md h-[60vh]' :
          step === 'event' ? 'max-w-lg h-[70vh]' : 
          step === 'profile' ? 'max-w-lg h-[70vh]' : 
          step === 'file' ? 'max-w-lg h-[60vh]' : 
          step === 'mapping' ? 'max-w-2xl h-[85vh]' :
          'max-w-2xl h-[85vh]'
        }`}>
          <DialogHeader className="px-6 py-4 border-b border-vista-secondary/30">
            <DialogTitle className="text-vista-light text-xl">
              {getStepTitle()}
            </DialogTitle>
            <DialogDescription className="text-vista-light/60">
              {getStepDescription()}
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicator */}
          <div className="flex items-center justify-center px-6 py-4 border-b border-vista-secondary/30">
            <div className="flex items-center space-x-2">
              {['team', 'eventType', 'event', 'profile', 'file', 'mapping'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName 
                      ? 'bg-vista-primary text-white' 
                      : ['team', 'eventType', 'event', 'profile', 'file', 'mapping'].indexOf(step) > index
                      ? 'bg-vista-primary/20 text-vista-primary'
                      : 'bg-vista-secondary/20 text-vista-light/40'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 5 && (
                    <div className={`w-8 h-0.5 ${
                      ['team', 'eventType', 'event', 'profile', 'file', 'mapping'].indexOf(step) > index
                        ? 'bg-vista-primary'
                        : 'bg-vista-secondary/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content with scroll */}
          <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
                {step === 'team' && (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <Card
                        key={team.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTeam?.id === team.id
                            ? 'border-vista-primary bg-vista-primary/10'
                            : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                        }`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Users className="h-5 w-5 text-vista-primary" />
                          <span className="text-vista-light">{team.name}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {step === 'eventType' && (
                  <div className="space-y-3">
                    <Card
                      className={`cursor-pointer transition-colors ${
                        eventType === 'training'
                          ? 'border-vista-primary bg-vista-primary/10'
                          : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                      }`}
                      onClick={() => setEventType('training')}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <TrafficConeIcon className="h-5 w-5 text-vista-primary" />
                        <span className="text-vista-light">Тренировка</span>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-colors ${
                        eventType === 'match'
                          ? 'border-vista-primary bg-vista-primary/10'
                          : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                      }`}
                      onClick={() => setEventType('match')}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <CircleStarIcon className="h-5 w-5 text-vista-primary" />
                        <span className="text-vista-light">Матч</span>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {step === 'event' && (
                  <div className="space-y-3">
                    {eventType === 'training' && getSortedTrainings().map((training) => (
                      <Card
                        key={training.id}
                        className={`cursor-pointer transition-colors ${
                          selectedEvent?.id === training.id
                            ? 'border-vista-primary bg-vista-primary/10'
                            : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                        }`}
                        onClick={() => setSelectedEvent(training)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-vista-light font-medium">{training.title}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={`${
                                    training.type === 'GYM' 
                                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  {getTrainingTypeDisplay(training.type)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-vista-light/60 text-sm">
                                <span>
                                  {new Date(training.date).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit'
                                  })} • {training.time}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="bg-vista-primary/20 text-vista-primary border-vista-primary/30 text-xs"
                                >
                                  {training.categoryName || training.category || 'Без категории'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {eventType === 'match' && getSortedMatches().map((match) => (
                      <Card
                        key={match.id}
                        className={`cursor-pointer transition-colors ${
                          selectedEvent?.id === match.id
                            ? 'border-vista-primary bg-vista-primary/10'
                            : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                        }`}
                        onClick={() => setSelectedEvent(match)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                {/* Титульная информация матча */}
                                <h4 className="text-vista-light font-medium">
                                  {getMatchDisplayName(match)}
                                </h4>
                                <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                  Матч
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-vista-light/60 text-sm">
                                <span>
                                  {new Date(match.date).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit'
                                  })} • {match.time}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getCompetitionTypeStyles(match.competitionType)}`}
                                >
                                  {getCompetitionTypeDisplay(match.competitionType)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {step === 'profile' && (
                  <div className="space-y-3">
                    {gpsProfiles.map((profile) => (
                      <Card
                        key={profile.id}
                        className={`cursor-pointer transition-colors ${
                          selectedProfile?.id === profile.id
                            ? 'border-vista-primary bg-vista-primary/10'
                            : 'border-vista-secondary/30 bg-vista-secondary/10 hover:bg-vista-secondary/20'
                        }`}
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-vista-light font-medium">{profile.name}</h4>
                              <p className="text-vista-light/60 text-sm">{profile.gpsSystem}</p>
                            </div>
                            <Badge variant="outline" className="bg-vista-primary/20 text-vista-primary border-vista-primary/30">
                              GPS Профиль
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {step === 'file' && (
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-vista-light/80 text-sm">
                      GPS файл *
                    </Label>
                    <Card className="bg-vista-secondary/20 border-vista-secondary/30">
                      <CardContent className="p-3">
                        {selectedFile ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-vista-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-vista-light truncate">{selectedFile.name}</p>
                                <p className="text-xs text-vista-light/60">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('file-upload')?.click()}
                              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-7 px-3 text-xs font-normal flex-shrink-0"
                            >
                              Изменить
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Upload className="h-6 w-6 text-vista-primary flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-vista-light/80">Выберите GPS файл</p>
                                <p className="text-xs text-vista-light/60">
                                  CSV, Excel файлы (до 5MB)
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('file-upload')?.click()}
                              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-7 px-3 text-xs font-normal flex-shrink-0"
                            >
                              Выбрать файл
                            </Button>
                          </div>
                        )}
                        <input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

        {step === 'mapping' && USE_INLINE_MAPPING && selectedFile && selectedProfile && selectedTeam && selectedEvent && (
          <UploadWizardMappingStep
            report={null}
            reportId=""
            teamId={selectedTeam.id}
            profileId={selectedProfile.id}
            onBack={() => setStep('file')}
            onComplete={(createdCount) => { 
              
              handleClose(); 
              onReportUploaded?.(); 
            }}
            onCancel={handleClose}
            onSaveHandlerReady={(handler) => {
              
              setMappingSaveHandler(() => handler);
            }}
          />
        )}

                {step === 'mapping' && !USE_INLINE_MAPPING && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-vista-light mb-2">
                        Отчет успешно загружен!
                      </h3>
                      <p className="text-vista-light/60">
                        Настройте маппинг игроков для корректной обработки данных.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <DialogFooter className="flex items-center mt-4 px-6 py-4 border-t border-vista-secondary/30">
            <div className="flex-1 flex justify-start">
              {step !== 'team' && (
                <Button
                  variant="outline"
                  onClick={step === 'mapping' ? () => setStep('file') : handleBack}
                  disabled={loading}
                  className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
              >
                Отмена
              </Button>
              
              {step === 'mapping' ? (
                <Button
                  onClick={() => {
                    
                    if (mappingSaveHandler) {
                      mappingSaveHandler();
                    }
                  }}
                  disabled={loading || !mappingSaveHandler}
                  className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить отчет
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                  className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                >
                  {loading ? 'Загрузка...' : step === 'file' ? 'Загрузить' : 'Далее'}
                  {step !== 'file' && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!USE_INLINE_MAPPING && showMappingModal && uploadedReport && (
        <SmartPlayerMappingModal
          open={showMappingModal}
          onOpenChange={setShowMappingModal}
          gpsReport={uploadedReport}
          teamId={selectedTeam?.id || ''}
          onMappingComplete={handleMappingCompleted}
        />
      )}
    </>
  );
}