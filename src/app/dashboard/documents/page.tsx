'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileIcon, 
  FileTextIcon, 
  FileX2Icon,
  FileCheckIcon, 
  UserIcon,
  UsersIcon,
  DownloadIcon,
  SearchIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface Team {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  publicUrl: string;
  createdAt: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthCertificateNumber: string | null;
  imageUrl: string | null;
  team: {
    id: string;
    name: string;
  };
  documents: {
    PASSPORT: Document | null;
    BIRTH_CERTIFICATE: Document | null;
    MEDICAL_INSURANCE: Document | null;
    VISA: Document | null;
    OTHER: Document | null;
  };
  passportData: string;
  insuranceNumber: string;
  visaExpiryDate: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [wasHidden, setWasHidden] = useState(false);

  // Оптимизированная функция для получения списка команд
  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Не удалось загрузить список команд');
      }
      const data = await response.json();
      setTeams(data);
      
      // Выбираем первую команду в списке по умолчанию, если список не пуст
      if (data.length > 0) {
        setSelectedTeamId(data[0].id);
      } else {
        setSelectedTeamId('all');
      }
    } catch (error) {
      console.error('Ошибка при загрузке команд:', error);
    }
  }, []);

  // Оптимизированная функция для получения документов игроков
  const fetchPlayerDocuments = useCallback(async () => {
    if (!selectedTeamId) return;
    
    try {
      setIsLoading(true);
      const url = selectedTeamId === 'all' 
        ? '/api/players/documents' 
        : `/api/players/documents?teamId=${selectedTeamId}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Не удалось загрузить документы игроков');
      }
      const data = await response.json();
      setAllPlayers(data);
      setPlayers(data);
    } catch (error) {
      console.error('Ошибка при загрузке документов игроков:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId]);

  // Загрузка списка команд при инициализации страницы
  useEffect(() => {
    if (session?.user) {
      fetchTeams();
    }
  }, [session, fetchTeams]);

  // Загрузка игроков при изменении выбранной команды
  useEffect(() => {
    if (selectedTeamId) {
      fetchPlayerDocuments();
    }
  }, [selectedTeamId, fetchPlayerDocuments]);

  // Функция для фильтрации игроков по поисковому запросу
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setPlayers(allPlayers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allPlayers.filter(player => 
        `${player.firstName} ${player.lastName}`.toLowerCase().includes(query) ||
        `${player.lastName} ${player.firstName}`.toLowerCase().includes(query)
      );
      setPlayers(filtered);
    }
  }, [searchQuery, allPlayers]);

  // Функция для скачивания данных в Excel формате
  const downloadExcel = () => {
    try {
      // Подготовка данных для Excel
      const data = players.map(player => ({
        'Имя и фамилия': `${player.lastName} ${player.firstName}`,
        'Номер свидетельства о рождении': player.birthCertificateNumber || '—'
      }));
      
      // Создание книги Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Игроки');
      
      // Форматирование колонок
      const columnWidths = [
        { wch: 40 }, // ширина колонки для имени и фамилии
        { wch: 30 }, // ширина колонки для номера свидетельства
      ];
      worksheet['!cols'] = columnWidths;
      
      // Определение имени файла
      const teamName = selectedTeamId === 'all' 
        ? 'Все команды' 
        : teams.find(team => team.id === selectedTeamId)?.name || 'Игроки';
      
      const fileName = `${teamName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      // Скачивание файла
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Ошибка при скачивании Excel:', error);
    }
  };

  // Функция для отображения иконки документа
  const renderDocumentIcon = (document: Document | null) => {
    if (!document) {
      return (
        <div className="flex items-center text-vista-light/50">
          <FileX2Icon className="w-5 h-5 mr-1" />
        </div>
      );
    }

    return (
      <a 
        href={document.publicUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center text-vista-primary hover:text-vista-primary/80 transition-colors"
      >
        <FileTextIcon className="w-5 h-5 mr-1" />
        <span className="text-xs">Просмотр</span>
      </a>
    );
  };

  // Отображение скелетона во время загрузки
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-vista-light">Выберите команду</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <Skeleton className="h-10 w-64 bg-vista-dark/70" />
              <Skeleton className="h-10 w-64 bg-vista-dark/70" />
              <Skeleton className="h-10 w-10 bg-vista-dark/70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-vista-light">Документы игроков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Skeleton className="h-64 w-full bg-vista-dark/70" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">Выберите команду</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="w-64">
              <Select 
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
              >
                <SelectTrigger className="bg-vista-dark/70 border-vista-secondary/50 text-vista-light shadow-sm">
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="all" className="border-t border-vista-secondary/40 mt-2 pt-2">
                    Все команды
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-64 relative">
              <Input
                type="text"
                placeholder="Поиск игрока по имени"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-vista-dark/70 border-vista-secondary/50 text-vista-light pr-9 focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
              />
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vista-light/50" />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={downloadExcel}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
              title="Скачать список игроков в Excel"
            >
              <DownloadIcon className="h-4 w-4 text-vista-primary" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light flex justify-between items-center">
            <span>Документы игроков</span>
            <span className="text-sm font-normal text-vista-light/70">
              Всего: {players.length} игроков
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-vista-dark/70 hover:bg-vista-dark/70 border-b border-vista-secondary/50 shadow-md">
                  <TableHead className="text-vista-light/80 font-medium w-[250px] min-w-[250px] sticky left-0 bg-vista-dark/70 shadow-sm">Игрок</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">Паспорт</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">Свидетельство о рождении</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">Медицинская страховка</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">Виза</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-vista-light/70">
                      Не найдено игроков или документов
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((player) => (
                    <TableRow key={player.id} className="hover:bg-vista-dark/70 border-b border-vista-secondary/50 shadow-md">
                      <TableCell className="sticky left-0 bg-vista-dark/70 py-1.5 w-[250px] min-w-[250px] shadow-sm">
                        <div className="flex items-center space-x-2">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] flex items-center justify-center shadow-sm">
                            {player.imageUrl ? (
                              <img 
                                src={player.imageUrl} 
                                alt={`${player.firstName} ${player.lastName}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.firstName[0] + player.lastName[0])}&background=162a5b&color=fff&size=100`;
                                }}
                              />
                            ) : (
                              <UserIcon className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="text-vista-light font-semibold text-base">
                              {player.lastName} {player.firstName}{player.middleName ? ` ${player.middleName}` : ''}
                            </div>
                            <div className="text-xs text-vista-light/50">
                              {player.team.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-vista-light/80 w-[180px] min-w-[180px] text-center">
                        {player.passportData ? (
                          player.documents.PASSPORT && player.documents.PASSPORT.publicUrl ? (
                            <a
                              href={player.documents.PASSPORT.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-vista-primary/10 text-vista-primary rounded px-2 py-1 cursor-pointer transition hover:bg-vista-primary/20 hover:text-vista-primary/80"
                            >
                              {player.passportData}
                            </a>
                          ) : (
                            <span>{player.passportData}</span>
                          )
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-vista-light/80 w-[180px] min-w-[180px] text-center">
                        {player.birthCertificateNumber ? (
                          player.documents.BIRTH_CERTIFICATE && player.documents.BIRTH_CERTIFICATE.publicUrl ? (
                            <a
                              href={player.documents.BIRTH_CERTIFICATE.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-vista-primary/10 text-vista-primary rounded px-2 py-1 cursor-pointer transition hover:bg-vista-primary/20 hover:text-vista-primary/80"
                            >
                              {player.birthCertificateNumber}
                            </a>
                          ) : (
                            <span>{player.birthCertificateNumber}</span>
                          )
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-vista-light/80 w-[180px] min-w-[180px] text-center">
                        {player.insuranceNumber ? (
                          player.documents.MEDICAL_INSURANCE && player.documents.MEDICAL_INSURANCE.publicUrl ? (
                            <a
                              href={player.documents.MEDICAL_INSURANCE.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-vista-primary/10 text-vista-primary rounded px-2 py-1 cursor-pointer transition hover:bg-vista-primary/20 hover:text-vista-primary/80"
                            >
                              {player.insuranceNumber}
                            </a>
                          ) : (
                            <span>{player.insuranceNumber}</span>
                          )
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-vista-light/80 w-[180px] min-w-[180px] text-center">
                        {player.visaExpiryDate ? (
                          player.documents.VISA && player.documents.VISA.publicUrl ? (
                            <a
                              href={player.documents.VISA.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-vista-primary/10 text-vista-primary rounded px-2 py-1 cursor-pointer transition hover:bg-vista-primary/20 hover:text-vista-primary/80"
                            >
                              {player.visaExpiryDate}
                            </a>
                          ) : (
                            <span>{player.visaExpiryDate}</span>
                          )
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
      </div>
        </CardContent>
      </Card>
    </div>
  );
} 