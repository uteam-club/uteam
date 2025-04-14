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
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

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
  teamId: string;
  team: {
    id: string;
    name: string;
  };
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }
      
      const data = await response.json();
      console.log('Успешная загрузка:', data);
      
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

  // Форматирование даты
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch (error) {
      return '';
    }
  };

  // Получение текста позиции
  const getPositionText = (position: string | null | undefined) => {
    if (!position) return '';
    
    switch (position) {
      case 'GOALKEEPER': return 'Вратарь';
      case 'DEFENDER': return 'Защитник';
      case 'MIDFIELDER': return 'Полузащитник';
      case 'FORWARD': return 'Нападающий';
      default: return '';
    }
  };

  // Получение текста сильной ноги
  const getFootText = (foot: string | null | undefined) => {
    if (!foot) return '';
    
    switch (foot) {
      case 'LEFT': return 'Левая';
      case 'RIGHT': return 'Правая';
      case 'BOTH': return 'Обе';
      default: return '';
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
          <span>Вернуться к команде {player?.team?.name || ''}</span>
        </Link>
      </div>

      <div className="bg-vista-secondary/30 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Фото профиля */}
          <div className="flex-shrink-0">
            <div className="relative w-40 h-40 mx-auto md:mx-0">
              {player?.photoUrl ? (
                <div className="w-40 h-40 rounded-full overflow-hidden bg-vista-dark/50">
                  <img 
                    src={player.photoUrl} 
                    alt={`${player.firstName} ${player.lastName}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-full bg-vista-primary/20 flex items-center justify-center text-vista-primary">
                  <UserCircleIcon className="w-32 h-32" />
                </div>
              )}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-vista-dark rounded-full p-2 shadow hover:bg-vista-dark/90 transition-colors"
              >
                <ArrowUpTrayIcon className="h-5 w-5 text-vista-light" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
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
            </div>
            
            {/* Био */}
            <div className="mt-6">
              <p className="text-vista-light/60 text-sm mb-1">О игроке</p>
              {isEditing ? (
                <textarea 
                  name="bio" 
                  value={formData.bio || ''} 
                  onChange={handleInputChange}
                  placeholder="Информация об игроке"
                  className="w-full bg-vista-dark border border-vista-secondary rounded p-2 text-vista-light h-24"
                />
              ) : (
                <p className="text-vista-light">{player?.bio || '—'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 