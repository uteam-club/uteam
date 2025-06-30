'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeftIcon, 
  SaveIcon, 
  UserIcon, 
  CalendarIcon,
  UserPlusIcon,
  FlagIcon,
  FileTextIcon,
  Trophy,
  Handshake,
  Medal,
  Ruler,
  HeartPulse,
  Zap,
  Dumbbell,
  StretchHorizontal,
  Shuffle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from '@/components/ui/country-select';
import { TeamSelect } from '@/components/ui/team-select';
import ImageUpload from '@/components/ui/image-upload';
import DocumentUpload from '@/components/ui/document-upload';
import FootballField, { formationPositions } from '@/components/matches/FootballField';
import EditPlayerModal from '@/components/admin/EditUserModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClockIcon, UserCheckIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FITNESS_TEST_TYPES } from '@/lib/constants';
import { formatResult } from '@/lib/utils';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  number?: number | null;
  position?: string | null;
  strongFoot?: string | null;
  dateOfBirth?: string | null;
  academyJoinDate?: string | null;
  nationality?: string | null;
  imageUrl?: string | null;
  birthCertificateNumber?: string | null;
  pinCode: string;
  teamId: string;
  telegramId?: string | null;
  format1?: string | null;
  format2?: string | null;
  formation1?: string | null;
  formation2?: string | null;
  positionIndex1?: number | null;
  positionIndex2?: number | null;
}

interface Team {
  id: string;
  name: string;
  teamType: 'academy' | 'contract';
}

// Константы форматов и схем (как на странице матча)
const formatFormations = {
  '7×7': ['1-3-3', '1-3-2-1', '1-2-3-1'],
  '8×8': ['1-4-3', '1-4-2-1', '1-3-3-1', '1-3-1-3', '1-3-1-2-1'],
  '9×9': ['1-4-3-1', '1-3-4-1', '1-3-3-2', '1-3-2-3', '1-3-1-3-1'],
  '10×10': ['1-4-4-1', '1-4-3-2', '1-4-2-3', '1-4-1-3-1', '1-3-4-2', '1-3-3-3', '1-3-2-3-1'],
  '11×11': ['1-5-2-3', '1-5-3-2', '1-4-5-1', '1-4-1-4-1', '1-4-4-2', '1-4-2-3-1', '1-4-3-3', '1-3-4-3', '1-3-4-1-2', '1-3-4-2-1']
} as const;
type FormatKey = keyof typeof formatFormations;
const gameFormats = Object.keys(formatFormations) as FormatKey[];

// Расширяю тип formData:
type PlayerFormData = {
  firstName: string;
  lastName: string;
  middleName: string;
  number: string;
  position: string;
  strongFoot: string;
  dateOfBirth: string;
  academyJoinDate: string;
  nationality: string;
  imageUrl: string;
  teamId: string;
  birthCertificateNumber: string;
  format1: keyof typeof formatFormations;
  format2: keyof typeof formatFormations;
  formation1: string;
  formation2: string;
  positionIndex1: number | null;
  positionIndex2: number | null;
};

// Цвет для выбранной позиции (бирюзовый)
const SELECTED_COLOR = '#06b6d4';

// Компонент для одного блока поля с пикерами
interface PlayerFormationBlockProps {
  label: string;
  format: FormatKey;
  setFormat: (value: FormatKey) => void;
  formation: string;
  setFormation: (value: string) => void;
  selectedPosition: number | null;
  setSelectedPosition: (value: number | null) => void;
  allFormats: FormatKey[];
  formatFormations: typeof formatFormations;
  onPlayerAssigned: (index: number) => void;
  colorValue: string;
}
function PlayerFormationBlock({
  label,
  format,
  setFormat,
  formation,
  setFormation,
  selectedPosition,
  setSelectedPosition,
  allFormats,
  formatFormations,
  onPlayerAssigned,
  colorValue,
}: PlayerFormationBlockProps) {
  return (
    <div className="flex flex-col items-center justify-start" style={{ width: '250px', height: '320px' }}>
      <div className="w-full h-full relative">
        <FootballField
          formation={formation}
          colorValue={colorValue}
          savedPositions={formationPositions[formation]}
          onPlayerAssigned={onPlayerAssigned}
          players={[]}
          mode="profile"
          selectedPosition={selectedPosition}
        />
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const playerId = params.playerId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState<PlayerFormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    number: '',
    position: '',
    strongFoot: '',
    dateOfBirth: '',
    academyJoinDate: '',
    nationality: '',
    imageUrl: '',
    teamId: '',
    birthCertificateNumber: '',
    format1: '11×11',
    format2: '11×11',
    formation1: '1-5-2-3',
    formation2: '1-5-2-3',
    positionIndex1: null,
    positionIndex2: null,
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatKey>(player?.format1 as FormatKey || '11×11');
  const [selectedFormation, setSelectedFormation] = useState<string>(player?.formation1 || formatFormations[selectedFormat][0]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(player?.positionIndex1 ?? null);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [selectedFormat2, setSelectedFormat2] = useState<FormatKey>(player?.format2 as FormatKey || '11×11');
  const [selectedFormation2, setSelectedFormation2] = useState<string>(player?.formation2 || formatFormations[selectedFormat2][0]);
  const [selectedPosition2, setSelectedPosition2] = useState<number | null>(player?.positionIndex2 ?? null);
  const [showPositionDialog2, setShowPositionDialog2] = useState(false);
  const [pendingPosition2, setPendingPosition2] = useState<number | null>(null);
  const [isSavingPosition2, setIsSavingPosition2] = useState(false);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [fitnessTests, setFitnessTests] = useState<any[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [fitnessTestResults, setFitnessTestResults] = useState<Record<string, any>>({});

  const competitionTypeLabels: Record<string, string> = {
    FRIENDLY: 'товарищеский',
    LEAGUE: 'лига',
    CUP: 'кубок',
  };
  const getMatchTypeIcon = (competitionType: string, sizeClass = 'w-5 h-5') => {
    const colorClass = 'text-cyan-400';
    switch (competitionType) {
      case 'CUP':
        return <Trophy className={`${sizeClass} ${colorClass}`} />;
      case 'FRIENDLY':
        return <Handshake className={`${sizeClass} ${colorClass}`} />;
      case 'LEAGUE':
        return <Medal className={`${sizeClass} ${colorClass}`} />;
      default:
        return <Trophy className={`${sizeClass} ${colorClass}`} />;
    }
  };

  // Загрузка данных игрока
  const fetchPlayerData = async () => {
    if (!session?.user) return;
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Игрок не найден');
        } else {
          const data = await response.json();
          setError(data.error || 'Ошибка при загрузке данных игрока');
        }
        return;
      }
      const data = await response.json();
      setPlayer(data.player);
      setTeamName(data.teamName ?? null);
      setFormData({
        firstName: data.player.firstName ?? '',
        lastName: data.player.lastName ?? '',
        middleName: data.player.middleName ?? '',
        number: data.player.number != null ? data.player.number.toString() : '',
        position: data.player.position ?? '',
        strongFoot: data.player.strongFoot ?? '',
        dateOfBirth: data.player.dateOfBirth ? new Date(data.player.dateOfBirth).toISOString().split('T')[0] : '',
        academyJoinDate: data.player.academyJoinDate ? new Date(data.player.academyJoinDate).toISOString().split('T')[0] : '',
        nationality: data.player.nationality ?? '',
        imageUrl: data.player.imageUrl ?? '',
        teamId: data.player.teamId ?? '',
        birthCertificateNumber: data.player.birthCertificateNumber ?? '',
        format1: data.player.format1 ?? '11×11',
        format2: data.player.format2 ?? '11×11',
        formation1: data.player.formation1 ?? '1-5-2-3',
        formation2: data.player.formation2 ?? '1-5-2-3',
        positionIndex1: data.player.positionIndex1,
        positionIndex2: data.player.positionIndex2,
      });
      fetchPlayerDocuments();
    } catch (error) {
      console.error('Ошибка при загрузке данных игрока:', error);
      setError('Не удалось загрузить данные игрока');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка документов игрока
  const fetchPlayerDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}/documents`);
      
      if (!response.ok) {
        console.error('Ошибка при загрузке документов игрока:', response.statusText);
        return;
      }
      
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Ошибка при загрузке документов игрока:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Обработчик загрузки документа
  const handleDocumentUpload = async (file: File, type: string) => {
    console.log('Загрузка документа типа:', type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}/documents`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке документа');
      }
      const data = await response.json();
      // Если это аватар, возвращаем publicUrl
      if (type === 'AVATAR' && data && data.publicUrl) {
        return { imageUrl: data.publicUrl };
      }
      // Обновляем список документов
      fetchPlayerDocuments();
      return {};
    } catch (error: any) {
      console.error('Ошибка при загрузке документа:', error);
      throw new Error(error.message || 'Ошибка при загрузке документа');
    }
  };

  // Обработчик удаления документа
  const handleDocumentDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}/documents`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении документа');
      }
      
      // Обновляем список документов
      fetchPlayerDocuments();
    } catch (error: any) {
      console.error('Ошибка при удалении документа:', error);
      throw new Error(error.message || 'Ошибка при удалении документа');
    }
  };

  // Обработчик возврата к списку игроков
  const handleBackToTeam = () => {
    router.push(`/dashboard/teams/${teamId}`);
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ?? ''
    }));
  };

  // Обработчик изменения select-полей
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value ?? ''
    }));
  };

  // Обработчик изменения изображения
  const handleImageChange = (imageUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: imageUrl || ''
    }));
  };

  // Обработчик сохранения данных
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      setError('Заполните обязательные поля: Имя и Фамилия');
      return;
    }
    
    try {
      setIsSaving(true);
      setError('');
      
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при обновлении данных игрока');
      }
      
      // Если изменилась команда, перенаправляем на страницу новой команды
      if (formData.teamId !== teamId) {
        router.push(`/dashboard/teams/${formData.teamId}/players/${playerId}`);
        return;
      }
      
      // Обновляем данные игрока
      const updatedPlayer = await response.json();
      setPlayer(updatedPlayer);
      
    } catch (error: any) {
      console.error('Ошибка при обновлении данных игрока:', error);
      setError(error.message || 'Не удалось обновить данные игрока');
    } finally {
      setIsSaving(false);
    }
  };

  // Обработчик сохранения редактированных данных
  const handleEditSave = async (updatedPlayer: Player) => {
    try {
      setIsSaving(true);
      setError('');
      
      const response = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPlayer),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при обновлении данных игрока');
      }
      
      // Если изменилась команда, перенаправляем на страницу новой команды
      if (updatedPlayer.teamId !== teamId) {
        router.push(`/dashboard/teams/${updatedPlayer.teamId}/players/${playerId}`);
        return;
      }
      
      // Обновляем данные игрока
      setPlayer(updatedPlayer);
      
    } catch (error: any) {
      console.error('Ошибка при обновлении данных игрока:', error);
      setError(error.message || 'Не удалось обновить данные игрока');
    } finally {
      setIsSaving(false);
    }
  };

  // Смена формата
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value as FormatKey);
    setSelectedFormation(formatFormations[value as FormatKey][0]);
    setSelectedPosition(null);
  };
  // Смена схемы
  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    setSelectedPosition(null);
  };
  // Клик по кружку на поле
  const handlePositionClick = (index: number) => {
    if (selectedPosition === index) return; // Уже выбрано — ничего не делаем
    setPendingPosition(index);
    setShowPositionDialog(true);
  };
  // Подтверждение выбора позиции
  const handleConfirmPosition = async () => {
    if (pendingPosition === null) return;
    setIsSavingPosition(true);
    try {
      const res = await fetch(`/api/teams/${player?.teamId}/players/${player?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format1: selectedFormat,
          formation1: selectedFormation,
          positionIndex1: pendingPosition
        })
      });
      if (res.ok) {
        setSelectedPosition(pendingPosition);
        setShowPositionDialog(false);
        await fetchPlayerData(); // Синхронизируем player после сохранения
      }
    } finally {
      setIsSavingPosition(false);
    }
  };

  // Автоматическое сохранение выбранной формации и формата
  useEffect(() => {
    if (!player) return;
    // Не отправлять запрос при первом рендере, только при изменении
    if (player.format1 === selectedFormat && player.formation1 === selectedFormation) return;
    const saveFormation = async () => {
      await fetch(`/api/teams/${player.teamId}/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format1: selectedFormat,
          formation1: selectedFormation
        })
      });
    };
    saveFormation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat, selectedFormation]);

  // Синхронизация выбранных формата и схемы с player после загрузки данных
  useEffect(() => {
    if (!player) return;
    setSelectedFormat((player.format1 as FormatKey) || '11×11');
    setSelectedFormation(player.formation1 || formatFormations[(player.format1 as FormatKey) || '11×11'][0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.format1, player?.formation1]);

  // Автоматическое сохранение выбранной позиции
  useEffect(() => {
    if (!player) return;
    if (selectedPosition === player.positionIndex1) return;
    if (selectedPosition === null) return;
    const savePosition = async () => {
      await fetch(`/api/teams/${player.teamId}/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionIndex1: selectedPosition
        })
      });
      await fetchPlayerData(); // Синхронизируем player после автосохранения
    };
    savePosition();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPosition]);

  // Синхронизация выбранной позиции с player после загрузки данных
  useEffect(() => {
    if (player && typeof player.positionIndex1 === 'number') {
      setSelectedPosition(player.positionIndex1);
    }
  }, [player?.positionIndex1]);

  // Клик по кружку на втором поле
  const handlePositionClick2 = (index: number) => {
    if (selectedPosition2 === index) return;
    setPendingPosition2(index);
    setShowPositionDialog2(true);
  };
  // Подтверждение выбора позиции для второго поля
  const handleConfirmPosition2 = async () => {
    if (pendingPosition2 === null) return;
    setIsSavingPosition2(true);
    try {
      const res = await fetch(`/api/teams/${player?.teamId}/players/${player?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format2: selectedFormat2,
          formation2: selectedFormation2,
          positionIndex2: pendingPosition2
        })
      });
      if (res.ok) {
        setSelectedPosition2(pendingPosition2);
        setShowPositionDialog2(false);
        await fetchPlayerData();
      }
    } finally {
      setIsSavingPosition2(false);
    }
  };
  // Автоматическое сохранение формата/схемы для второго поля
  useEffect(() => {
    if (!player) return;
    if (player.format2 === selectedFormat2 && player.formation2 === selectedFormation2) return;
    const saveFormation2 = async () => {
      await fetch(`/api/teams/${player.teamId}/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format2: selectedFormat2,
          formation2: selectedFormation2
        })
      });
    };
    saveFormation2();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat2, selectedFormation2]);
  // Автоматическое сохранение позиции для второго поля
  useEffect(() => {
    if (!player) return;
    if (selectedPosition2 === player.positionIndex2) return;
    if (selectedPosition2 === null) return;
    const savePosition2 = async () => {
      await fetch(`/api/teams/${player.teamId}/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionIndex2: selectedPosition2
        })
      });
      await fetchPlayerData();
    };
    savePosition2();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPosition2]);
  // Синхронизация состояния второго поля с player
  useEffect(() => {
    if (player && typeof player.positionIndex2 === 'number') {
      setSelectedPosition2(player.positionIndex2);
    }
  }, [player?.positionIndex2]);
  useEffect(() => {
    if (!player) return;
    setSelectedFormat2((player.format2 as FormatKey) || '11×11');
    setSelectedFormation2(player.formation2 || formatFormations[(player.format2 as FormatKey) || '11×11'][0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.format2, player?.formation2]);

  // Загрузка команд
  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (e) {
      setTeams([]);
    }
  };

  // Получение последних 5 матчей игрока
  useEffect(() => {
    const fetchRecentMatches = async () => {
      if (!player || !player.teamId) return;
      setIsLoadingMatches(true);
      try {
        // Получаем все матчи команды
        const matchesRes = await fetch(`/api/matches?teamId=${player.teamId}`);
        const matches = await matchesRes.json();
        // Сортируем по дате (убывание)
        matches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const result: any[] = [];
        for (const match of matches) {
          if (result.length >= 6) break;
          // Получаем состав на матч
          const squadRes = await fetch(`/api/matches/${match.id}/players`);
          const squad = await squadRes.json();
          const stat = squad.find((s: any) => s.playerId === player.id);
          if (stat && (stat.isStarter || stat.minutesPlayed > 0)) {
            result.push({
              ...match,
              minutesPlayed: stat.minutesPlayed,
              isStarter: stat.isStarter,
            });
          }
        }
        setRecentMatches(result);
      } catch (e) {
        setRecentMatches([]);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    fetchRecentMatches();
  }, [player]);

  useEffect(() => {
    fetchPlayerData();
    fetchTeams();
  }, [session, teamId, playerId]);

  // Добавляю функцию для цвета счёта:
  const getMatchResultClass = (match: any) => {
    if (typeof match.teamGoals !== 'number' || typeof match.opponentGoals !== 'number') {
      return 'bg-vista-dark/30';
    }
    const teamGoals = match.isHome ? match.teamGoals : match.opponentGoals;
    const opponentGoals = match.isHome ? match.opponentGoals : match.teamGoals;
    if (teamGoals > opponentGoals) {
      return 'bg-green-500/30';
    } else if (teamGoals < opponentGoals) {
      return 'bg-red-500/30';
    } else {
      return 'bg-amber-500/30';
    }
  };

  useEffect(() => {
    const fetchTests = async () => {
      setIsLoadingTests(true);
      try {
        const res = await fetch('/api/fitness-tests');
        if (res.ok) {
          const data = await res.json();
          setFitnessTests(data);
        } else {
          setFitnessTests([]);
        }
      } catch {
        setFitnessTests([]);
      } finally {
        setIsLoadingTests(false);
      }
    };
    fetchTests();
  }, []);

  useEffect(() => {
    if (!fitnessTests.length || !playerId || !teamId) return;
    const fetchResults = async () => {
      const resultsObj: Record<string, any> = {};
      await Promise.all(
        fitnessTests.map(async (test: any) => {
          try {
            const res = await fetch(`/api/fitness-tests/results?testId=${test.id}&teamId=${teamId}&playerId=${playerId}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                // Берём последний по дате
                resultsObj[test.id] = data[data.length - 1];
              }
            }
          } catch {}
        })
      );
      setFitnessTestResults(resultsObj);
    };
    fetchResults();
  }, [fitnessTests, playerId, teamId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/30">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="mb-4 text-vista-light/50">
              <UserIcon className="mx-auto h-12 w-12" />
            </div>
            <p className="text-vista-light/70">{error}</p>
            <Button 
              className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              onClick={handleBackToTeam}
            >
              Вернуться к команде
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!player) {
    return null;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Шапка страницы с кнопкой возврата и пикерами */}
      <div className="flex items-center space-x-4 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToTeam}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Назад к команде
        </Button>
        <Button onClick={() => setEditModalOpen(true)} className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90 size-sm py-2 px-4 font-medium rounded-md ml-2">Редактировать данные</Button>
        {/* Два блока пикеров в шапке */}
        <div className="flex flex-row gap-8 ml-8">
          {/* Первый набор */}
          <div className="flex flex-row gap-2 items-end">
            <div className="min-w-[100px]">
              <div className="mb-1 text-vista-light/60 text-xs">Формат 1</div>
              <Select value={selectedFormat} onValueChange={handleFormatChange}>
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-8 text-sm">
                  <SelectValue placeholder="Формат" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  {gameFormats.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[100px]">
              <div className="mb-1 text-vista-light/60 text-xs">Схема 1</div>
              <Select value={selectedFormation} onValueChange={handleFormationChange}>
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-8 text-sm">
                  <SelectValue placeholder="Схема" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  {formatFormations[selectedFormat].map((form) => (
                    <SelectItem key={form} value={form}>{form}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Второй набор */}
          <div className="flex flex-row gap-2 items-end">
            <div className="min-w-[100px]">
              <div className="mb-1 text-vista-light/60 text-xs">Формат 2</div>
              <Select value={selectedFormat2} onValueChange={(v) => setSelectedFormat2(v as FormatKey)}>
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-8 text-sm">
                  <SelectValue placeholder="Формат" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  {gameFormats.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[100px]">
              <div className="mb-1 text-vista-light/60 text-xs">Схема 2</div>
              <Select value={selectedFormation2} onValueChange={(v) => setSelectedFormation2(v)}>
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-8 text-sm">
                  <SelectValue placeholder="Схема" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  {formatFormations[selectedFormat2].map((form) => (
                    <SelectItem key={form} value={form}>{form}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Карточка игрока и фоновый блок справа */}
      <div className="flex flex-row items-start gap-7" style={{ height: '320px' }}>
        <div className="w-64 flex flex-col items-start h-full">
          <div className="bg-gray-50/30 rounded-t-md overflow-hidden shadow-md relative w-64 aspect-square">
            {/* Фото игрока */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] z-0" />
              {player.imageUrl ? (
                <img 
                  src={player.imageUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  className="w-full h-full object-cover z-10 relative"
                  style={{ background: 'transparent' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center z-10 relative">
                  <UserIcon className="w-16 h-16 text-slate-300" />
                </div>
              )}
            </div>
          </div>
          {/* Имя и фамилия под карточкой */}
          <div className="w-64 bg-vista-dark/40 rounded-b-md shadow-md p-3">
            <div className="text-center">
              {player.firstName && (
                <p className="text-vista-light/70 text-base">{player.firstName}</p>
              )}
              {player.lastName && (
                <p className="text-vista-light font-bold text-xl">{player.lastName}</p>
              )}
            </div>
          </div>
        </div>
        {/* Информационный блок */}
        <div className="w-[38rem] h-full flex flex-col items-start justify-start">
          <div className="bg-vista-dark/40 rounded-md shadow-md w-full h-full flex flex-col justify-start p-8">
            <div className="space-y-4 flex-1">
              {/* Национальность */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Национальность</span>
                {player.nationality ? (
                  (() => {
                    const countries = [
                      { name: 'Россия', code: 'RU' }, { name: 'Албания', code: 'AL' }, { name: 'Англия', code: 'GB-ENG' }, { name: 'Бразилия', code: 'BR' }, { name: 'Аргентина', code: 'AR' }, { name: 'Испания', code: 'ES' }, { name: 'Италия', code: 'IT' }, { name: 'Германия', code: 'DE' }, { name: 'Франция', code: 'FR' }, { name: 'Нидерланды', code: 'NL' }, { name: 'Португалия', code: 'PT' }, { name: 'Бельгия', code: 'BE' }, { name: 'Уругвай', code: 'UY' }, { name: 'Колумбия', code: 'CO' }, { name: 'Мексика', code: 'MX' }, { name: 'США', code: 'US' }, { name: 'Канада', code: 'CA' }, { name: 'Япония', code: 'JP' }, { name: 'Китай', code: 'CN' }, { name: 'Австралия', code: 'AU' }, { name: 'Корея', code: 'KR' }, { name: 'Египет', code: 'EG' }, { name: 'Марокко', code: 'MA' }, { name: 'Нигерия', code: 'NG' }, { name: 'Сенегал', code: 'SN' }, { name: 'Гана', code: 'GH' }, { name: 'Камерун', code: 'CM' }, { name: 'Алжир', code: 'DZ' }, { name: 'Украина', code: 'UA' }, { name: 'Беларусь', code: 'BY' }, { name: 'Казахстан', code: 'KZ' }, { name: 'Узбекистан', code: 'UZ' }, { name: 'Таджикистан', code: 'TJ' }, { name: 'Кыргызстан', code: 'KG' }, { name: 'Сербия', code: 'RS' }, { name: 'Хорватия', code: 'HR' }, { name: 'Швеция', code: 'SE' }, { name: 'Дания', code: 'DK' }, { name: 'Норвегия', code: 'NO' }, { name: 'Финляндия', code: 'FI' }, { name: 'Исландия', code: 'IS' }, { name: 'Польша', code: 'PL' }, { name: 'Чехия', code: 'CZ' }, { name: 'Словакия', code: 'SK' }, { name: 'Венгрия', code: 'HU' }, { name: 'Австрия', code: 'AT' }, { name: 'Швейцария', code: 'CH' }, { name: 'Греция', code: 'GR' }, { name: 'Турция', code: 'TR' }, { name: 'Румыния', code: 'RO' }, { name: 'Болгария', code: 'BG' }, { name: 'Молдова', code: 'MD' }, { name: 'Черногория', code: 'ME' }, { name: 'Босния и Герцеговина', code: 'BA' }, { name: 'Армения', code: 'AM' }, { name: 'Азербайджан', code: 'AZ' }, { name: 'Грузия', code: 'GE' }, { name: 'Иран', code: 'IR' }, { name: 'Ирак', code: 'IQ' }, { name: 'Саудовская Аравия', code: 'SA' }, { name: 'Катар', code: 'QA' }, { name: 'ОАЭ', code: 'AE' }, { name: 'Кувейт', code: 'KW' }, { name: 'Оман', code: 'OM' }, { name: 'Израиль', code: 'IL' }, { name: 'Индия', code: 'IN' }, { name: 'Пакистан', code: 'PK' }, { name: 'Бангладеш', code: 'BD' }, { name: 'Кот-д\'Ивуар', code: 'CI' }, { name: 'ЮАР', code: 'ZA' }, { name: 'Гвинея', code: 'GN' }, { name: 'Мали', code: 'ML' }, { name: 'Буркина-Фасо', code: 'BF' }, { name: 'Тунис', code: 'TN' }, { name: 'Либерия', code: 'LR' }, { name: 'Судан', code: 'SD' }, { name: 'Эфиопия', code: 'ET' }, { name: 'Кения', code: 'KE' }, { name: 'Танзания', code: 'TZ' }, { name: 'Уганда', code: 'UG' }, { name: 'Зимбабве', code: 'ZW' }, { name: 'Ангола', code: 'AO' }, { name: 'Перу', code: 'PE' }, { name: 'Чили', code: 'CL' }, { name: 'Эквадор', code: 'EC' }, { name: 'Венесуэла', code: 'VE' }, { name: 'Парагвай', code: 'PY' }, { name: 'Боливия', code: 'BO' }, { name: 'Коста-Рика', code: 'CR' }, { name: 'Панама', code: 'PA' }, { name: 'Гондурас', code: 'HN' }, { name: 'Сальвадор', code: 'SV' }, { name: 'Ямайка', code: 'JM' }, { name: 'Тайланд', code: 'TH' }, { name: 'Вьетнам', code: 'VN' }, { name: 'Индонезия', code: 'ID' }, { name: 'Малайзия', code: 'MY' }, { name: 'Филиппины', code: 'PH' }, { name: 'Новая Зеландия', code: 'NZ' }, { name: 'Гаити', code: 'HT' }, { name: 'Монголия', code: 'MN' }, { name: 'Шотландия', code: 'GB-SCT' }, { name: 'Уэльс', code: 'GB-WLS' }, { name: 'Северная Ирландия', code: 'GB-NIR' }, { name: 'Люксембург', code: 'LU' }, { name: 'Фарерские острова', code: 'FO' }, { name: 'Андорра', code: 'AD' }, { name: 'Мальта', code: 'MT' }, { name: 'Кипр', code: 'CY' }, { name: 'Макао', code: 'MO' }, { name: 'Гонконг', code: 'HK' }, { name: 'Сингапур', code: 'SG' },
                    ];
                    function countryCodeToEmoji(code: string) {
                      if (code.startsWith('GB-')) return '🇬🇧';
                      return code.replace(/-/g, '').toUpperCase().replace(/./g, (char: string) => String.fromCodePoint(127397 + char.charCodeAt(0)));
                    }
                    const country = countries.find(c => c.code === player.nationality);
                    return country ? (
                      <span className="flex items-center gap-2 text-vista-light text-base">
                        <span className="text-xl">{countryCodeToEmoji(country.code)}</span>
                        <span>{country.name}</span>
                      </span>
                    ) : (
                      <span className="text-vista-light text-base">{player.nationality}</span>
                    );
                  })()
                ) : (
                  <span className="text-vista-light/40">—</span>
                )}
              </div>
              {/* Дата рождения */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Дата рождения</span>
                <span className="text-vista-light text-base">{player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('ru-RU') : <span className="text-vista-light/40">—</span>}</span>
              </div>
              {/* Позиция */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Позиция</span>
                <span className="text-vista-light text-base">{player.position || <span className="text-vista-light/40">—</span>}</span>
              </div>
              {/* Сильная нога */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Сильная нога</span>
                <span className="text-vista-light text-base">{player.strongFoot || <span className="text-vista-light/40">—</span>}</span>
              </div>
              {/* Игровой номер */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Игровой номер</span>
                <span className="text-vista-light text-base">{player.number || <span className="text-vista-light/40">—</span>}</span>
              </div>
              {/* Команда */}
              <div className="flex items-center gap-3">
                <span className="text-vista-light/60 text-base min-w-[120px]">Команда</span>
                <span className="text-vista-light text-base">{teamName || <span className="text-vista-light/40">—</span>}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Два поля с пикерами */}
        <div className="flex flex-row gap-7 w-[570px]">
          <PlayerFormationBlock
            label="Формат 1 / Схема 1"
            format={selectedFormat}
            setFormat={handleFormatChange}
            formation={selectedFormation}
            setFormation={handleFormationChange}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            allFormats={gameFormats}
            formatFormations={formatFormations}
            onPlayerAssigned={handlePositionClick}
            colorValue={SELECTED_COLOR}
          />
          <PlayerFormationBlock
            label="Формат 2 / Схема 2"
            format={selectedFormat2}
            setFormat={(v) => setSelectedFormat2(v as FormatKey)}
            formation={selectedFormation2}
            setFormation={(v) => setSelectedFormation2(v)}
            selectedPosition={selectedPosition2}
            setSelectedPosition={setSelectedPosition2}
            allFormats={gameFormats}
            formatFormations={formatFormations}
            onPlayerAssigned={handlePositionClick2}
            colorValue={SELECTED_COLOR}
          />
        </div>
        {/* Модалка подтверждения смены позиции */}
        <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
          <DialogContent className="max-w-xs bg-vista-dark border border-vista-secondary/30 rounded-xl shadow-xl p-0">
            <DialogHeader className="flex flex-col items-center justify-center pt-6 pb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-600/20 mb-2">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 4a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1z" fill="#06b6d4"/></svg>
              </div>
              <DialogTitle className="text-lg font-semibold text-center text-vista-light mb-1">
                {selectedPosition === null ? 'Привязать игрока к позиции?' : 'Сменить позицию игрока?'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-row gap-2 justify-center pb-6 pt-2">
              <button
                className={
                  `px-5 py-2 rounded-lg font-semibold text-base transition-colors duration-150
                  ${isSavingPosition ? 'bg-cyan-600/60 text-white cursor-wait' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`
                }
                onClick={handleConfirmPosition}
                disabled={isSavingPosition}
              >
                {isSavingPosition ? <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin align-middle"></span> : 'Да'}
              </button>
              <button
                className="px-5 py-2 rounded-lg font-semibold text-base bg-slate-700 hover:bg-slate-600 text-vista-light/80 border border-slate-600/40 transition-colors duration-150"
                onClick={() => setShowPositionDialog(false)}
                disabled={isSavingPosition}
              >
                Отмена
              </button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Модалка подтверждения для второго поля: */}
        <Dialog open={showPositionDialog2} onOpenChange={setShowPositionDialog2}>
          <DialogContent className="max-w-xs bg-vista-dark border border-vista-secondary/30 rounded-xl shadow-xl p-0">
            <DialogHeader className="flex flex-col items-center justify-center pt-6 pb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-600/20 mb-2">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 4a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1z" fill="#06b6d4"/></svg>
              </div>
              <DialogTitle className="text-lg font-semibold text-center text-vista-light mb-1">
                {selectedPosition2 === null ? 'Привязать игрока к позиции?' : 'Сменить позицию игрока?'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-row gap-2 justify-center pb-6 pt-2">
              <button
                className={
                  `px-5 py-2 rounded-lg font-semibold text-base transition-colors duration-150
                  ${isSavingPosition2 ? 'bg-cyan-600/60 text-white cursor-wait' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`
                }
                onClick={handleConfirmPosition2}
                disabled={isSavingPosition2}
              >
                {isSavingPosition2 ? <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin align-middle"></span> : 'Да'}
              </button>
              <button
                className="px-5 py-2 rounded-lg font-semibold text-base bg-slate-700 hover:bg-slate-600 text-vista-light/80 border border-slate-600/40 transition-colors duration-150"
                onClick={() => setShowPositionDialog2(false)}
                disabled={isSavingPosition2}
              >
                Отмена
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Новые три одинаковых блока */}
      <div className="flex flex-row gap-7 w-full mt-8 mb-32">
        <div className="w-[420px] h-[480px] bg-vista-dark/40 rounded-md shadow-md flex flex-col p-6 relative">
          <div className="flex flex-row justify-between items-start mb-4">
            <span className="text-xl font-semibold text-vista-light tracking-tight">Статистика в матчах</span>
            <button className="bg-vista-primary text-vista-dark rounded-md px-4 py-1.5 text-sm font-medium shadow hover:bg-vista-primary/90 transition">Все матчи</button>
          </div>
          {/* Здесь будет содержимое блока */}
          {isLoadingMatches ? (
            <div className="space-y-3 mt-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg bg-vista-secondary/10" />
              ))}
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="text-vista-light/50 text-center mt-8">Нет данных о матчах</div>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {recentMatches.slice(0, 6).map((match: any, idx: number) => (
                <div key={match.id} className="flex flex-row items-stretch justify-between bg-cyan-100/[0.025] rounded-md px-2 py-2 shadow-sm hover:bg-cyan-100/5 transition h-[56px]">
                  {/* Левая часть: тип соревнования */}
                  <div className="flex flex-col items-start justify-start min-w-[60px] pt-0.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-center h-full">
                            <span className="bg-cyan-100/5 rounded-md p-2 w-[40px] min-h-[32px] flex items-center justify-center">
                              {getMatchTypeIcon(match.competitionType, 'w-6 h-6')}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs px-2 py-1 rounded bg-vista-dark/90 text-vista-light shadow">
                          {competitionTypeLabels[match.competitionType] || match.competitionType}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {/* Центральная часть: дата, счет, команды */}
                  <div className="flex flex-col flex-1 items-center justify-center">
                    <span className="text-xs text-vista-light/70 mb-2">{format(new Date(match.date), 'dd.MM.yyyy', { locale: ru })}</span>
                    <div className="flex flex-row items-center w-full justify-center">
                      <span className="text-vista-light font-semibold text-xs text-right max-w-[90px] truncate pr-2" style={{flex: 1}}>
                        {match.isHome ? match.teamName : match.opponentName}
                      </span>
                      <span className={`flex justify-center items-center text-vista-light/90 font-bold text-xs px-2 py-0.5 ${getMatchResultClass(match)} rounded mx-1`} style={{minWidth: 38, textAlign: 'center'}}>
                        {typeof match.teamGoals === 'number' && typeof match.opponentGoals === 'number' ? `${match.teamGoals} : ${match.opponentGoals}` : '-'}
                      </span>
                      <span className="text-vista-light font-semibold text-xs text-left max-w-[90px] truncate pl-2" style={{flex: 1}}>
                        {match.isHome ? match.opponentName : match.teamName}
                      </span>
                    </div>
                  </div>
                  {/* Правая часть: минуты и статус */}
                  <div className="flex flex-col items-end justify-between min-w-[70px]">
                    <span className="flex items-center gap-1 text-cyan-400 text-xs">
                      <ClockIcon className="w-3 h-3" />
                      {match.minutesPlayed} мин
                    </span>
                    <Badge className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-normal min-w-[60px] text-center justify-center ${match.isStarter ? 'bg-green-600/10 text-white/70' : 'bg-yellow-500/10 text-white/70'}`}
                    >
                      {match.isStarter ? (
                        <span>Основа</span>
                      ) : (
                        <span>Замена</span>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-[420px] h-[480px] bg-vista-dark/40 rounded-md shadow-md flex flex-col p-6 relative">
          <div className="flex flex-row justify-between items-start mb-4">
            <span className="text-xl font-semibold text-vista-light tracking-tight">Результаты тестов</span>
            <button className="bg-vista-primary text-vista-dark rounded-md px-4 py-1.5 text-sm font-medium shadow hover:bg-vista-primary/90 transition">Все тесты</button>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {[
              { value: 'anthropometry', label: 'Антропометрия', icon: <Ruler className="w-6 h-6 text-cyan-400" /> },
              { value: 'endurance', label: 'Выносливость', icon: <HeartPulse className="w-6 h-6 text-cyan-400" /> },
              { value: 'speed', label: 'Скорость', icon: <Zap className="w-6 h-6 text-cyan-400" /> },
              { value: 'strength', label: 'Сила', icon: <Dumbbell className="w-6 h-6 text-cyan-400" /> },
              { value: 'flexibility', label: 'Гибкость', icon: <StretchHorizontal className="w-6 h-6 text-cyan-400" /> },
              { value: 'agility', label: 'Ловкость', icon: <Shuffle className="w-6 h-6 text-cyan-400" /> },
            ].map((direction) => {
              // Оставляем только тесты с результатом
              const tests = fitnessTests.filter(test => test.type === direction.value && fitnessTestResults[test.id]);
              return (
                <div key={direction.value} className="flex flex-row items-center bg-cyan-100/[0.025] rounded-md px-2 py-0 shadow-sm hover:bg-cyan-100/5 transition h-[56px] items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="min-w-[40px] w-[40px] h-[40px] flex items-center justify-center bg-cyan-100/5 rounded-md cursor-pointer">{direction.icon}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs px-2 py-1 rounded bg-vista-dark/90 text-vista-light shadow">
                        {direction.label}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex flex-row flex-nowrap gap-2 items-start overflow-x-auto overflow-y-hidden scrollbar-hide w-full max-w-full">
                    {tests.map((test: any) => (
                      <div key={test.id} className="h-[40px] min-w-fit px-4 flex flex-col items-center justify-center bg-cyan-100/10 rounded-md">
                        <span className="text-cyan-400 text-[11px] font-normal leading-tight text-center w-full">{test.name}</span>
                        {fitnessTestResults[test.id] && (
                          <span className="text-white text-xs font-normal leading-tight text-center w-full">
                            {formatResult(fitnessTestResults[test.id].value)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-[420px] h-[480px] bg-vista-dark/40 rounded-md shadow-md flex items-center justify-center" />
      </div>

      <EditPlayerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        player={player}
        teams={teams}
        documents={documents}
        onSave={handleEditSave}
        onDocumentUpload={handleDocumentUpload as (file: File, type: string) => Promise<{ imageUrl?: string }>}
        onDocumentDelete={handleDocumentDelete}
      />
    </div>
  );
} 