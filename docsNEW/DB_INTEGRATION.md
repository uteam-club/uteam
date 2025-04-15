# Интеграция баз данных в VISTA UTEAM

## Общая архитектура

В проекте VISTA UTEAM используется двухуровневый подход к работе с базой данных:

1. **Prisma ORM** - для типобезопасного взаимодействия с базой данных, миграций и генерации клиента с типами
2. **Supabase** - как фактическая база данных и ряд дополнительных функций (аутентификация, realtime и т.д.)

## Подключение к базе данных

### Prisma

Подключение Prisma настроено через файл `src/lib/prisma.ts` с использованием паттерна синглтона:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Этот паттерн предотвращает создание множества экземпляров PrismaClient при разработке с горячей перезагрузкой в Next.js.

### Supabase

Подключение к Supabase настроено через файл `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Сервисный клиент для административных функций
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

## Переменные окружения

Для правильной работы с базами данных необходимы следующие переменные окружения:

```
# Prisma PostgreSQL
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
DIRECT_URL="postgresql://username:password@host:port/database?schema=public"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### Настройка переменных окружения

1. Скопируйте файл `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Отредактируйте файл `.env`, указав реальные значения для вашей среды:
   ```bash
   nano .env
   ```

3. Для Supabase:
   - `SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_URL`: URL вашего проекта Supabase (например, https://abcdefghijklm.supabase.co)
   - `SUPABASE_KEY` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key из настроек API в панели Supabase
   - `SUPABASE_SERVICE_KEY`: service_role key из настроек API в панели Supabase

4. Для Prisma (PostgreSQL):
   - `DATABASE_URL` и `DIRECT_URL`: строка подключения к вашей PostgreSQL базе данных

## Стратегия использования

### Когда использовать Prisma

- Для сложных запросов с глубокой выборкой связанных данных
- Для работы с транзакциями
- Для типобезопасных запросов
- Для миграций и изменения схемы базы данных

### Когда использовать Supabase

- Для простых запросов на чтение/запись
- Для работы с файлами и хранилищем
- Для аутентификации и авторизации
- Для realtime подписок

## Миграции и обновление схемы

### Обновление схемы

1. Внесите изменения в файл `prisma/schema.prisma`
2. Сгенерируйте миграцию:
   ```bash
   npm run prisma:migrate
   ```
3. Примените миграцию:
   ```bash
   npx prisma migrate deploy
   ```

### Генерация клиента

После изменения схемы необходимо регенерировать Prisma клиент:

```bash
npm run prisma:generate
```

## Проверка соединения

Для проверки соединения с базами данных используйте скрипт:

```bash
npm run db:check
```

Этот скрипт проверяет:
- Подключение к Prisma
- Подключение к Supabase
- Наличие необходимых переменных окружения

### Интерпретация результатов проверки

Скрипт выводит подробную информацию о состоянии подключений:

1. **Проверка переменных окружения**:
   - ✅ Все переменные присутствуют
   - ❌ Отсутствуют необходимые переменные

2. **Проверка подключения Prisma**:
   - ✅ Подключение успешно
   - ❌ Ошибка подключения (с деталями)

3. **Проверка подключения Supabase**:
   - ✅ Подключение успешно
   - ❌ Ошибка подключения (с деталями)

## Архитектура данных

Основные моменты новой архитектуры данных:

1. **Единый контекст клуба**: Все данные принадлежат клубу Vista без необходимости фильтрации.
2. **Работа с командами**: Внутри клуба поддерживается деление на команды.
3. **Управление пользователями**: Пользователи имеют роли и могут быть частью различных команд.

### Пример работы с данными пользователей

```typescript
// Получение всех пользователей
async function getAllUsers() {
  return await prisma.user.findMany({
    include: {
      teams: true,
      profile: true
    }
  });
}

// Получение пользователей команды
async function getUsersByTeam(teamId: string) {
  return await prisma.user.findMany({
    where: {
      teams: {
        some: {
          id: teamId
        }
      }
    },
    include: {
      profile: true
    }
  });
}

// Создание нового пользователя
async function createUser(userData: UserCreateInput) {
  return await prisma.user.create({
    data: userData
  });
}
```

## Лучшие практики

1. **Используйте подход "сначала Prisma"**: Определяйте модели в Prisma и затем создавайте таблицы через миграции.

2. **Безопасное хранение секретов**: Никогда не коммитьте переменные окружения с секретами в репозиторий.

3. **Транзакции для атомарных операций**: Используйте транзакции Prisma при операциях, затрагивающих несколько таблиц.

4. **Инкапсуляция доступа к данным**: Создавайте специализированные функции для общих операций с базой данных.

5. **Кэширование для часто используемых данных**: Используйте кэширование для данных, которые редко меняются.

## Устранение неполадок

### Проблемы с подключением к Prisma

1. Проверьте правильность строки DATABASE_URL и DIRECT_URL
2. Убедитесь, что база данных доступна и запущена
3. Проверьте, что ваш IP имеет доступ к базе данных

### Проблемы с подключением к Supabase

1. Проверьте правильность SUPABASE_URL и SUPABASE_KEY
2. Убедитесь, что проект Supabase активен
3. Проверьте права доступа для используемых ключей

### Общие проблемы

1. **Ошибка "Table does not exist"**: Убедитесь, что миграции Prisma были применены
2. **Несоответствие типов**: Регенерируйте Prisma клиент после изменения схемы 