'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
// Маппинг статусов на читаемые названия
const statusLabels = {
    TRAINED: 'Тренировался',
    REHAB: 'Реабилитация',
    SICK: 'Болеет',
    EDUCATION: 'Учеба',
    OTHER: 'Другое'
};
// Маппинг статусов на цвета
const statusColors = {
    TRAINED: 'bg-green-600 hover:bg-green-700',
    REHAB: 'bg-yellow-600 hover:bg-yellow-700',
    SICK: 'bg-red-600 hover:bg-red-700',
    EDUCATION: 'bg-blue-600 hover:bg-blue-700',
    OTHER: 'bg-gray-600 hover:bg-gray-700'
};
export default function AttendanceModal({ trainingId, isOpen, onClose }) {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
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
            const playersWithImages = data.filter((player) => player.imageUrl);
            console.log(`AttendanceModal: ${playersWithImages.length} из ${data.length} игроков имеют фотографии`);
            if (playersWithImages.length > 0) {
                console.log('AttendanceModal: Пример URL изображения:', playersWithImages[0].imageUrl);
            }
            setPlayers(data);
        }
        catch (error) {
            console.error('Ошибка при загрузке данных посещаемости:', error);
            setError(error.message || 'Не удалось загрузить данные посещаемости');
        }
        finally {
            setLoading(false);
        }
    };
    // Функция для обновления статуса посещаемости
    const updateStatus = (playerId, status) => {
        setPlayers(prev => prev.map(player => player.id === playerId
            ? Object.assign(Object.assign({}, player), { attendance: Object.assign(Object.assign({}, player.attendance), { status }) }) : player));
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
        }
        catch (error) {
            console.error('Ошибка при сохранении данных посещаемости:', error);
            setError(error.message || 'Не удалось сохранить данные посещаемости');
        }
        finally {
            setSaving(false);
        }
    };
    // Обработчик клика вне меню для закрытия всех открытых меню
    useEffect(() => {
        const handleClickOutside = (event) => {
            const allMenus = document.querySelectorAll('[data-status-menu]');
            allMenus.forEach(menu => {
                // Проверяем, что клик не был внутри меню или по кнопке статуса
                const target = event.target;
                if (!menu.contains(target) &&
                    !target.closest('[data-status-button]')) {
                    menu.style.display = 'none';
                }
            });
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);
    // Если модальное окно закрыто, не рендерим его содержимое
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      
      <div className="relative max-h-[90vh] w-full max-w-2xl bg-vista-dark border border-vista-secondary/30 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Заголовок модального окна */}
        <div className="flex justify-between items-center p-4 border-b border-vista-secondary/30">
          <h3 className="text-xl font-semibold text-vista-light">Посещаемость тренировки</h3>
          <button onClick={onClose} className="text-vista-light/50 hover:text-vista-light transition-colors">
            <XMarkIcon className="w-6 h-6"/>
          </button>
        </div>
        
        {/* Содержимое модального окна */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (<div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
              <span className="ml-2 text-vista-light/80">Загрузка данных...</span>
            </div>) : error ? (<div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchAttendance} className="mt-2 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
                Попробовать снова
              </Button>
            </div>) : (<>
              {success && (<div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2"/>
                  <span className="text-green-500">Данные успешно сохранены</span>
                </div>)}
              
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto] gap-4 mb-2 pb-2 border-b border-vista-secondary/30">
                  <div className="text-sm font-medium text-vista-light/80">Игрок</div>
                  <div className="text-sm font-medium text-vista-light/80">Статус</div>
                </div>
                
                {players.length === 0 ? (<div className="text-center p-8 text-vista-light/50">
                    Нет игроков в команде
                  </div>) : (players.map((player) => (<div key={player.id} className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div className="flex items-center">
                        {/* Фото игрока */}
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] mr-3 flex-shrink-0">
                          {player.imageUrl ? (<img src={player.imageUrl} alt={`${player.lastName} ${player.firstName}`} className="h-full w-full object-cover" onError={(e) => {
                        // В случае ошибки загрузки используем аватар по умолчанию
                        const target = e.target;
                        target.src = `https://ui-avatars.com/api/?name=${player.firstName}+${player.lastName}&background=344054&color=fff&size=100`;
                    }}/>) : (<div className="h-full w-full flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-slate-300"/>
                            </div>)}
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
                          <button data-status-button className={`px-3 py-1.5 rounded text-white min-w-[140px] text-sm ${statusColors[player.attendance.status]}`} onClick={(e) => {
                    e.stopPropagation(); // Предотвращаем всплытие события
                    // Закрываем все другие открытые меню
                    const allMenus = document.querySelectorAll('[data-status-menu]');
                    allMenus.forEach(menu => {
                        if (menu.id !== `status-menu-${player.id}`) {
                            menu.style.display = 'none';
                        }
                    });
                    // Открываем/закрываем текущее меню
                    const menu = document.getElementById(`status-menu-${player.id}`);
                    if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    }
                }}>
                            {statusLabels[player.attendance.status]}
                          </button>
                          
                          <div id={`status-menu-${player.id}`} data-status-menu className="absolute right-0 mt-1 w-48 bg-vista-dark/90 backdrop-blur-md border border-vista-secondary/30 rounded shadow-lg z-10 hidden" onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие для меню
            >
                            {Object.keys(statusLabels).map((status) => (<button key={status} className={`block w-full text-left px-4 py-2 text-sm ${player.attendance.status === status
                        ? 'bg-vista-secondary/20 text-vista-primary'
                        : 'text-vista-light/70 hover:bg-vista-secondary/10'}`} onClick={(e) => {
                        updateStatus(player.id, status);
                        // Закрываем меню после выбора
                        const menu = document.getElementById(`status-menu-${player.id}`);
                        if (menu)
                            menu.style.display = 'none';
                        e.stopPropagation(); // Предотвращаем всплытие события
                    }}>
                                {statusLabels[status]}
                              </button>))}
                          </div>
                        </div>
                      </div>
                    </div>)))}
              </div>
            </>)}
        </div>
        
        {/* Футер модального окна */}
        <div className="p-4 border-t border-vista-secondary/30 flex justify-end">
          <Button onClick={onClose} variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 mr-2">
            Отмена
          </Button>
          <Button onClick={saveAttendance} disabled={loading || saving} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>);
}
