# MAPPING_WIZARD_DEEP_AUDIT.md

## 0. Контекст и версии

**Git**: `/Users/artem/Desktop/uteam-multi`, ветка `purge/gps-hard-delete`
**Node.js**: v18.20.8
**Next.js**: 14.2.2
**TypeScript**: ^5.8.3

**Ключевые зависимости парсинга**:
- `papaparse`: ^5.5.3 (CSV)
- `xlsx`: ^0.18.5 (Excel)

## A. Почему «маппинг» выпадает из визарда

**Декларация шагов** (строка 89):
```typescript
const [step, setStep] = useState<'team' | 'eventType' | 'event' | 'profile' | 'file' | 'mapping'>('team');
```

**Степпер** (строки 474-494):
```typescript
{['team', 'eventType', 'event', 'profile', 'file', 'mapping'].map((stepName, index) => (
  <div key={stepName} className="flex items-center">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
      step === stepName 
        ? 'bg-vista-primary text-white' 
        : ['team', 'eventType', 'event', 'profile', 'file', 'mapping'].indexOf(step) > index
        ? 'bg-vista-primary/20 text-vista-primary'
        : 'bg-vista-secondary/20 text-vista-light/40'
    }`}>
      {index + 1}
    </div>
    // ...
  </div>
))}
```

**Переходы** (строки 250-276):
```typescript
const handleNext = () => {
  if (step === 'team' && selectedTeam) {
    setStep('eventType');
  } else if (step === 'eventType' && eventType) {
    setStep('event');
  } else if (step === 'event' && selectedEvent) {
    setStep('profile');
  } else if (step === 'profile' && selectedProfile) {
    setStep('file');
  } else if (step === 'file' && selectedFile) {
    handleUpload();
  }
};

const handleBack = () => {
  if (step === 'eventType') {
    setStep('team');
  } else if (step === 'event') {
    setStep('eventType');
  } else if (step === 'profile') {
    setStep('event');
  } else if (step === 'file') {
    setStep('profile');
  } else if (step === 'mapping') {
    setStep('file');
  }
};
```

**Триггер перехода к маппингу** (строка 297):
```typescript
setStep('mapping');
```

**Автоматическое открытие внешней модалки** (строки 129-133):
```typescript
// Автоматически показываем модальное окно маппинга на этапе mapping
useEffect(() => {
  if (step === 'mapping' && uploadedReport) {
    setShowMappingModal(true);
  }
}, [step, uploadedReport]);
```

**Рендер внешней модалки** (строки 758-766):
```typescript
{showMappingModal && uploadedReport && (
  <SmartPlayerMappingModal
    open={showMappingModal}
    onOpenChange={setShowMappingModal}
    gpsReport={uploadedReport}
    teamId={selectedTeam?.id || ''}
    onMappingComplete={handleMappingCompleted}
  />
)}
```

**Закрытие визарда** (строки 337-341):
```typescript
const handleMappingCompleted = () => {
  setShowMappingModal(false);
  handleClose();
  onReportUploaded();
};
```

**Вывод**: Шаг «mapping» визуально «выпрыгивает» из визарда, потому что:
1. При `step === 'mapping'` автоматически открывается `SmartPlayerMappingModal` поверх визарда
2. Внешняя модалка рендерится в отдельном `Dialog` компоненте
3. После завершения маппинга весь визард закрывается через `handleMappingCompleted`

## B. Как/где извлекаются игроки, и когда получается 0

**API /process-file ответ** (строки 91-95):
```typescript
return NextResponse.json({
  rawData,
  rowCount: rawData.length,
  columns: rawData.length > 0 ? Object.keys(rawData[0]) : [],
});
```

**Извлечение имен игроков** (строки 247-269):
```typescript
const extractPlayerNamesFromFile = async (rawData: any, profile: GpsProfile): Promise<string[]> => {
  console.log('🔍 Extracting names from raw data:', rawData);
  console.log('📋 Using profile:', profile);
  
  if (!rawData || !Array.isArray(rawData)) {
    console.warn('⚠️ Raw data is not an array:', rawData);
    return [];
  }

  // Находим колонку с именами игроков по канонической метрике "athlete_name"
  const nameColumn = await findNameColumn(rawData, profile);
  console.log('📝 Found name column:', nameColumn);
  
  if (!nameColumn) {
    console.warn('⚠️ No name column found');
    return [];
  }

  const names = rawData.map((row: any) => row[nameColumn] || '').filter((name: string) => name.trim());
  console.log('👤 Extracted names:', names);
  
  return names;
};
```

**Поиск колонки имени** (строки 272-318):
```typescript
const findNameColumn = async (rawData: any, profile: GpsProfile): Promise<string | null> => {
  console.log('🔍 Finding name column for profile:', profile.id);
  
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return null;
  }

  try {
    // Получаем маппинги колонок для профиля
    console.log('📡 Fetching column mappings...');
    const response = await fetch(`/api/gps/profiles/${profile.id}/mappings`);
    if (response.ok) {
      const mappings = await response.json();
      console.log('📋 Column mappings:', mappings);
      
      const nameMapping = mappings.find((mapping: any) => 
        mapping.canonicalMetric === 'athlete_name'
      );
      
      if (nameMapping) {
        console.log('✅ Found name mapping:', nameMapping);
        return nameMapping.sourceColumn;
      } else {
        console.warn('⚠️ No athlete_name mapping found in profile');
      }
    } else {
      console.warn('⚠️ Failed to fetch column mappings:', response.status);
    }
  } catch (error) {
    console.error('❌ Error fetching column mappings:', error);
  }
  
  // Fallback: используем эвристику - ищем колонки с "name", "player", "athlete"
  console.log('🔄 Using fallback heuristic...');
  const sampleRow = rawData[0];
  console.log('📊 Sample row keys:', Object.keys(sampleRow));
  
  const possibleColumns = Object.keys(sampleRow).filter(key => 
    key.toLowerCase().includes('name') || 
    key.toLowerCase().includes('player') || 
    key.toLowerCase().includes('athlete')
  );

  console.log('🎯 Possible name columns:', possibleColumns);
  return possibleColumns.length > 0 ? possibleColumns[0] : null;
};
```

**Нормализация строк** (строки 62-70):
```typescript
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[й]/g, 'и')
    .replace(/[ъь]/g, '')
    .replace(/[^а-яa-z0-9\s]/g, '')
    .trim();
}
```

**Алгоритм сходства** (строки 73-85):
```typescript
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 100;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  if (maxLength === 0) return 0;
  
  return Math.max(0, Math.round((1 - distance / maxLength) * 100));
}
```

**Пороговые значения** (строки 323-327, 331-337):
```typescript
const groups: SimilarityGroup[] = [
  { level: 'high', label: 'Высокое сходство (80-100%)', players: [] },
  { level: 'medium', label: 'Среднее сходство (60-79%)', players: [] },
  { level: 'low', label: 'Низкое сходство (50-59%)', players: [] },
  { level: 'none', label: 'Нет похожих', players: [] }
];

playerMatches.forEach(match => {
  if (match.teamPlayer) {
    if (match.similarity >= 80) groups[0].players.push(match);
    else if (match.similarity >= 60) groups[1].players.push(match);
    else if (match.similarity >= 50) groups[2].players.push(match);
    else groups[3].players.push(match);
  } else {
    groups[3].players.push(match);
  }
});
```

**Загрузка игроков команды** (строки 182-184):
```typescript
// Загружаем игроков команды
const players = await getPlayersByTeamId(teamId);
console.log('👥 Loaded team players:', players.length);
setTeamPlayers(players);
```

**Причины "Найдено игроков: 0"**:
1. GPS профиль не настроен с колонкой `athlete_name`
2. Колонка в файле называется по-другому (не содержит "name", "player", "athlete")
3. `rawData` пустой или не массив
4. Все строки в колонке имени пустые или содержат только пробелы
5. Ошибка при загрузке маппингов колонок профиля

## C. API/БД/типы — что есть/чего нет

**Схема БД** (строки 3-9):
```typescript
export const gpsPlayerMapping = pgTable('GpsPlayerMapping', {
  id: uuid('id').primaryKey().defaultRandom(),
  gpsReportId: uuid('gpsReportId').notNull(),
  playerId: uuid('playerId').notNull(), // ❌ НЕ nullable
  rowIndex: integer('rowIndex').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});
```

**API POST** (строки 42-49):
```typescript
const { playerId, rowIndex } = body;

if (!playerId || rowIndex === undefined) {
  return NextResponse.json(
    { error: 'Player ID and row index are required' },
    { status: 400 }
  );
}
```

**Типы** (строки 113-119, 121-124):
```typescript
export interface GpsPlayerMapping {
  id: string;
  gpsReportId: string;
  playerId: string; // ❌ НЕ nullable
  rowIndex: number;
  createdAt: Date;
}

export interface CreateGpsPlayerMappingRequest {
  playerId: string; // ❌ НЕ nullable
  rowIndex: number;
}
```

**Guards безопасности** (строки 453, 487, 507):
```typescript
export async function getGpsPlayerMappingsByReportId(reportId: string, clubId: string): Promise<GpsPlayerMapping[]> {
  try {
    await ensureReportOwned(reportId, clubId);
    // ...
  }
}

export async function deleteGpsPlayerMappingsByReportId(reportId: string, clubId: string): Promise<boolean> {
  try {
    await ensureReportOwned(reportId, clubId);
    // ...
  }
}

export async function deleteGpsPlayerMapping(id: string, clubId: string): Promise<boolean> {
  try {
    // ...
    await ensureReportOwned(mapping[0].gpsReportId, clubId);
    // ...
  }
}
```

**Что отсутствует**:
- ❌ `playerId` не nullable (нужно для "Без привязки")
- ❌ Нет поля `isManual: boolean`
- ❌ Нет поля `similarity: number`
- ❌ Нет батч-операций (только по одному маппингу)
- ❌ Нет уникальности `(gpsReportId, rowIndex)`

## D. Канон-ключ athlete_name — подтверждение и зависимости

**Определение метрики** (строки 105-117):
```json
{
  "key": "athlete_name",
  "labels": {
    "ru": "Имя игрока",
    "en": "Athlete Name"
  },
  "description": "Отображаемое имя игрока (ФИО или короткое имя).",
  "unit": "string",
  "dimension": "identity",
  "agg": "none",
  "scaling": "none",
  "category": "identity",
  "isDerived": false
}
```

**Использование в коде**:
- **SmartPlayerMappingModal** (строка 289): `mapping.canonicalMetric === 'athlete_name'`
- **GpsReportVisualization** (строка 68): `columnMapping?.canonicalMetric === 'athlete_name'`

**Критичная зависимость**: Если GPS профиль не настроен с колонкой `athlete_name`, маппинг не работает.

## E. Guards/clubId — подтверждение безопасности

**Все операции с маппингами защищены**:
- `getGpsPlayerMappingsByReportId` (строка 453): `ensureReportOwned(reportId, clubId)`
- `deleteGpsPlayerMappingsByReportId` (строка 487): `ensureReportOwned(reportId, clubId)`
- `deleteGpsPlayerMapping` (строка 507): `ensureReportOwned(mapping[0].gpsReportId, clubId)`

**Безопасно**: Все операции проверяются на владельца клуба через report.

## F. Готовые UI-заготовки для шага 6

**Стили сходства** (строки 416-428):
```typescript
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
```

**Группировка игроков** (строки 321-341):
```typescript
const similarityGroups = useMemo((): SimilarityGroup[] => {
  const groups: SimilarityGroup[] = [
    { level: 'high', label: 'Высокое сходство (80-100%)', players: [] },
    { level: 'medium', label: 'Среднее сходство (60-79%)', players: [] },
    { level: 'low', label: 'Низкое сходство (50-59%)', players: [] },
    { level: 'none', label: 'Нет похожих', players: [] }
  ];
  // ...
  return groups.filter(group => group.players.length > 0);
}, [playerMatches]);
```

**Рендер групп** (строки 481-486):
```typescript
{group.label} ({group.players.length})
```

**Тусклые карточки** (строки 487-491):
```typescript
<Card key={`${match.filePlayer}-${index}`} className={`${
  group.level === 'none' ? 'opacity-50' : ''
} ${
  match.teamPlayer ? getSimilarityColor(match.similarity) : 'bg-gray-500/10 border-gray-500/30'
}`}>
```

**Бейджи** (строки 508-517):
```typescript
<Badge className={getSimilarityBadge(match.similarity)}>
  {match.similarity}%
</Badge>

{match.isManual && (
  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
    Выбрано вручную
  </Badge>
)}
```

## G. Риски и точки возможных регрессов

**Ограничения файлов** (строки 36-40):
```typescript
// Validate file size (max 10MB)
const maxSize = 10 * 1024 * 1024; // 10MB
if (file.size > maxSize) {
  return NextResponse.json(
    { error: 'File too large. Maximum size is 10MB.' },
    { status: 400 }
  );
}
```

**Сброс состояния** (строки 104-110):
```typescript
if (open) {
  setStep('team');
  setSelectedTeam(null);
  setEventType(null);
  setSelectedEvent(null);
  setSelectedProfile(null);
  setSelectedFile(null);
  setUploadedReport(null);
  setShowMappingModal(false);
}
```

**Потенциальные регрессы**:
1. **GpsReportVisualization** (строки 58-61): Ожидает `playerMappings.find(m => m.rowIndex === rowIndex)` - может сломаться с null playerId
2. **GpsReportVisualization** (строки 117-121): Фильтрация по `mappedRowIndexes` - unassigned строки не попадут в визуализацию
3. **API валидация** (строки 44-49): Требует `playerId`, не поддерживает null
4. **Схема БД** (строка 6): `playerId` не nullable
5. **Типы** (строки 116, 122): `playerId: string` не nullable

## H. Чек-лист требований к новой реализации шага 6

### Схема БД
- [ ] Сделать `playerId` nullable
- [ ] Добавить `isManual: boolean DEFAULT FALSE`
- [ ] Добавить `similarity: integer`
- [ ] Добавить уникальность `(gpsReportId, rowIndex)`
- [ ] Создать миграцию

### API
- [ ] Поддержать `playerId: null` в POST
- [ ] Добавить поля `isManual`, `similarity` в body
- [ ] Добавить PATCH для батч-операций
- [ ] Обновить валидацию

### Типы
- [ ] Обновить `GpsPlayerMapping.playerId: string | null`
- [ ] Добавить `isManual: boolean`, `similarity: number`
- [ ] Обновить `CreateGpsPlayerMappingRequest`

### Сервисы
- [ ] Обновить `createGpsPlayerMapping` с новыми полями
- [ ] Добавить `bulkCreateGpsPlayerMappings`
- [ ] Обновить guards для nullable playerId

### UI шага 6
- [ ] Встроить рендер маппинга в `step === 'mapping'`
- [ ] Убрать `SmartPlayerMappingModal` из визарда
- [ ] Перенести логику извлечения игроков в визард
- [ ] Группы: "Высокое/Среднее/Низкое/Не найден/Ручной выбор"
- [ ] Опция "Без привязки" (playerId: null)
- [ ] Тусклые карточки для unassigned
- [ ] Сохранение батчем
- [ ] Поддержка null playerId
- [ ] Сохранение isManual и similarity
- [ ] Возврат/повторная правка
- [ ] Очистка стейта при закрытии
- [ ] Безопасность clubId

### Тестирование
- [ ] Проверить извлечение игроков с `athlete_name`
- [ ] Проверить fallback эвристику
- [ ] Проверить сохранение "Без привязки"
- [ ] Проверить батч-операции
- [ ] Проверить регрессы в GpsReportVisualization
