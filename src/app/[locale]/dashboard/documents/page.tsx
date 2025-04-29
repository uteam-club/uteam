'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DocumentIcon, PhotoIcon, ExclamationCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  photoUrl?: string | null;
  passportUrl?: string | null;
  passportFileName?: string | null;
  birthCertificateUrl?: string | null;
  birthCertificateFileName?: string | null;
  birthCertificateNumber?: string | null;
  insuranceUrl?: string | null;
  insuranceFileName?: string | null;
};

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'documents' | 'data'>('documents');
  
  // Загрузка списка команд
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/coaching/teams');
        if (!response.ok) throw new Error('Не удалось загрузить команды');
        
        const data = await response.json();
        setTeams(data);
        
        // Автоматически выбираем первую команду, если список не пуст
        if (data.length > 0) {
          setSelectedTeam(data[0].id);
        }
      } catch (error) {
        console.error('Ошибка при загрузке команд:', error);
      }
    };
    
    fetchTeams();
  }, []);
  
  // Загрузка игроков выбранной команды
  useEffect(() => {
    if (!selectedTeam) return;
    
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/coaching/teams/${selectedTeam}/players`);
        if (!response.ok) throw new Error('Не удалось загрузить игроков');
        
        const data = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error('Ошибка при загрузке игроков:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlayers();
  }, [selectedTeam]);
  
  // Определение типа файла и отображение соответствующей иконки
  const getFileIcon = (url?: string | null) => {
    if (!url) return <ExclamationCircleIcon className="h-6 w-6 text-vista-light/30" />;
    
    if (url.toLowerCase().endsWith('.pdf')) {
      return <DocumentIcon className="h-6 w-6 text-vista-primary" />;
    } else {
      return <PhotoIcon className="h-6 w-6 text-vista-primary" />;
    }
  };
  
  // Открытие предпросмотра документа
  const handleDocumentClick = (url?: string | null, title: string = 'Документ') => {
    if (!url) return;
    setPreviewDoc({ url, title });
  };
  
  // Закрытие предпросмотра
  const handleClosePreview = () => {
    setPreviewDoc(null);
  };
  
  // Получение полного имени игрока
  const getFullName = (player: Player) => {
    return `${player.lastName} ${player.firstName}${player.middleName ? ' ' + player.middleName : ''}`;
  };
  
  // Экспорт данных в Excel
  const exportToExcel = () => {
    if (players.length === 0) return;
    
    // Получаем имя выбранной команды
    const selectedTeamName = teams.find(team => team.id === selectedTeam)?.name || 'команда';
    
    // Подготовка данных для экспорта
    const data = players.map(player => ({
      'Фамилия': player.lastName || '',
      'Имя': player.firstName || '',
      'Отчество': player.middleName || '',
      '№ свидетельства о рождении': player.birthCertificateNumber || ''
    }));
    
    // Создание рабочей книги Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Игроки');
    
    // Установка ширины столбцов
    const columnWidths = [
      { wch: 20 }, // Фамилия
      { wch: 15 }, // Имя
      { wch: 20 }, // Отчество
      { wch: 25 }  // № свидетельства
    ];
    worksheet['!cols'] = columnWidths;
    
    // Создание и скачивание файла
    XLSX.writeFile(workbook, `Игроки_${selectedTeamName}_${new Date().toLocaleDateString()}.xlsx`);
  };
  
  return (
    <div className="container-app py-6">
      <h1 className="text-2xl font-bold text-vista-light mb-6">Документы игроков</h1>
      
      {/* Фильтры */}
      <div className="bg-vista-secondary/30 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm text-vista-light/70 mb-1">Команда</label>
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full md:w-64 bg-vista-dark border border-vista-secondary rounded p-2 text-vista-light"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-auto">
            <label className="block text-sm text-vista-light/70 mb-1">Режим просмотра</label>
            <div className="flex border border-vista-secondary rounded overflow-hidden">
              <button
                onClick={() => setViewMode('documents')}
                className={`px-4 py-2 text-sm ${
                  viewMode === 'documents' 
                    ? 'bg-vista-primary text-vista-dark font-medium' 
                    : 'bg-vista-dark text-vista-light hover:bg-vista-secondary/50'
                }`}
              >
                Документы
              </button>
              <button
                onClick={() => setViewMode('data')}
                className={`px-4 py-2 text-sm ${
                  viewMode === 'data' 
                    ? 'bg-vista-primary text-vista-dark font-medium' 
                    : 'bg-vista-dark text-vista-light hover:bg-vista-secondary/50'
                }`}
              >
                Данные
              </button>
            </div>
          </div>
          
          {viewMode === 'data' && (
            <div className="w-full md:w-auto ml-auto">
              <label className="block text-sm text-vista-light/70 mb-1">Действия</label>
              <button
                onClick={exportToExcel}
                disabled={players.length === 0 || loading}
                className="flex items-center gap-2 px-4 py-2 bg-vista-primary text-vista-dark rounded hover:bg-vista-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Экспорт в Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Таблица документов */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-10 text-vista-light/70">
          {selectedTeam ? 'В выбранной команде нет игроков' : 'Выберите команду для просмотра документов'}
        </div>
      ) : (
        <div className="bg-vista-secondary/30 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vista-secondary/50">
                <th className="text-left p-4 text-vista-light/70">Игрок</th>
                {viewMode === 'documents' ? (
                  <>
                    <th className="text-center p-4 text-vista-light/70">Паспорт</th>
                    <th className="text-center p-4 text-vista-light/70">Свидетельство о рождении</th>
                    <th className="text-center p-4 text-vista-light/70">№ свидетельства</th>
                    <th className="text-center p-4 text-vista-light/70">Мед. страховка</th>
                  </>
                ) : (
                  <>
                    <th className="text-center p-4 text-vista-light/70">№ свидетельства</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-vista-secondary/50 hover:bg-vista-secondary/40 transition-colors">
                  <td className="p-4 text-vista-light">{getFullName(player)}</td>
                  
                  {viewMode === 'documents' ? (
                    <>
                      <td className="p-4">
                        <div 
                          className="flex justify-center cursor-pointer" 
                          onClick={() => handleDocumentClick(player.passportUrl, `Паспорт - ${getFullName(player)}`)}
                        >
                          {getFileIcon(player.passportUrl)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div 
                          className="flex justify-center cursor-pointer" 
                          onClick={() => handleDocumentClick(player.birthCertificateUrl, `Свидетельство о рождении - ${getFullName(player)}`)}
                        >
                          {getFileIcon(player.birthCertificateUrl)}
                        </div>
                      </td>
                      <td className="p-4 text-center text-vista-light">
                        {player.birthCertificateNumber || '—'}
                      </td>
                      <td className="p-4">
                        <div 
                          className="flex justify-center cursor-pointer" 
                          onClick={() => handleDocumentClick(player.insuranceUrl, `Мед. страховка - ${getFullName(player)}`)}
                        >
                          {getFileIcon(player.insuranceUrl)}
                        </div>
                      </td>
                    </>
                  ) : (
                    <td className="p-4 text-center text-vista-light">
                      {player.birthCertificateNumber || '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Модальное окно предпросмотра документа */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vista-dark/80">
          <div className="relative bg-vista-secondary/90 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-vista-secondary">
              <h3 className="text-xl font-semibold text-vista-light">{previewDoc.title}</h3>
              <button 
                onClick={handleClosePreview}
                className="text-vista-light hover:text-vista-primary transition-colors"
              >
                Закрыть
              </button>
            </div>
            <div className="flex-grow p-4 overflow-auto flex items-center justify-center bg-vista-dark/70">
              {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={previewDoc.url} 
                  className="w-full h-full min-h-[500px]" 
                  title={previewDoc.title}
                />
              ) : (
                <img 
                  src={previewDoc.url} 
                  alt={previewDoc.title}
                  className="max-w-full max-h-[70vh] object-contain" 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 