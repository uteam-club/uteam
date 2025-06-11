'use client';

import { useState, useEffect } from 'react';
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
  FileTextIcon
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
}

interface Team {
  id: string;
  name: string;
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
  const [formData, setFormData] = useState({
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
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Загрузка данных игрока
  useEffect(() => {
    async function fetchPlayerData() {
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
        setTeams(data.teams);
        
        // Инициализируем форму данными игрока
        setFormData({
          firstName: data.player.firstName || '',
          lastName: data.player.lastName || '',
          middleName: data.player.middleName || '',
          number: data.player.number?.toString() || '',
          position: data.player.position || '',
          strongFoot: data.player.strongFoot || '',
          dateOfBirth: data.player.dateOfBirth ? new Date(data.player.dateOfBirth).toISOString().split('T')[0] : '',
          academyJoinDate: data.player.academyJoinDate ? new Date(data.player.academyJoinDate).toISOString().split('T')[0] : '',
          nationality: data.player.nationality || '',
          imageUrl: data.player.imageUrl || '',
          teamId: data.player.teamId,
          birthCertificateNumber: data.player.birthCertificateNumber || '',
        });

        // Загрузка документов игрока
        fetchPlayerDocuments();
      } catch (error) {
        console.error('Ошибка при загрузке данных игрока:', error);
        setError('Не удалось загрузить данные игрока');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlayerData();
  }, [session, teamId, playerId]);

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
      
      // Обновляем список документов
      fetchPlayerDocuments();
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
      [name]: value
    }));
  };

  // Обработчик изменения select-полей
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    <div className="space-y-6">
      {/* Шапка страницы с кнопкой возврата */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToTeam}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Назад к команде
        </Button>
        <div className="bg-vista-dark/70 border border-vista-secondary/30 py-1.5 px-4 rounded-md h-9 flex items-center">
          <div>
            <h1 className="text-sm font-medium text-vista-light">
              Профиль игрока: {player.lastName} {player.firstName}
            </h1>
          </div>
        </div>
      </div>

      {/* Форма профиля игрока */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Левая колонка - Фото */}
          <Card className="bg-vista-dark/50 border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="text-vista-light">Фото профиля</CardTitle>
              <CardDescription className="text-vista-light/70">
                Загрузите фотографию игрока
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload 
                value={formData.imageUrl} 
                onChange={handleImageChange} 
                disabled={isSaving}
                avatarMode={true}
                clubId={session?.user?.clubId}
                teamId={teamId}
                entityId={playerId}
                entityType="player"
              />
            </CardContent>
          </Card>

          {/* Средняя колонка - Основная информация */}
          <Card className="bg-vista-dark/50 border-vista-secondary/30 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-vista-light">Основная информация</CardTitle>
              <CardDescription className="text-vista-light/70">
                Основные данные игрока
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ФИО */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-vista-light">
                    Фамилия <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    placeholder="Введите фамилию"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-vista-light">
                    Имя <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    placeholder="Введите имя"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="middleName" className="text-vista-light">
                    Отчество
                  </Label>
                  <Input
                    id="middleName"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    placeholder="Введите отчество"
                    disabled={isSaving}
                  />
                </div>
                
                {/* Номер */}
                <div className="space-y-2">
                  <Label htmlFor="number" className="text-vista-light">
                    Игровой номер
                  </Label>
                  <Input
                    id="number"
                    name="number"
                    type="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    placeholder="Укажите номер"
                    disabled={isSaving}
                    min={1}
                    max={99}
                  />
                </div>

                {/* Позиция */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-vista-light">
                    Позиция
                  </Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => handleSelectChange('position', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light">
                      <SelectValue placeholder="Выберите позицию" />
                    </SelectTrigger>
                    <SelectContent className="bg-vista-dark/95 border-vista-secondary/30">
                      <SelectItem value="goalkeeper" className="text-vista-light hover:bg-vista-secondary/20">Вратарь</SelectItem>
                      <SelectItem value="defender" className="text-vista-light hover:bg-vista-secondary/20">Защитник</SelectItem>
                      <SelectItem value="midfielder" className="text-vista-light hover:bg-vista-secondary/20">Полузащитник</SelectItem>
                      <SelectItem value="forward" className="text-vista-light hover:bg-vista-secondary/20">Нападающий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Сильная нога */}
                <div className="space-y-2">
                  <Label htmlFor="strongFoot" className="text-vista-light">
                    Сильная нога
                  </Label>
                  <Select
                    value={formData.strongFoot}
                    onValueChange={(value) => handleSelectChange('strongFoot', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light">
                      <SelectValue placeholder="Выберите ногу" />
                    </SelectTrigger>
                    <SelectContent className="bg-vista-dark/95 border-vista-secondary/30">
                      <SelectItem value="right" className="text-vista-light hover:bg-vista-secondary/20">Правая</SelectItem>
                      <SelectItem value="left" className="text-vista-light hover:bg-vista-secondary/20">Левая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Национальность */}
                <div className="space-y-2">
                  <Label htmlFor="nationality" className="text-vista-light">
                    Национальность
                  </Label>
                  <CountrySelect
                    value={formData.nationality}
                    onChange={(value) => handleSelectChange('nationality', value)}
                    disabled={isSaving}
                  />
                </div>

                {/* Дата рождения */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-vista-light">
                    Дата рождения
                  </Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    disabled={isSaving}
                  />
                </div>

                {/* Дата зачисления в академию */}
                <div className="space-y-2">
                  <Label htmlFor="academyJoinDate" className="text-vista-light">
                    Дата зачисления в академию
                  </Label>
                  <Input
                    id="academyJoinDate"
                    name="academyJoinDate"
                    type="date"
                    value={formData.academyJoinDate}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    disabled={isSaving}
                  />
                </div>

                {/* Команда */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="teamId" className="text-vista-light">
                    Команда
                  </Label>
                  <TeamSelect
                    teams={teams}
                    value={formData.teamId}
                    onChange={(value) => handleSelectChange('teamId', value)}
                    disabled={isSaving}
                  />
                </div>
                
                {/* Пин-код (добавлен) */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pinCode" className="text-vista-light">
                    Пин-код для доступа
                  </Label>
                  <Input
                    id="pinCode"
                    value={player.pinCode}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    disabled={true}
                    readOnly
                  />
                  <p className="text-xs text-vista-light/70 mt-1">
                    Уникальный код для авторизации игрока в системе
                  </p>
                </div>

                {/* Telegram ID */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="telegramId" className="text-vista-light">
                    Telegram ID
                  </Label>
                  <Input
                    id="telegramId"
                    value={player.telegramId || ''}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    disabled={true}
                    readOnly
                  />
                  <p className="text-xs text-vista-light/70 mt-1">
                    Telegram ID появляется после привязки через бота @UTEAM_infoBot
                  </p>
                </div>

                {/* Номер свидетельства о рождении */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="birthCertificateNumber" className="text-vista-light">
                    Номер свидетельства о рождении
                  </Label>
                  <Input
                    id="birthCertificateNumber"
                    name="birthCertificateNumber"
                    value={formData.birthCertificateNumber}
                    onChange={handleInputChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                    placeholder="Введите номер свидетельства о рождении"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Третья колонка - Документы */}
          <Card className="bg-vista-dark/50 border-vista-secondary/30 md:col-span-3">
            <CardHeader>
              <CardTitle className="text-vista-light flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2" />
                Документы
              </CardTitle>
              <CardDescription className="text-vista-light/70">
                Загрузите необходимые документы игрока
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Паспорт */}
                <DocumentUpload
                  onUpload={(file) => handleDocumentUpload(file, 'PASSPORT')}
                  onDelete={documents.find(doc => doc.type === 'PASSPORT')?.id 
                    ? () => handleDocumentDelete(documents.find(doc => doc.type === 'PASSPORT')!.id)
                    : undefined}
                  documentType="Паспорт"
                  documentName={documents.find(doc => doc.type === 'PASSPORT')?.name}
                  documentId={documents.find(doc => doc.type === 'PASSPORT')?.id}
                  isUploaded={documents.some(doc => doc.type === 'PASSPORT')}
                  disabled={isSaving || isLoadingDocuments}
                />
                
                {/* Свидетельство о рождении */}
                <DocumentUpload
                  onUpload={(file) => handleDocumentUpload(file, 'BIRTH_CERTIFICATE')}
                  onDelete={documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')?.id 
                    ? () => handleDocumentDelete(documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')!.id)
                    : undefined}
                  documentType="Свидетельство о рождении"
                  documentName={documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')?.name}
                  documentId={documents.find(doc => doc.type === 'BIRTH_CERTIFICATE')?.id}
                  isUploaded={documents.some(doc => doc.type === 'BIRTH_CERTIFICATE')}
                  disabled={isSaving || isLoadingDocuments}
                />
                
                {/* Медицинская страховка */}
                <DocumentUpload
                  onUpload={(file) => handleDocumentUpload(file, 'MEDICAL_INSURANCE')}
                  onDelete={documents.find(doc => doc.type === 'MEDICAL_INSURANCE')?.id 
                    ? () => handleDocumentDelete(documents.find(doc => doc.type === 'MEDICAL_INSURANCE')!.id)
                    : undefined}
                  documentType="Медицинская страховка"
                  documentName={documents.find(doc => doc.type === 'MEDICAL_INSURANCE')?.name}
                  documentId={documents.find(doc => doc.type === 'MEDICAL_INSURANCE')?.id}
                  isUploaded={documents.some(doc => doc.type === 'MEDICAL_INSURANCE')}
                  disabled={isSaving || isLoadingDocuments}
                />
              </div>
              
              <div className="mt-4 text-xs text-vista-light/70">
                <p>* Поддерживаемые форматы файлов: PDF, DOC, DOCX, PNG, JPG.</p>
                <p>* Максимальный размер файла: 10 МБ.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
} 