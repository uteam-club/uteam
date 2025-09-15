'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { GpsReport } from '@/types/gps';

// Константы для строгого маппинга по профилю
const ATHLETE_NAME_KEY = 'athlete_name';
const ALLOW_NAME_HEURISTIC = false; // строго: используем только профиль
const DIAG = process.env.NODE_ENV !== 'production';

type NameMappingFromProfile = {
  sourceColumn?: string | null;
  isVisible?: boolean | null;
};

function pickOriginalKeyCaseInsensitive(target: string, keys: string[]): string | null {
  // Убрали отладочные логи
  
  const map = new Map(keys.map(k => [k.toLowerCase(), k]));
  const result = map.get(target.toLowerCase()) ?? null;
  return result;
}

// ===== УЛУЧШЕННОЕ АВТО-СОПОСТАВЛЕНИЕ ИГРОКОВ =====

// 1. Нормализация: регистр, диакритика, мусор, множественные пробелы
function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{Mark}+/gu, '');
}

function normalizeName(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-']/gu, ' ') // только буквы/цифры/пробел/дефис/апостроф
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Токенизация и сортировка токенов
function toTokens(s: string): string[] {
  if (!s) return [];
  return normalizeName(s)
    .split(' ')
    .filter(Boolean)
    .filter(token => token.length >= 2); // Игнорируем очень короткие токены (1 символ)
}

function tokenSortString(s: string): string {
  return toTokens(s).sort().join(' ');
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  
  if (uni === 0) return 0;
  
  // Более строгий Jaccard: требуем минимум 2 общих токена для высокого сходства
  const jaccardScore = inter / uni;
  
  // Если общих токенов меньше 2, снижаем оценку
  if (inter < 2) {
    return jaccardScore * 0.5; // Снижаем в 2 раза
  }
  
  return jaccardScore;
}

// 3. Levenshtein distance (используем существующую реализацию)
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[b.length][a.length];
}

// Возвращаем нормализованный процент 0..100
function ratioLevenshtein(a: string, b: string): number {
  const d = levenshteinDistance(normalizeName(a), normalizeName(b));
  const maxLen = Math.max(normalizeName(a).length, normalizeName(b).length);
  return maxLen === 0 ? 0 : Math.round((1 - d / maxLen) * 100);
}

// 4. Token-based метрики
function tokenSortRatio(a: string, b: string): number {
  return ratioLevenshtein(tokenSortString(a), tokenSortString(b));
}

function tokenSetJaccardRatio(a: string, b: string): number {
  return Math.round(jaccard(toTokens(a), toTokens(b)) * 100);
}

// 5. Улучшенный скоринг с защитой от ложных срабатываний
// Версия: 2024-01-15-v2 (исправлены ложные срабатывания Jaccard)
function nameSimilarity(a: string, b: string): number {
  const r1 = ratioLevenshtein(a, b);
  const r2 = tokenSortRatio(a, b);
  const r3 = tokenSetJaccardRatio(a, b);
  
  // Защита от ложных срабатываний Jaccard:
  // Если Jaccard дает высокий процент, но Levenshtein очень низкий - подозрительно
  if (r3 > 50 && r1 < 20) {
    // Jaccard может давать ложные срабатывания - используем только Levenshtein и tokenSort
    const safeMax = Math.max(r1, r2);
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[mapping/suspicious]', {
        a, b, 
        levenshtein: r1, 
        tokenSort: r2, 
        jaccard: r3, 
        safeMax,
        reason: 'Jaccard suspiciously high while Levenshtein very low'
      });
    }
    
    return safeMax;
  }
  
  // Дополнительная защита: если все метрики дают низкие значения, но одна из них подозрительно высокая
  if (r1 < 15 && r2 < 15 && r3 > 30) {
    // Jaccard дает подозрительно высокий результат при низких других метриках
    const safeMax = Math.max(r1, r2);
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[mapping/suspicious-jaccard]', {
        a, b, 
        levenshtein: r1, 
        tokenSort: r2, 
        jaccard: r3, 
        safeMax,
        reason: 'Jaccard suspiciously high while other metrics very low'
      });
    }
    
    return safeMax;
  }
  
  // Защита от TokenSort ложных срабатываний: если Levenshtein очень низкий, но TokenSort высокий
  if (r1 < 20 && r2 > 35 && r3 < 10) {
    // TokenSort дает подозрительно высокий результат при низком Levenshtein
    const safeMax = Math.max(r1, r3);
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[mapping/suspicious-tokensort]', {
        a, b, 
        levenshtein: r1, 
        tokenSort: r2, 
        jaccard: r3, 
        safeMax,
        reason: 'TokenSort suspiciously high while Levenshtein very low'
      });
    }
    
    return safeMax;
  }
  
  // Обычный максимум из трёх
  const max = Math.max(r1, r2, r3);
  
  // Dev-диагностика для отладки ложных срабатываний
  if (process.env.NODE_ENV !== 'production' && max > 30 && max < 70) {
    console.debug('[mapping/debug]', {
      a, b, 
      levenshtein: r1, 
      tokenSort: r2, 
      jaccard: r3, 
      max,
      tokensA: toTokens(a),
      tokensB: toTokens(b)
    });
  }
  
  // Принудительный лог для отладки
  if (process.env.NODE_ENV !== 'production') {
    
  }
  
  return max;
}

// Пороги для группировки
const AUTOPICK_THRESHOLD = 88;  // авто-присвоение "высокая уверенность"
const NONE_THRESHOLD = 35;      // ниже — считаем "не найден"

// Лучший матч для имени из файла
function bestMatchFor(name: string, teamPlayers: any[]) {
  let best: { player: any | null; score: number } = { player: null, score: 0 };
  for (const p of teamPlayers) {
    // выбери поле для сравнения: displayName/shortName/fullName — смотри что реально есть
    const candidate = p.displayName || p.fullName || p.name || '';
    const score = nameSimilarity(name, candidate);
    if (score > best.score) best = { player: p, score };
  }
  // Если совсем плохо — вернём null
  if (best.score < NONE_THRESHOLD) return { player: null, score: best.score };
  return best;
}

// Группировка матчей
function groupOf(m: any): 'high'|'medium'|'low'|'none'|'manual' {
  if (m.isManual) return 'manual';
  if (!m.teamPlayer) return 'none'; // Если никто не сопоставлен - всегда "none"
  if (m.similarity < NONE_THRESHOLD) return 'none';
  if (m.similarity >= AUTOPICK_THRESHOLD) return 'high';
  if (m.similarity >= 70) return 'medium';
  return 'low';
}


// Берём ЛЮБОЙ маппинг по canonicalMetric === 'athlete_name' (видимость не фильтруем здесь).
async function fetchNameMappingFromProfile(profileId: string): Promise<NameMappingFromProfile | null> {
  
  const res = await fetch(`/api/gps/profiles/${profileId}/mappings`);
  console.log('[mapping] Profile mappings response:', { 
    ok: res.ok, 
    status: res.status,
    statusText: res.statusText 
  });
  
  if (!res.ok) {
    console.error('[mapping] Failed to fetch profile mappings:', res.status, res.statusText);
    return null;
  }
  
  const mappings = await res.json();
  
  
  
  const mapping = Array.isArray(mappings)
    ? mappings.find((m: any) => m?.canonicalMetric === ATHLETE_NAME_KEY)
    : null;
    
  
  
  return mapping
    ? { sourceColumn: mapping.sourceColumn ?? null, isVisible: mapping.isVisible ?? true }
    : null;
}

// Разрешение колонки по маппингу профиля и заголовкам файла
function resolveNameColumnFromMapping(
  mapping: NameMappingFromProfile,
  fileHeaders: string[]
): string | null {
  console.log('[mapping] Resolving name column:', {
    mappingSourceColumn: mapping.sourceColumn,
    fileHeaders: fileHeaders,
    fileHeadersCount: fileHeaders.length
  });
  
  // Используем только sourceColumn (единственное поле в схеме БД)
  if (mapping.sourceColumn) {
    const exact = pickOriginalKeyCaseInsensitive(mapping.sourceColumn, fileHeaders);
    
    if (exact) return exact;
  }
  
  
  return null;
}

  // Загрузка данных отчёта с улучшенной диагностикой
  async function fetchReportData(reportId: string): Promise<{ rows: any[]; headers: string[] }> {
    const res = await fetch(`/api/gps/reports/${reportId}/data`);
    if (!res.ok) {
      console.error('[mapping] fetch data failed', res.status);
      throw new Error(`Failed to fetch report data: ${res.status}`);
    }
    const data = await res.json();
    const rows = Array.isArray(data?.rawData) ? data.rawData : [];
    const headers =
      rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>)
        : Array.isArray(data?.columns)
          ? (data.columns as string[])
          : [];
    if (headers.length === 0) {
      console.warn('[mapping] empty headers from report data', { dataKeys: Object.keys(data || {}) });
    }
    return { rows, headers };
  }

  // Обработка файла для получения данных
  async function processFile(file: File): Promise<{ rows: any[]; headers: string[] }> {
    console.log('[mapping] Processing file:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });
    
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/gps/process-file-form', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error('[mapping] process file failed', res.status);
      throw new Error(`Failed to process file: ${res.status}`);
    }

    const data = await res.json();
    console.log('[mapping] Processed file data:', { 
      hasRawData: !!data?.rawData, 
      rawDataLength: data?.rawData?.length,
      hasColumns: !!data?.columns,
      columnsLength: data?.columns?.length,
      columns: data?.columns,
      fullResponse: data
    });
    
    const rows = Array.isArray(data?.rawData) ? data.rawData : [];
    const headers = Array.isArray(data?.columns) ? data.columns : [];
    
    if (headers.length === 0) {
      console.warn('[mapping] empty headers from processed file', { dataKeys: Object.keys(data || {}) });
    }
    
    return { rows, headers };
  }

// Извлечение имён из конкретной колонки
function extractNames(rows: any[], column: string): string[] {
  return rows
    .map(r => (r?.[column] ?? ''))
    .map(String)
    .map(s => s.trim())
    .filter(Boolean);
}

interface UploadWizardMappingStepProps {
  report: GpsReport | null;
  reportId: string;
  teamId: string;
  profileId: string;
  onBack: () => void;
  onComplete: (created: number) => void;
  onCancel?: () => void;
  onSaveHandlerReady?: (handler: () => void) => void;
}

interface TeamPlayer {
  id: string;
  name: string;
}

interface FilePlayer {
  rowIndex: number;
  name: string;
}

interface PlayerMatch {
  rowIndex: number;
  filePlayer: string;
  teamPlayerId: string | null;
  teamPlayer: any | null;
  similarity: number;
  isManual: boolean;
}

interface SimilarityGroup {
  level: 'manual' | 'high' | 'medium' | 'low' | 'none';
  label: string;
  items: PlayerMatch[];
}

// Нормализация строки для сравнения
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[й]/g, 'и')
    .replace(/[ъь]/g, '')
    .replace(/[^а-яa-z0-9\s]/g, '')
    .trim();
}



// Группировка матчей по уровню сходства с новыми порогами
function groupMatches(matches: PlayerMatch[]): SimilarityGroup[] {
  const groups: SimilarityGroup[] = [
    { level: 'manual', label: 'Ручной выбор', items: [] },
    { level: 'high', label: 'Высокое сходство (88-100%)', items: [] },
    { level: 'medium', label: 'Среднее сходство (70-87%)', items: [] },
    { level: 'low', label: 'Низкое сходство (35-69%)', items: [] },
    { level: 'none', label: 'Не найден', items: [] }
  ];

  matches.forEach(match => {
    const group = groupOf(match);
    const groupIndex = groups.findIndex(g => g.level === group);
    if (groupIndex !== -1) {
      groups[groupIndex].items.push(match);
    }
  });

  // Сортируем элементы внутри каждой группы по убыванию процента сходства
  groups.forEach(group => {
    group.items.sort((a, b) => b.similarity - a.similarity);
  });

  return groups.filter(group => group.items.length > 0);
}

export default function UploadWizardMappingStep({ 
  report, 
  reportId, 
  teamId, 
  profileId, 
  onBack, 
  onComplete,
  onCancel,
  onSaveHandlerReady
}: UploadWizardMappingStepProps) {
  
  // Принудительный лог для отладки
  if (process.env.NODE_ENV !== 'production') {
    const hasFile = !!(report?.file);
    console.log('[MAPPING-COMPONENT] UploadWizardMappingStep v2 loaded', { 
      reportId, 
      teamId, 
      profileId, 
      hasFile,
      fileName: report?.fileName,
      reportKeys: Object.keys(report || {})
    });
  }
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveHandlerRegistered, setSaveHandlerRegistered] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [runExecuted, setRunExecuted] = useState(false);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [filePlayers, setFilePlayers] = useState<FilePlayer[]>([]);
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const [manualNameColumn, setManualNameColumn] = useState<string>('');
  const [rememberInProfile, setRememberInProfile] = useState<boolean>(true);


  // Построение матчей из массива имён с улучшенным алгоритмом
  const buildMatchesFromNames = async (names: string[]) => {
    try {
      // Загружаем игроков команды
      const teamPlayersResponse = await fetch(`/api/teams/${teamId}/players`);
      if (!teamPlayersResponse.ok) {
        throw new Error('Failed to load team players');
      }
      const teamPlayersData = await teamPlayersResponse.json();
      
      // Подготавливаем игроков команды с разными вариантами имён
      const teamPlayersList = teamPlayersData.map((player: any) => ({
        id: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        displayName: player.displayName || `${player.firstName} ${player.lastName}`.trim(),
        fullName: player.fullName || `${player.firstName} ${player.lastName}`.trim(),
        firstName: player.firstName,
        lastName: player.lastName
      }));

      setTeamPlayers(teamPlayersList);

      // Создаём filePlayers из имён
      const filePlayersData = names.map((name, index) => ({
        rowIndex: index,
        name: name
      }));

      setFilePlayers(filePlayersData);

      // Новый алгоритм сопоставления с защитой от дублирования
      const usedPlayerIds = new Set<string>();
      const matches = names.map((fileName, idx) => {
        const { player, score } = bestMatchFor(fileName, teamPlayersList);
        
        // Проверяем, не используется ли уже этот игрок
        const isPlayerAlreadyUsed = player && usedPlayerIds.has(player.id);
        
        // Если игрок уже используется, сбрасываем сопоставление
        const finalPlayer = isPlayerAlreadyUsed ? null : player;
        const finalScore = isPlayerAlreadyUsed ? 0 : (player ? score : 0);
        
        // Добавляем игрока в список использованных (если он не null)
        if (finalPlayer) {
          usedPlayerIds.add(finalPlayer.id);
        }
        
        return {
          filePlayer: fileName,
          rowIndex: idx + 1,
          teamPlayerId: finalPlayer?.id || null,
          teamPlayer: finalPlayer,     // null если score < NONE_THRESHOLD или уже используется
          similarity: finalScore,      // 0 если никто не сопоставлен или уже используется
          isManual: false,             // авто подбор по умолчанию
        };
      });

      setMatches(matches);

      // Dev-диагностика
      if (DIAG) {
        console.debug('[mapping/dev] roster:', teamPlayersList.length, teamPlayersList.slice(0,5).map((p: any) => p.displayName || p.fullName));
        console.debug('[mapping/dev] sample-matches:',
          names.slice(0,3).map(n => {
            const ranked = teamPlayersList
              .map((p: any) => ({ name: p.displayName || p.fullName || '', score: nameSimilarity(n, p.displayName || p.fullName || '') }))
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0,3);
            return { file: n, ranked };
          })
        );
      }

      console.debug('👤 Matches built from names:', { 
        count: matches.length,
        names: names.slice(0, 3)
      });
    } catch (error) {
      console.error('Error building matches from names:', error);
      setLoadError('Не удалось загрузить игроков команды');
    }
  };

  // Строгая загрузка данных по профилю
  useEffect(() => {
    const hasFile = !!(report?.file);
    console.log('[mapping] useEffect triggered:', { 
      reportId, 
      profileId, 
      hasFile,
      fileName: report?.fileName,
      rawRowsLength: rawRows.length,
      allColumnsLength: allColumns.length
    });
    
    let abort = false;

    async function run() {
      try {
        setLoadError(null);


        // 0.1) Health-диагностика (dev-only)
        if (process.env.NODE_ENV !== 'production') {
          (async () => {
            try {
              const res = await fetch(`/api/dev/gps-mapping-health?profileId=${profileId}&reportId=${reportId}`, { cache: 'no-store' });
              const json = await res.json();
              // также логнем в консоль, чтобы видеть на сервере/клиенте
              console.debug('[mapping/health]', json);
            } catch (e) {
              console.warn('[mapping/health] failed', e);
            }
          })();
        }

        // 1) Загружаем данные отчёта или файла
        let rows: any[], headers: string[];
        
        if (rawRows.length === 0) {
          
          const hasFile = !!(report?.file);
          console.log('[mapping] Loading data:', { 
            hasReportId: !!reportId, 
            hasFile,
            reportId,
            fileName: report?.fileName
          });
          
          if (reportId) {
            // Если есть reportId, загружаем данные отчета
            const data = await fetchReportData(reportId);
            rows = data.rows;
            headers = data.headers;
          } else if (hasFile) {
            // Если есть файл, обрабатываем его
            const data = await processFile(report!.file);
            rows = data.rows;
            headers = data.headers;
          } else {
            console.error('[mapping] No report ID or file provided');
            throw new Error('No report ID or file provided');
          }
          
          console.log('[mapping] Loaded data:', { 
            rowsCount: rows.length, 
            headersCount: headers.length,
            headers: headers
          });
          
          if (abort) return;
          setRawRows(rows);
          setAllColumns(headers);
          setDataLoaded(true);
        } else {
          // Используем существующие данные
          rows = rawRows;
          headers = allColumns;
        }

        // 2) Заголовки файла - используем свежие данные
        // rows и headers уже определены выше в блоке загрузки данных

        // 3) Маппинг из профиля
        
        const mapping = profileId ? await fetchNameMappingFromProfile(profileId) : null;
        console.log('[mapping] Profile mapping result:', { 
          hasMapping: !!mapping, 
          sourceColumn: mapping?.sourceColumn,
          isVisible: mapping?.isVisible
        });
        if (abort) return;

        // 4) Проверка наличия маппинга
        if (!mapping || !mapping.sourceColumn) {
          console.error('[mapping] No athlete_name mapping found in profile');
          setLoadError('В выбранном GPS профиле не найден маппинг канон. метрики "Имя игрока" (athlete_name).');
          setNameColumn(null);
          return;
        }

        // 5) Разрешаем колонку
        console.log('[mapping] Resolving name column:', { 
          mappingSourceColumn: mapping.sourceColumn,
          availableHeaders: headers,
          headersCount: headers.length
        });
        const resolved = resolveNameColumnFromMapping(mapping, headers);
        
        if (!resolved) {
          console.error('[mapping] Could not resolve name column');
          setLoadError('Колонка для имён указана в профиле, но такой колонки нет в загруженном файле.');
          setNameColumn(null);
          return;
        }

        setNameColumn(resolved);

        // 6) Извлекаем имена
        const names = rows
          .map(r => (r?.[resolved] ?? ''))
          .map(String)
          .map(s => s.trim())
          .filter(Boolean);

        if (!names.length) {
          setLoadError('Колонка для имён из профиля указана, но содержит пустые значения.');
          if (DIAG) console.log('DIAG: Empty names column', { profileId, mapping, headers, resolvedColumn: resolved, sample: [] });
          return;
        }

        // 7) Строим сопоставления
        await buildMatchesFromNames(names);

        // 8) Диагностика
      } catch (e: any) {
        setLoadError(e?.message || 'Не удалось подготовить данные для маппинга.');
      }
    }

    if (!runExecuted) {
      if (reportId && profileId) {
        
        run();
        setRunExecuted(true);
      } else if (profileId) {
        
        run();
        setRunExecuted(true);
      } else {
        console.log('[mapping] Not running - missing required data:', {
          hasReportId: !!reportId,
          hasProfileId: !!profileId,
          hasFile: false
        });
      }
    } else {
      
    }
    return () => { abort = true; };
  }, [reportId, profileId]); // Убираем rawRows.length и allColumns.length


  // Группировка матчей
  const similarityGroups = useMemo(() => groupMatches(matches), [matches]);

  // Изменение сопоставления игрока с защитой от дублирования
  const handlePlayerChange = (rowIndex: number, newPlayerId: string | null) => {
    setMatches(prev => {
      // Сначала освобождаем текущего игрока (если есть)
      const currentMatch = prev.find(m => m.rowIndex === rowIndex);
      const freedPlayerId = currentMatch?.teamPlayerId;
      
      // Собираем всех используемых игроков (исключая текущий матч)
      const usedPlayerIds = new Set(
        prev
          .filter(m => m.rowIndex !== rowIndex && m.teamPlayerId)
          .map(m => m.teamPlayerId!)
      );
      
      return prev.map(match => {
        if (match.rowIndex === rowIndex) {
          // Если пытаемся назначить игрока, который уже используется - сбрасываем
          if (newPlayerId && usedPlayerIds.has(newPlayerId)) {
            return {
              ...match,
              teamPlayerId: null,
              teamPlayer: null,
              similarity: 0,
              isManual: true
            };
          }
          
          const teamPlayer = newPlayerId ? teamPlayers.find(p => p.id === newPlayerId) : null;
          const similarity = teamPlayer ? nameSimilarity(match.filePlayer, (teamPlayer as any).displayName || (teamPlayer as any).fullName || teamPlayer.name) : 0;
          
          return {
            ...match,
            teamPlayerId: newPlayerId,
            teamPlayer: teamPlayer,
            similarity,
            isManual: true
          };
        }
        return match;
      });
    });
  };

  // Создаем стабильную ссылку на функцию сохранения
  const handleSaveRef = useRef<(() => void) | null>(null);

  // Сохранение отчета с файлом и маппингом
  const handleSave = useCallback(async () => {
    console.log('[mapping] handleSave called', { 
      saving, 
      stack: new Error().stack 
    });
    
    if (saving) {
      
      return;
    }
    
    setSaving(true);
    try {
      // Сначала создаем отчет с файлом
      if (!report) {
        throw new Error('Report is required for saving');
      }
      
      const meta = {
        eventId: report.eventId,
        teamId: report.teamId,
        gpsSystem: report.gpsSystem,
        profileId: report.profileId,
        fileName: report.fileName,
        eventType: report.eventType.toUpperCase() as 'TRAINING' | 'MATCH',
        playerMappings: matches.map(match => ({
          rowIndex: match.rowIndex,
          playerId: match.teamPlayerId,
          similarity: match.similarity,
          isManual: match.isManual
        }))
      };

      console.debug('💾 Creating GPS report with file and mappings:', { 
        fileName: report.fileName,
        mappingCount: matches.length 
      });

      // Создаем FormData для отправки файла
      const formData = new FormData();
      // Файл не доступен в report, пропускаем его
      formData.append('meta', JSON.stringify(meta));

      const response = await fetch('/api/gps/reports', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create GPS report');
      }

      const result = await response.json();
      console.debug('✅ GPS report created with mappings:', result);

      toast({
        title: 'Успех',
        description: `GPS отчет создан с сопоставлением игроков (${matches.length} записей)`
      });

      onComplete(matches.length);
    } catch (error) {
      console.error('Error creating GPS report:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать GPS отчет',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [saving, report, matches, onComplete, toast]);

  // Обновляем ссылку на функцию сохранения
  handleSaveRef.current = handleSave;

  // Передаем функцию handleSave родительскому компоненту только один раз после загрузки данных
  useEffect(() => {
    console.log('[mapping] useEffect for saveHandler:', { 
      onSaveHandlerReady: !!onSaveHandlerReady, 
      saveHandlerRegistered, 
      dataLoaded 
    });
    
    if (onSaveHandlerReady && !saveHandlerRegistered && dataLoaded && handleSaveRef.current) {
      
      // Создаем функцию, которая будет вызывать handleSave только при нажатии кнопки
      const saveHandler = () => {
        
        if (handleSaveRef.current) {
          handleSaveRef.current();
        }
      };
      
      // Регистрируем функцию, но не вызываем её сразу
      onSaveHandlerReady(saveHandler);
      setSaveHandlerRegistered(true);
    }
  }, [onSaveHandlerReady, saveHandlerRegistered, dataLoaded]); // Передаем только после загрузки данных

  // Стили для бейджей сходства
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (similarity >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (similarity >= 50) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500/20 text-green-400';
    if (similarity >= 60) return 'bg-yellow-500/20 text-yellow-400';
    if (similarity >= 50) return 'bg-orange-500/20 text-orange-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  // Проверка дублирования игрока
  const isPlayerDuplicated = (match: any) => {
    if (!match.teamPlayerId) return false;
    return matches.filter(m => m.teamPlayerId === match.teamPlayerId).length > 1;
  };

  // Обработчик открытия старого маппинга
  const handleOpenLegacyMapping = () => {
    window.dispatchEvent(new CustomEvent('gps:openLegacyMapping'));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto mb-4"></div>
          <p className="text-vista-light/60">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // Показываем ошибки загрузки
  if (!nameColumn || loadError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Не найдена колонка с именами игроков</AlertTitle>
          <AlertDescription>
            {loadError ?? 'Добавьте в профиль метрику «Имя игрока» (athlete_name) и привяжите колонку файла.'}
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.dispatchEvent(new CustomEvent('gps:openLegacyMapping'))}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Открыть старый маппинг
            </Button>
          </div>
        </Alert>

        {/* Блок ручного выбора колонки (только если включена эвристика) */}
        {ALLOW_NAME_HEURISTIC && allColumns.length > 0 && (
          <div className="space-y-4 p-4 bg-vista-secondary/10 border border-vista-secondary/20 rounded-lg">
            <div className="space-y-3">
              <label className="text-sm font-medium text-vista-light">
                Выберите колонку с именами игроков
              </label>
              
              <Select
                value={manualNameColumn}
                onValueChange={setManualNameColumn}
              >
                <SelectTrigger className="w-full bg-vista-secondary/20 border-vista-secondary/30">
                  <SelectValue placeholder="Выберите колонку..." />
                </SelectTrigger>
                <SelectContent>
                  {allColumns.map((column) => {
                    // Находим первый непустой value для превью
                    const previewValue = rawRows
                      .map(row => String(row[column] ?? '').trim())
                      .find(value => value.length > 0) || '';
                    
                    const displayValue = previewValue.length > 40 
                      ? previewValue.substring(0, 40) + '...' 
                      : previewValue;
                    
                    return (
                      <SelectItem key={column} value={column}>
                        <div className="flex flex-col">
                          <span className="font-medium">{column}</span>
                          {displayValue && (
                            <span className="text-xs text-vista-light/60">
                              {displayValue}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberInProfile"
                  checked={rememberInProfile}
                  onChange={(e) => setRememberInProfile(e.target.checked)}
                  className="rounded border-vista-secondary/30"
                />
                <label htmlFor="rememberInProfile" className="text-sm text-vista-light/80">
                  Запомнить в профиле
                </label>
                <div className="text-xs text-vista-light/60" title="Если профиль заморожен — сохранение может не пройти">
                  ⓘ
                </div>
              </div>

              <Button
                onClick={() => {/* TODO: implement manual column selection */}}
                disabled={!manualNameColumn}
                className="w-full bg-vista-primary hover:bg-vista-primary/90 text-white"
              >
                Продолжить
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>

      </div>
    );
  }

  if (filePlayers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-vista-light/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-vista-light mb-2">
            В файле не найдено имён игроков
          </h3>
          <p className="text-vista-light/60">
            Проверьте, что в файле есть колонка с именами игроков
          </p>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Информационные сообщения */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Users className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Сопоставление игроков</p>
            <p className="text-blue-300/80">
              Строки с пунктом «Без привязки» не попадут в отчёты.
            </p>
            <p className="text-blue-300/80">
              Сопоставление можно исправить позже в деталях отчёта.
            </p>
          </div>
        </div>
      </div>

      {/* Группы сопоставлений */}
      <div className="space-y-4">
        {similarityGroups.map((group) => (
          <div key={group.level} className="space-y-3">
            <h3 className="text-sm font-medium text-vista-light/80 flex items-center">
              {group.label} ({group.items.length})
            </h3>
            
            <div className="space-y-2">
              {group.items.map((match) => (
                <Card key={`${match.filePlayer}-${match.rowIndex}`} className={`${
                  group.level === 'none' ? 'opacity-50' : ''
                } ${
                  match.teamPlayerId ? getSimilarityColor(match.similarity) : 'bg-gray-500/10 border-gray-500/30'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-vista-light">
                          {match.filePlayer}
                        </div>
                        <div className="text-sm text-vista-light/60">
                          Строка {match.rowIndex + 1}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {match.similarity > 0 && (
                          <Badge className={getSimilarityBadge(match.similarity)}>
                            {match.similarity}%
                          </Badge>
                        )}
                        
                        {isPlayerDuplicated(match) && (
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                            Дублирование!
                          </Badge>
                        )}
                        
                        {match.isManual && (
                          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Выбрано вручную
                          </Badge>
                        )}
                        
                        <Select
                          value={match.teamPlayerId || 'none'}
                          onValueChange={(value) => handlePlayerChange(match.rowIndex, value === 'none' ? null : value)}
                        >
                          <SelectTrigger className="w-48 bg-vista-secondary/20 border-vista-secondary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без привязки</SelectItem>
                            {teamPlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {(player as any).displayName || (player as any).fullName || player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}