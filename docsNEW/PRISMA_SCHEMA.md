# Схема Prisma для VISTA UTEAM

В этом документе описана структура схемы Prisma для проекта VISTA UTEAM, которая оптимизирована для работы с единственным клубом.

## Основные принципы

1. **Нет мультитенантности**: Схема оптимизирована для работы только с клубом Vista, без необходимости разделения данных между разными клубами.
2. **Фокус на командах**: Внутри клуба поддерживается деление на команды.
3. **Чёткие связи**: Все сущности имеют чёткие и правильно типизированные отношения.

## Основные модели

### User

Модель пользователя, которая хранит основные данные о пользователе.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  password  String?  // Хеш пароля для локальной аутентификации
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  teams     Team[]   @relation("TeamMembers")
  events    Event[]  @relation("EventParticipants")
  sessions  Session[]
  accounts  Account[]
  
  @@map("users")
}

enum UserRole {
  USER
  MANAGER
  ADMIN
  SUPERADMIN
}
```

### Team

Команда внутри клуба Vista. Пользователи могут принадлежать к нескольким командам.

```prisma
model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     User[]   @relation("TeamMembers")
  events      Event[]
  
  @@map("teams")
}
```

### Profile

Дополнительная информация о пользователе.

```prisma
model Profile {
  id          String   @id @default(cuid())
  bio         String?
  phone       String?
  address     String?
  birthday    DateTime?
  position    String?
  department  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}
```

### Event

События в клубе, такие как встречи, тренировки и т.д.

```prisma
model Event {
  id          String   @id @default(cuid())
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  status      EventStatus @default(PLANNED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  teamId      String?
  team        Team?    @relation(fields: [teamId], references: [id], onDelete: SetNull)
  
  participants User[]  @relation("EventParticipants")
  
  @@map("events")
}

enum EventStatus {
  PLANNED
  ONGOING
  COMPLETED
  CANCELLED
}
```

### Аутентификация (Next Auth)

Модели для работы с NextAuth.js для аутентификации.

```prisma
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?
  access_token       String?
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

## Специализированные модели

### Notification

Оповещения и уведомления для пользователей.

```prisma
model Notification {
  id          String   @id @default(cuid())
  title       String
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notifications")
}
```

### Document

Документы, связанные с клубом или командами.

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  description String?
  fileUrl     String
  fileType    String
  fileSize    Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  teamId      String?
  team        Team?    @relation(fields: [teamId], references: [id], onDelete: SetNull)
  
  @@map("documents")
}
```

## Полная схема

Ниже приведена полная схема Prisma для проекта VISTA UTEAM:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Пользователи и аутентификация
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  password  String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile       Profile?
  teams         Team[]        @relation("TeamMembers")
  events        Event[]       @relation("EventParticipants")
  sessions      Session[]
  accounts      Account[]
  notifications Notification[]
  tasks         Task[]        @relation("AssignedTasks")
  
  @@map("users")
}

enum UserRole {
  USER
  MANAGER
  ADMIN
  SUPERADMIN
}

model Profile {
  id          String    @id @default(cuid())
  bio         String?
  phone       String?
  address     String?
  birthday    DateTime?
  position    String?
  department  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}

// Аутентификация через NextAuth
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?
  access_token       String?
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// Команды и организация
model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  image       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     User[]   @relation("TeamMembers")
  events      Event[]
  documents   Document[]
  tasks       Task[]
  
  @@map("teams")
}

// События и активности
model Event {
  id          String      @id @default(cuid())
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  status      EventStatus @default(PLANNED)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  teamId      String?
  team        Team?       @relation(fields: [teamId], references: [id], onDelete: SetNull)
  
  participants User[]     @relation("EventParticipants")
  
  @@map("events")
}

enum EventStatus {
  PLANNED
  ONGOING
  COMPLETED
  CANCELLED
}

// Задачи
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    TaskPriority @default(MEDIUM)
  status      TaskStatus   @default(TODO)
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  teamId      String?
  team        Team?      @relation(fields: [teamId], references: [id], onDelete: SetNull)
  
  assignees   User[]     @relation("AssignedTasks")
  
  @@map("tasks")
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

// Документы
model Document {
  id          String   @id @default(cuid())
  title       String
  description String?
  fileUrl     String
  fileType    String
  fileSize    Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  teamId      String?
  team        Team?    @relation(fields: [teamId], references: [id], onDelete: SetNull)
  
  @@map("documents")
}

// Уведомления
model Notification {
  id          String   @id @default(cuid())
  title       String
  message     String
  isRead      Boolean  @default(false)
  type        NotificationType @default(INFO)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notifications")
}

enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
}
```

## Ключевые изменения по сравнению с мультитенантной версией

1. **Удаление модели Club**: Клуб теперь неявно определен как Vista, без необходимости отдельной модели.
2. **Удаление полей clubId**: Все поля, связывающие сущности с клубом, больше не нужны.
3. **Упрощение запросов**: Нет необходимости фильтровать данные по клубу.
4. **Удаление моделей, связанных с модульностью**: ClubModule, FeatureModule и подобные модели больше не используются.

## Рекомендации по использованию

### Запросы данных

```typescript
// Получение всех пользователей
const users = await prisma.user.findMany();

// Получение пользователей определенной команды
const teamUsers = await prisma.user.findMany({
  where: {
    teams: {
      some: {
        id: teamId
      }
    }
  }
});

// Создание события для команды
const newEvent = await prisma.event.create({
  data: {
    title: "Тренировка",
    description: "Еженедельная тренировка команды",
    startTime: new Date("2023-10-15T18:00:00Z"),
    endTime: new Date("2023-10-15T20:00:00Z"),
    location: "Спортзал",
    teamId: teamId,
    participants: {
      connect: userIds.map(id => ({ id }))
    }
  }
});
```

### Управление командами

```typescript
// Создание новой команды
const newTeam = await prisma.team.create({
  data: {
    name: "Команда разработки",
    description: "Разработка нового функционала",
    members: {
      connect: [{ id: userId1 }, { id: userId2 }]
    }
  }
});

// Добавление пользователя в команду
const updatedTeam = await prisma.team.update({
  where: { id: teamId },
  data: {
    members: {
      connect: { id: newUserId }
    }
  }
});
```

## Миграция с мультитенантной версии

Для миграции с мультитенантной версии к однопользовательской следуйте этим шагам:

1. Создайте резервную копию базы данных
2. Обновите схему Prisma, удалив мультитенантность
3. Создайте миграцию с сохранением данных:
   ```bash
   npx prisma migrate dev --name remove-multitenancy
   ```
4. Обновите все API и компоненты, которые использовали clubId

Примечание: Этот процесс потребует осторожного подхода и тщательного тестирования, чтобы убедиться, что все данные корректно сохранены и функции работают правильно. 