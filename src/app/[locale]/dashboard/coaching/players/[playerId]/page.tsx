'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  UserCircleIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  DocumentIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import PlayerAvatar from '@/components/ui/PlayerAvatar';
import DocumentUpload from '@/components/ui/DocumentUpload';

type PlayerData = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  nationality?: string | null;
  position?: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | null;
  number?: number | null;
  foot?: 'LEFT' | 'RIGHT' | 'BOTH' | null;
  academyJoinDate?: string | null;
  birthDate?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  passportUrl?: string | null;
  passportFileName?: string | null;
  passportFileSize?: number | null;
  birthCertificateUrl?: string | null;
  birthCertificateFileName?: string | null;
  birthCertificateFileSize?: number | null;
  birthCertificateNumber?: string | null;
  insuranceUrl?: string | null;
  insuranceFileName?: string | null;
  insuranceFileSize?: number | null;
  pinCode?: string | null;
  teamId: string;
  teams: {
    id: string;
    name: string;
  };
};

// Функция для генерации случайного 6-значного PIN-кода
const generatePinCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function PlayerProfilePage() {
  const { locale, playerId } = useParams() as { locale: string; playerId: string };
  const router = useRouter();
  const t = useTranslations('player');
  const common = useTranslations('common');
  
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PlayerData>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [generatingPin, setGeneratingPin] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);

  // Загрузка данных игрока
  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/players/${playerId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных игрока');
        }
        
        const playerData = await response.json();
        setPlayer(playerData);
        setFormData(playerData);
      } catch (error) {
        console.error('Ошибка загрузки игрока:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  // Обработчик изменения формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Сохранение формы
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления данных игрока');
      }

      const updatedPlayer = await response.json();
      setPlayer(updatedPlayer);
      setIsEditing(false);
      alert('Профиль успешно сохранен');
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      alert(`Не удалось сохранить профиль: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Генерация нового PIN-кода
  const handleGeneratePinCode = async () => {
    try {
      setGeneratingPin(true);
      const newPinCode = generatePinCode();
      
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinCode: newPinCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка генерации PIN-кода');
      }

      const updatedPlayer = await response.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ ...prev, pinCode: newPinCode }));
      alert('PIN-код успешно сгенерирован');
    } catch (error) {
      console.error('Ошибка генерации PIN-кода:', error);
      alert(`Не удалось сгенерировать PIN-код: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setGeneratingPin(false);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setFormData(player || {});
    setIsEditing(false);
  };

  // Обработчик загрузки фото
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'photo');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }
      
      const data = await response.json();
      console.log('Успешная загрузка фото:', data);
      
      // Обновляем URL фото игрока
      const updateResponse = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl: data.url }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }
      
      const updatedPlayer = await updateResponse.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ ...prev, photoUrl: data.url }));
      
      alert('Фото успешно загружено');
    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
      alert(`Не удалось загрузить фото: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading(false);
    }
  };

  // Обработчик загрузки паспорта
  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Проверка типа файла
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
      alert('Пожалуйста, выберите изображение или PDF-документ');
      return;
    }
    
    try {
      setUploadingPassport(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'document');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }
      
      const data = await response.json();
      console.log('Успешная загрузка паспорта:', data);
      
      // Обновляем URL паспорта игрока
      const updateResponse = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passportUrl: data.url,
          passportFileName: file.name,
          passportFileSize: file.size
        }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }
      
      const updatedPlayer = await updateResponse.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ 
        ...prev, 
        passportUrl: data.url,
        passportFileName: file.name,
        passportFileSize: file.size
      }));
      
      alert('Паспорт успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки паспорта:', error);
      alert(`Не удалось загрузить паспорт: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploadingPassport(false);
    }
  };

  // Обработчик загрузки свидетельства о рождении
  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Проверка типа файла
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
      alert('Пожалуйста, выберите изображение или PDF-документ');
      return;
    }
    
    try {
      setUploadingCertificate(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'document');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }
      
      const data = await response.json();
      console.log('Успешная загрузка свидетельства:', data);
      
      // Обновляем URL свидетельства игрока
      const updateResponse = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          birthCertificateUrl: data.url,
          birthCertificateFileName: file.name,
          birthCertificateFileSize: file.size
        }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }
      
      const updatedPlayer = await updateResponse.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ 
        ...prev, 
        birthCertificateUrl: data.url,
        birthCertificateFileName: file.name,
        birthCertificateFileSize: file.size
      }));
      
      alert('Свидетельство о рождении успешно загружено');
    } catch (error) {
      console.error('Ошибка загрузки свидетельства:', error);
      alert(`Не удалось загрузить свидетельство: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploadingCertificate(false);
    }
  };

  // Обработчик загрузки медицинской страховки
  const handleInsuranceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Проверка типа файла
    if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
      alert('Пожалуйста, выберите изображение или PDF-документ');
      return;
    }
    
    try {
      setUploadingInsurance(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'document');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }
      
      const data = await response.json();
      console.log('Успешная загрузка страховки:', data);
      
      // Обновляем URL страховки игрока
      const updateResponse = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          insuranceUrl: data.url,
          insuranceFileName: file.name,
          insuranceFileSize: file.size
        }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Ошибка обновления профиля');
      }
      
      const updatedPlayer = await updateResponse.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ 
        ...prev, 
        insuranceUrl: data.url,
        insuranceFileName: file.name,
        insuranceFileSize: file.size
      }));
      
      alert('Медицинская страховка успешно загружена');
    } catch (error) {
      console.error('Ошибка загрузки страховки:', error);
      alert(`Не удалось загрузить страховку: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploadingInsurance(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy', { locale: ru });
  };
  
  // Получение текста позиции игрока
  const getPositionText = (position: string | null | undefined) => {
    if (!position) return '—';
    
    const positions: Record<string, string> = {
      'GOALKEEPER': 'Вратарь',
      'DEFENDER': 'Защитник',
      'MIDFIELDER': 'Полузащитник',
      'FORWARD': 'Нападающий'
    };
    
    return positions[position] || position;
  };
  
  // Получение текста предпочитаемой ноги
  const getFootText = (foot: string | null | undefined) => {
    if (!foot) return '—';
    
    const feet: Record<string, string> = {
      'LEFT': 'Левая',
      'RIGHT': 'Правая',
      'BOTH': 'Обе'
    };
    
    return feet[foot] || foot;
  };

  // Обработка удаления документа
  const handleDeleteDocument = async (documentType: 'passport' | 'birthCertificate' | 'insurance') => {
    let documentTypeName = '';
    switch (documentType) {
      case 'passport': documentTypeName = 'паспорт'; break;
      case 'birthCertificate': documentTypeName = 'свидетельство о рождении'; break;
      case 'insurance': documentTypeName = 'мед. страховку'; break;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить ${documentTypeName}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      let data;
      if (documentType === 'passport') {
        data = { passportUrl: null, passportFileName: null, passportFileSize: null };
      } else if (documentType === 'birthCertificate') {
        data = { birthCertificateUrl: null, birthCertificateFileName: null, birthCertificateFileSize: null };
      } else {
        data = { insuranceUrl: null, insuranceFileName: null, insuranceFileSize: null };
      }
      
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления документа');
      }

      const updatedPlayer = await response.json();
      setPlayer(updatedPlayer);
      setFormData(prev => ({ ...prev, ...data }));
      alert('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Не удалось удалить документ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !player) {
    return (
      <div className="container-app py-6">
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <div className="mb-6">
        <Link 
          href={`/${locale}/dashboard/coaching/teams/${player?.teamId}`}
          className="inline-flex items-center text-vista-light hover:text-vista-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          <span>Вернуться к команде {player?.teams?.name || ''}</span>
        </Link>
      </div>

      <div className="bg-vista-secondary/30 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Фото профиля */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40 mx-auto md:mx-0">
              <PlayerAvatar 
                photoUrl={player?.photoUrl}
                name={`${player?.firstName || ''} ${player?.lastName || ''}`}
                size="xl"
              />
              
              {/* Кнопка для загрузки изображения */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-vista-primary text-vista-dark py-2 px-4 rounded-md text-sm mt-3 flex items-center justify-center w-full hover:bg-vista-primary/90 transition-colors"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vista-dark"></div>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                    Загрузить фото
                  </>
                )}
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              
              <input 
                type="file" 
                ref={passportInputRef} 
                onChange={handlePassportUpload} 
                accept="application/pdf,image/*" 
                className="hidden" 
              />
              
              <input 
                type="file" 
                ref={certificateInputRef} 
                onChange={handleCertificateUpload} 
                accept="application/pdf,image/*" 
                className="hidden" 
              />
              
              <input 
                type="file" 
                ref={insuranceInputRef} 
                onChange={handleInsuranceUpload} 
                accept="application/pdf,image/*" 
                className="hidden" 
              />
            </div>
          </div>
          
          {/* Информация об игроке */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-vista-light">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName || ''} 
                      onChange={handleInputChange}
                      className="bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                    />
                    <input 
                      type="text" 
                      name="lastName" 
                      value={formData.lastName || ''} 
                      onChange={handleInputChange}
                      className="bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                    />
                  </div>
                ) : (
                  `${player?.firstName} ${player?.lastName}`
                )}
              </h1>
              
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleSaveProfile}
                    className="bg-vista-primary text-vista-dark p-2 rounded-full hover:bg-vista-primary/90 transition-colors"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="bg-vista-error text-vista-light p-2 rounded-full hover:bg-vista-error/90 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-vista-secondary text-vista-light p-2 rounded-full hover:bg-vista-secondary/90 transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Отчество */}
              <div>
                <p className="text-vista-light/60 text-sm">Отчество</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="middleName" 
                    value={formData.middleName || ''} 
                    onChange={handleInputChange}
                    placeholder="Отчество (необязательно)"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{player?.middleName || '—'}</p>
                )}
              </div>
              
              {/* Номер */}
              <div>
                <p className="text-vista-light/60 text-sm">Номер</p>
                {isEditing ? (
                  <input 
                    type="number" 
                    name="number" 
                    value={formData.number || ''} 
                    onChange={handleInputChange}
                    placeholder="Номер игрока"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{player?.number || '—'}</p>
                )}
              </div>
              
              {/* Позиция */}
              <div>
                <p className="text-vista-light/60 text-sm">Позиция</p>
                {isEditing ? (
                  <select 
                    name="position" 
                    value={formData.position || ''} 
                    onChange={handleInputChange}
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  >
                    <option value="">Выберите позицию</option>
                    <option value="GOALKEEPER">Вратарь</option>
                    <option value="DEFENDER">Защитник</option>
                    <option value="MIDFIELDER">Полузащитник</option>
                    <option value="FORWARD">Нападающий</option>
                  </select>
                ) : (
                  <p className="text-vista-light">{getPositionText(player?.position) || '—'}</p>
                )}
              </div>
              
              {/* Национальность */}
              <div>
                <p className="text-vista-light/60 text-sm">Национальность</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="nationality" 
                    value={formData.nationality || ''} 
                    onChange={handleInputChange}
                    placeholder="Национальность"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{player?.nationality || '—'}</p>
                )}
              </div>
              
              {/* Сильная нога */}
              <div>
                <p className="text-vista-light/60 text-sm">Сильная нога</p>
                {isEditing ? (
                  <select 
                    name="foot" 
                    value={formData.foot || ''} 
                    onChange={handleInputChange}
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  >
                    <option value="">Выберите ногу</option>
                    <option value="LEFT">Левая</option>
                    <option value="RIGHT">Правая</option>
                    <option value="BOTH">Обе</option>
                  </select>
                ) : (
                  <p className="text-vista-light">{getFootText(player?.foot) || '—'}</p>
                )}
              </div>
              
              {/* Дата рождения */}
              <div>
                <p className="text-vista-light/60 text-sm">Дата рождения</p>
                {isEditing ? (
                  <input 
                    type="date" 
                    name="birthDate" 
                    value={formData.birthDate ? formData.birthDate.slice(0, 10) : ''} 
                    onChange={handleInputChange}
                    placeholder="Дата рождения"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{formatDate(player?.birthDate) || '—'}</p>
                )}
              </div>
              
              {/* № свидетельства о рождении */}
              <div>
                <p className="text-vista-light/60 text-sm">№ свидетельства</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="birthCertificateNumber" 
                    value={formData.birthCertificateNumber || ''} 
                    onChange={handleInputChange}
                    placeholder="Укажите номер"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{player?.birthCertificateNumber || '—'}</p>
                )}
              </div>
              
              {/* Дата зачисления в академию */}
              <div>
                <p className="text-vista-light/60 text-sm">Дата зачисления в академию</p>
                {isEditing ? (
                  <input 
                    type="date" 
                    name="academyJoinDate" 
                    value={formData.academyJoinDate ? formData.academyJoinDate.slice(0, 10) : ''} 
                    onChange={handleInputChange}
                    placeholder="Дата зачисления"
                    className="w-full bg-vista-dark border border-vista-secondary rounded p-1 text-vista-light"
                  />
                ) : (
                  <p className="text-vista-light">{formatDate(player?.academyJoinDate) || '—'}</p>
                )}
              </div>
              
              {/* Паспорт */}
              <div>
                <p className="text-vista-light/60 text-sm">Паспорт</p>
                <div className="flex items-center mt-1">
                  {player?.passportUrl ? (
                    <div className="flex items-center space-x-2">
                      <a 
                        href={player.passportUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-vista-primary hover:text-vista-primary/80 transition-colors"
                      >
                        <DocumentIcon className="h-5 w-5 mr-1" />
                        <span className="text-sm truncate max-w-[150px]">{player.passportFileName || 'Документ'}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument('passport')}
                        className="text-vista-error hover:text-vista-error/80 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => passportInputRef.current?.click()}
                      disabled={uploadingPassport}
                      className="flex items-center text-vista-light/70 hover:text-vista-primary transition-colors"
                    >
                      {uploadingPassport ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vista-primary mr-1"></div>
                      ) : (
                        <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-sm">Загрузить</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Свидетельство о рождении */}
              <div>
                <p className="text-vista-light/60 text-sm">Свидетельство о рождении</p>
                <div className="flex items-center mt-1">
                  {player?.birthCertificateUrl ? (
                    <div className="flex items-center space-x-2">
                      <a 
                        href={player.birthCertificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-vista-primary hover:text-vista-primary/80 transition-colors"
                      >
                        <DocumentIcon className="h-5 w-5 mr-1" />
                        <span className="text-sm truncate max-w-[150px]">{player.birthCertificateFileName || 'Документ'}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument('birthCertificate')}
                        className="text-vista-error hover:text-vista-error/80 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => certificateInputRef.current?.click()}
                      disabled={uploadingCertificate}
                      className="flex items-center text-vista-light/70 hover:text-vista-primary transition-colors"
                    >
                      {uploadingCertificate ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vista-primary mr-1"></div>
                      ) : (
                        <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-sm">Загрузить</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Медицинская страховка */}
              <div>
                <p className="text-vista-light/60 text-sm">Мед. страховка</p>
                <div className="flex items-center mt-1">
                  {player?.insuranceUrl ? (
                    <div className="flex items-center space-x-2">
                      <a 
                        href={player.insuranceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-vista-primary hover:text-vista-primary/80 transition-colors"
                      >
                        <DocumentIcon className="h-5 w-5 mr-1" />
                        <span className="text-sm truncate max-w-[150px]">{player.insuranceFileName || 'Документ'}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument('insurance')}
                        className="text-vista-error hover:text-vista-error/80 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => insuranceInputRef.current?.click()}
                      disabled={uploadingInsurance}
                      className="flex items-center text-vista-light/70 hover:text-vista-primary transition-colors"
                    >
                      {uploadingInsurance ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vista-primary mr-1"></div>
                      ) : (
                        <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-sm">Загрузить</span>
                    </button>
                )}
              </div>
            </div>
            
              {/* PIN-код игрока */}
              <div className="w-auto bg-vista-dark/50 p-2 rounded-lg mt-2" style={{ maxWidth: '140px' }}>
                <div className="text-center mb-1">
                  <span className="text-vista-light/60 text-xs flex items-center justify-center">
                    <KeyIcon className="h-3 w-3 mr-1" /> PIN-код
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center text-vista-primary text-sm font-mono font-bold">
                    {player?.pinCode || '------'}
                  </div>
                  <button
                    onClick={handleGeneratePinCode}
                    disabled={generatingPin}
                    className="bg-vista-secondary/60 text-vista-light p-1 rounded hover:bg-vista-secondary/80 transition-colors text-xs ml-1"
                  >
                    {generatingPin ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-vista-light"></div>
                    ) : (
                      'Обновить'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 