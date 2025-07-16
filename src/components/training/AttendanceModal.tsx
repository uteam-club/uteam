'use client';

import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

// Типы статусов посещаемости
type AttendanceStatus = 'TRAINED' | 'REHAB' | 'SICK' | 'EDUCATION' | 'OTHER';

interface AttendanceModalProps {
  trainingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AttendanceModal({ trainingId, isOpen, onClose }: AttendanceModalProps) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<PlayerAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Маппинг статусов на читаемые названия (мемоизированный, зависит от языка)
  const statusLabels = useMemo(() => ({
    TRAINED: t('attendanceModal.status_trained'),
    REHAB: t('attendanceModal.status_rehab'),
    SICK: t('attendanceModal.status_sick'),
    EDUCATION: t('attendanceModal.status_education'),
    OTHER: t('attendanceModal.status_other'),
  }), [t]);

  // Маппинг статусов на цвета
  const statusColors: Record<AttendanceStatus, string> = {
    TRAINED: 'bg-green-600 hover:bg-green-700',
    REHAB: 'bg-yellow-600 hover:bg-yellow-700',
    SICK: 'bg-red-600 hover:bg-red-700',
    EDUCATION: 'bg-blue-600 hover:bg-blue-700',
    OTHER: 'bg-gray-600 hover:bg-gray-700'
  };

  // Интерфейс для данных игрока
  interface PlayerAttendance {
    id: string;
    firstName: string;
    lastName: string;
    number?: string | number;
    positionInTeam?: string;
    imageUrl?: string;
    attendance: {
      id?: string;
      status: AttendanceStatus;
      comment?: string;
    };
  }

  // Загрузка данных о посещаемости при открытии модального окна
  useEffect(() => {
    if (isOpen && trainingId) {
      fetchAttendance();
    }
  }, [isOpen, trainingId]);

  // Функция для загрузки данных о посещаемости
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/trainings/${trainingId}/attendance`);
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке данных посещаемости');
      }
      
      const data = await response.json();
      console.log('AttendanceModal: Получены данные игроков:', data);
      
      // Проверяем наличие фотографий у игроков
      const playersWithImages = data.filter((player: PlayerAttendance) => player.imageUrl);
      console.log(`AttendanceModal: ${playersWithImages.length} из ${data.length} игроков имеют фотографии`);
      if (playersWithImages.length > 0) {
        console.log('AttendanceModal: Пример URL изображения:', playersWithImages[0].imageUrl);
      }
      
      setPlayers(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке данных посещаемости:', error);
      setError(error.message || 'Не удалось загрузить данные посещаемости');
    } finally {
      setLoading(false);
    }
  };

  // Функция для обновления статуса посещаемости
  const updateStatus = (playerId: string, status: AttendanceStatus) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id === playerId 
          ? { ...player, attendance: { ...player.attendance, status } }
          : player
      )
    );
  };

  // Функция для сохранения данных посещаемости
  const saveAttendance = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      setError('');
      
      // Подготовка данных для отправки на сервер
      const attendanceData = players.map(player => ({
        playerId: player.id,
        status: player.attendance.status,
        comment: player.attendance.comment
      }));
      
      const response = await fetch(`/api/trainings/${trainingId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при сохранении данных посещаемости');
      }
      
      setSuccess(true);
      
      // Через 2 секунды закрываем модальное окно
      setTimeout(() => {
        if (success) {
          onClose();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Ошибка при сохранении данных посещаемости:', error);
      setError(error.message || 'Не удалось сохранить данные посещаемости');
    } finally {
      setSaving(false);
    }
  };

  // Обработчик клика вне меню для закрытия всех открытых меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const allMenus = document.querySelectorAll('[data-status-menu]');
      allMenus.forEach(menu => {
        // Проверяем, что клик не был внутри меню или по кнопке статуса
        const target = event.target as Node;
        if (!menu.contains(target) && 
            !(target as HTMLElement).closest('[data-status-button]')) {
          (menu as HTMLElement).style.display = 'none';
        }
      });
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Если модальное окно закрыто, не рендерим его содержимое
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-vista-light">{t('attendanceModal.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
              <span className="ml-2 text-vista-light/80">{t('attendanceModal.loading')}</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-red-500">{error}</p>
              <Button
                onClick={fetchAttendance}
                className="mt-2 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              >
                {t('attendanceModal.try_again')}
              </Button>
            </div>
          ) : (
            <>
              {success && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-500">{t('attendanceModal.save_success')}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto] gap-4 mb-2 pb-2 border-b border-vista-secondary/30">
                  <div className="text-sm font-medium text-vista-light/80">{t('attendanceModal.player')}</div>
                  <div className="text-sm font-medium text-vista-light/80">{t('attendanceModal.status')}</div>
                </div>
                
                {players.length === 0 ? (
                  <div className="text-center p-8 text-vista-light/50">
                    Нет игроков в команде
                  </div>
                ) : (
                  players.map((player) => (
                    <div key={player.id} className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div className="flex items-center">
                        {/* Фото игрока */}
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] mr-3 flex-shrink-0">
                          {player.imageUrl ? (
                            <img 
                              src={player.imageUrl}
                              alt={`${player.lastName} ${player.firstName}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // В случае ошибки загрузки используем аватар по умолчанию
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${player.firstName}+${player.lastName}&background=344054&color=fff&size=100`;
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-vista-light">
                            {player.lastName} {player.firstName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        {/* Изменяем с group hover на логику клика */}
                        <div>
                          <button 
                            data-status-button
                            className={`px-3 py-1.5 rounded text-white min-w-[140px] text-sm ${statusColors[player.attendance.status]}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Предотвращаем всплытие события
                              
                              // Закрываем все другие открытые меню
                              const allMenus = document.querySelectorAll('[data-status-menu]');
                              allMenus.forEach(menu => {
                                if (menu.id !== `status-menu-${player.id}`) {
                                  (menu as HTMLElement).style.display = 'none';
                                }
                              });
                              
                              // Открываем/закрываем текущее меню
                              const menu = document.getElementById(`status-menu-${player.id}`);
                              if (menu) {
                                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                              }
                            }}
                          >
                            {statusLabels[player.attendance.status]}
                          </button>
                          
                          <div 
                            id={`status-menu-${player.id}`}
                            data-status-menu
                            className="absolute right-0 mt-1 w-48 bg-vista-dark/90 backdrop-blur-md border border-vista-secondary/30 rounded shadow-lg z-10 hidden"
                            onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие для меню
                          >
                            {(Object.keys(statusLabels) as AttendanceStatus[]).map((status) => (
                              <button
                                key={status}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                  player.attendance.status === status 
                                    ? 'bg-vista-secondary/20 text-vista-primary' 
                                    : 'text-vista-light/70 hover:bg-vista-secondary/10'
                                }`}
                                onClick={(e) => {
                                  updateStatus(player.id, status);
                                  // Закрываем меню после выбора
                                  const menu = document.getElementById(`status-menu-${player.id}`);
                                  if (menu) menu.style.display = 'none';
                                  e.stopPropagation(); // Предотвращаем всплытие события
                                }}
                              >
                                {statusLabels[status]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="p-4 border-t border-vista-secondary/30 flex justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 mr-2"
          >
            {t('attendanceModal.cancel')}
          </Button>
          <Button
            onClick={saveAttendance}
            disabled={loading || saving}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            {t('attendanceModal.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 