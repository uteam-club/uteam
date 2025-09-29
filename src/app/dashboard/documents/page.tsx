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
  SearchIcon,
  Search,
  X
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { countries as countriesList } from '@/lib/countries';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isValid } from 'date-fns';
import type { SupportedLang } from '@/types/i18n';

interface Country {
  code: string;
  name: {
    [key: string]: string;
  };
}

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
  dateOfBirth: string;
  nationality: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [wasHidden, setWasHidden] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFields, setExportFields] = useState({
    fio: true,
    birthDate: true,
    nationality: true,
    team: true,
    passport: true,
    insurance: true,
    visa: true,
    birthCertificateNumber: true,
  });

  const { t, i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'ru';

  const countries: Country[] = countriesList;

  // Оптимизированная функция для получения списка команд
  const fetchTeams = useCallback(async () => {
    if (teams.length > 0) return; // Предотвращаем повторную загрузку
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Не удалось загрузить список команд');
      }
      const data = await response.json();
      setTeams(data);
      // По умолчанию выбираем первую команду из списка
      if (data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error) {
      console.error('Ошибка при загрузке команд:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teams.length]);

  // Оптимизированная функция для получения документов игроков
  const fetchPlayerDocuments = useCallback(async () => {
    if (!selectedTeamId || isLoading) return;
    
    try {
      setIsLoading(true);
      const url = `/api/players/documents?teamId=${selectedTeamId}`;

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
  }, [selectedTeamId, isLoading]);

  // Загрузка списка команд при инициализации страницы
  useEffect(() => {
    if (session?.user && teams.length === 0) {
      fetchTeams();
    }
  }, [session, teams.length]);

  // Загрузка игроков при изменении выбранной команды
  useEffect(() => {
    if (selectedTeamId) {
      fetchPlayerDocuments();
    }
  }, [selectedTeamId]);

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
      const teamName = teams.find(team => team.id === selectedTeamId)?.name || 'Игроки';
      
      const fileName = `${teamName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      // Скачивание файла
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Ошибка при скачивании Excel:', error);
    }
  };

  // Новый экспорт с выбором полей
  const handleExport = () => {
    setExportModalOpen(true);
  };

  const handleExportConfirm = () => {
    // Формируем данные для экспорта
    const data = players.map(player => {
      const row: Record<string, string> = {};
      if (exportFields.fio) {
        row['ФИО'] = player.middleName
          ? `${player.lastName} ${player.firstName} ${player.middleName}`
          : `${player.lastName} ${player.firstName}`;
      }
      if (exportFields.birthDate) {
        row['Дата рождения'] = player.dateOfBirth
          ? new Date(player.dateOfBirth).toLocaleDateString('ru-RU')
          : '';
      }
      if (exportFields.nationality) {
        const country = countries.find(c => c.code === player.nationality);
        row['Национальность'] = country ? country.name[lang] : player.nationality || '';
      }
      if (exportFields.team) {
        let teamName = player.team?.name;
        if (!teamName && player.team?.id) {
          const found = teams.find(t => t.id === player.team.id);
          if (found) teamName = found.name;
        }
        row['Команда'] = teamName || '';
      }
      if (exportFields.passport) {
        row['Номер паспорта'] = player.passportData || '';
      }
      if (exportFields.insurance) {
        row['Номер мед. страховки'] = player.insuranceNumber || '';
      }
      if (exportFields.visa) {
        row['Дата окончания визы'] = player.visaExpiryDate || '';
      }
      if (exportFields.birthCertificateNumber) {
        row['Номер свидетельства о рождении'] = player.birthCertificateNumber || '';
      }
      return row;
    });
    // Генерируем Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Игроки');
    const fileName = `Экспорт_игроков_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setExportModalOpen(false);
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
            <CardTitle className="text-vista-light">{t('documentsPage.select_team')}</CardTitle>
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
          <CardContent>
            <div className="overflow-x-auto custom-scrollbar">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">Документы игроков</CardTitle>
          <div className="w-[200px] h-9"></div> {/* Пустая кнопка для выравнивания */}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-6">
            <div className="w-full sm:w-[200px]">
              <Select 
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
                  <SelectValue placeholder={t('documentsPage.select_team')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">{t('documentsPage.all_teams')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input
                type="text"
                placeholder={t('documentsPage.search_player')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/90 placeholder-vista-light/60 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal text-sm shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vista-light/50 hover:text-vista-light"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-normal text-vista-light/70 whitespace-nowrap">
                {t('documentsPage.total_players', {count: players.length})}
              </span>
              <Button
                variant="outline"
                onClick={handleExport}
                className="w-full sm:w-[200px] bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-2 font-normal text-sm"
                title={t('documentsPage.export_excel')}
              >
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                <span>Экспортировать</span>
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-vista-dark/70 hover:bg-vista-dark/70 border-b border-vista-secondary/50 shadow-md">
                  <TableHead className="text-vista-light/80 font-medium w-[250px] min-w-[250px] sticky left-0 bg-vista-dark/70 shadow-sm">{t('documentsPage.player')}</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">{t('documentsPage.passport')}</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">{t('documentsPage.birth_certificate')}</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">{t('documentsPage.medical_insurance')}</TableHead>
                  <TableHead className="text-vista-light/80 font-medium w-[180px] min-w-[180px] text-center">{t('documentsPage.visa')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-vista-light/70">
                      {t('documentsPage.not_found')}
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
                            <div className="text-vista-light font-normal text-sm">
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
                              {isValid(parseISO(player.visaExpiryDate)) ? format(parseISO(player.visaExpiryDate), 'dd.MM.yyyy') : player.visaExpiryDate}
                            </a>
                          ) : (
                            <span>{isValid(parseISO(player.visaExpiryDate)) ? format(parseISO(player.visaExpiryDate), 'dd.MM.yyyy') : player.visaExpiryDate}</span>
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
      {/* Модалка выбора полей для экспорта */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md bg-vista-dark border border-vista-secondary/40 rounded-xl shadow-xl text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-lg text-vista-light">{t('documentsPage.export_fields_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox id="fio" checked={exportFields.fio} onCheckedChange={v => setExportFields(f => ({ ...f, fio: v === true }))} className="accent-vista-primary" />
              <label htmlFor="fio" className="text-sm text-vista-light">{t('documentsPage.fio')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="birthDate" checked={exportFields.birthDate} onCheckedChange={v => setExportFields(f => ({ ...f, birthDate: v === true }))} className="accent-vista-primary" />
              <label htmlFor="birthDate" className="text-sm text-vista-light">{t('documentsPage.birth_date')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="nationality" checked={exportFields.nationality} onCheckedChange={v => setExportFields(f => ({ ...f, nationality: v === true }))} className="accent-vista-primary" />
              <label htmlFor="nationality" className="text-sm text-vista-light">{t('documentsPage.nationality')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="team" checked={exportFields.team} onCheckedChange={v => setExportFields(f => ({ ...f, team: v === true }))} className="accent-vista-primary" />
              <label htmlFor="team" className="text-sm text-vista-light">{t('documentsPage.team')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="passport" checked={exportFields.passport} onCheckedChange={v => setExportFields(f => ({ ...f, passport: v === true }))} className="accent-vista-primary" />
              <label htmlFor="passport" className="text-sm text-vista-light">{t('documentsPage.passport_number')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="insurance" checked={exportFields.insurance} onCheckedChange={v => setExportFields(f => ({ ...f, insurance: v === true }))} className="accent-vista-primary" />
              <label htmlFor="insurance" className="text-sm text-vista-light">{t('documentsPage.insurance_number')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="visa" checked={exportFields.visa} onCheckedChange={v => setExportFields(f => ({ ...f, visa: v === true }))} className="accent-vista-primary" />
              <label htmlFor="visa" className="text-sm text-vista-light">{t('documentsPage.visa_expiry')}</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="birthCertificateNumber" checked={exportFields.birthCertificateNumber} onCheckedChange={v => setExportFields(f => ({ ...f, birthCertificateNumber: v === true }))} className="accent-vista-primary" />
              <label htmlFor="birthCertificateNumber" className="text-sm text-vista-light">{t('documentsPage.birth_certificate_number')}</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleExportConfirm} className="w-full bg-vista-primary text-vista-dark hover:bg-vista-primary/80">{t('documentsPage.export')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 