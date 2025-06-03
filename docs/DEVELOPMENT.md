# Руководство для разработчиков UTeam

## Настройка окружения

### Требования
- Node.js (версия 18.x или выше)
- npm или yarn
- PostgreSQL (версия 14 или выше)
- Git

### Установка и настройка

1. **Клонировать репозиторий**
   ```bash
   git clone [url-репозитория]
   cd uteam-multi
   ```

2. **Установить зависимости**
   ```bash
   npm install
   # или
   yarn install
   ```

3. **Настроить переменные окружения**
   Создайте файл `.env` в корне проекта на основе `.env.example`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/uteam?schema=public"
   NEXTAUTH_SECRET="ваш-секретный-ключ"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Создать базу данных**
   ```bash
   # Создать базу в PostgreSQL
   createdb uteam

   # Генерация клиента Prisma
   npx prisma generate

   # Миграция схемы базы данных
   npx prisma migrate dev
   ```

5. **Запустить приложение в режиме разработки**
   ```bash
   npm run dev
   # или
   yarn dev
   ```

## Локальное тестирование мультитенантности

### Настройка локальных поддоменов

Для тестирования мультитенантности на локальной машине необходимо настроить локальные поддомены:

1. **Отредактировать файл hosts**

   На macOS/Linux:
   ```bash
   sudo nano /etc/hosts
   ```

   На Windows:
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```

   Добавьте следующие строки:
   ```
   127.0.0.1   localhost
   127.0.0.1   uteam.localhost
   127.0.0.1   club1.uteam.localhost
   127.0.0.1   club2.uteam.localhost
   # и другие поддомены для тестирования
   ```

2. **Доступ к приложению**

   После запуска приложения вы можете получить доступ к нему через:
   - Основной домен: `http://uteam.localhost:3000`
   - Поддомены клубов: `http://club1.uteam.localhost:3000`

### Создание тестовых данных

Для тестирования приложения с несколькими тенантами:

1. **Создание супер-администратора**
   Откройте `http://uteam.localhost:3000/create-admin` и заполните форму создания администратора.

2. **Создание тестовых клубов**
   Войдите в систему как супер-администратор, перейдите в раздел администрирования и создайте несколько клубов.

3. **Создание пользователей для каждого клуба**
   В административной панели создайте пользователей с разными ролями для каждого клуба.

## Работа с мультитенантностью

### Основные принципы

При разработке новых функций необходимо учитывать мультитенантную архитектуру:

1. **Изоляция данных**
   - Всегда включайте `clubId` в запросы к базе данных для фильтрации
   - Никогда не возвращайте данные других клубов

2. **Контекст клуба**
   - Используйте хук `useClub()` для доступа к информации о текущем клубе
   - Пример:
     ```tsx
     import { useClub } from '@/providers/club-provider';
     
     function MyComponent() {
       const { club } = useClub();
       return <h1>{club?.name}</h1>;
     }
     ```

3. **Проверка прав**
   - Всегда проверяйте принадлежность пользователя к клубу при обработке запросов
   - Проверяйте роль пользователя перед выполнением административных действий

### Создание новых API-маршрутов

При создании новых API-маршрутов следуйте этому шаблону:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  // 1. Получить сессию пользователя
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Получить clubId из сессии
  const clubId = session.user.clubId;

  try {
    // 3. Извлечь данные только для этого клуба
    const data = await prisma.someEntity.findMany({
      where: { clubId },
      // ...другие параметры запроса
    });

    // 4. Вернуть данные
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### Тестирование мультитенантности

При тестировании новых функций:

1. Проверяйте работу функций на разных поддоменах
2. Убедитесь, что пользователи видят только данные своего клуба
3. Проверяйте корректное разграничение прав доступа между ролями

## Структура нового компонента

При создании новых компонентов или страниц:

1. **Страница с клиентскими компонентами**:
   ```tsx
   'use client';
   
   import { useSession } from 'next-auth/react';
   import { useClub } from '@/providers/club-provider';
   
   export default function MyPage() {
     const { data: session } = useSession();
     const { club } = useClub();
     
     // Логика компонента
     
     return (
       <div>
         {/* UI компонента */}
       </div>
     );
   }
   ```

2. **Страница с серверными компонентами**:
   ```tsx
   import { getServerSession } from 'next-auth';
   import { authOptions } from '@/app/api/auth/[...nextauth]/route';
   import { prisma } from '@/lib/prisma';
   
   export default async function MyServerPage() {
     const session = await getServerSession(authOptions);
     const clubId = session?.user?.clubId;
     
     // Получение данных на сервере
     const data = await prisma.someEntity.findMany({
       where: { clubId },
       // ...другие параметры запроса
     });
     
     return (
       <div>
         {/* UI с данными */}
       </div>
     );
   }
   ```

## Создание миграций базы данных

При внесении изменений в схему базы данных:

1. Измените файл `prisma/schema.prisma`
2. Создайте и примените миграцию:
   ```bash
   npx prisma migrate dev --name название_миграции
   ```
3. Обновите сгенерированные типы:
   ```bash
   npx prisma generate
   ```

## Советы по производительности

1. **Оптимизация запросов**
   - Используйте `select` для выбора только нужных полей
   - Используйте `include` для загрузки связанных данных
   - Избегайте N+1 запросов

2. **Кэширование**
   - Используйте Next.js API для кэширования запросов
   - Рассмотрите возможность использования SWR или React Query для клиентского кэширования

3. **Оптимизация интерфейса**
   - Используйте отложенную загрузку компонентов (React.lazy)
   - Минимизируйте повторную отрисовку компонентов

## Работа с Drizzle ORM

- Для миграций используйте drizzle-kit:
```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```
- Схемы находятся в /src/db/schema
- Для работы с БД используйте Drizzle ORM API 