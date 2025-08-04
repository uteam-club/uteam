import { db } from '../src/lib/db.esm.ts';
import { permission } from '../src/db/schema/permission.ts';
import { rolePermission } from '../src/db/schema/rolePermission.ts';
import { roleEnum } from '../src/db/schema/user.ts';

// Новый минимальный список прав по разделам
const permissions = [
  { code: 'teams.read', description: 'Команды (просмотр)' },
  { code: 'teams.create', description: 'Команды (создание)' },
  { code: 'teams.update', description: 'Команды (редактирование)' },
  { code: 'teams.delete', description: 'Команды (удаление)' },
  { code: 'teams.players.create', description: 'Игроки команд (создание)' },
  { code: 'teams.players.update', description: 'Игроки команд (редактирование)' },
  { code: 'teams.players.delete', description: 'Игроки команд (удаление)' },
  { code: 'teams.players.uploadImage', description: 'Игроки команд (загрузка фото)' },
  { code: 'teams.coaches.create', description: 'Тренеры команд (создание)' },
  { code: 'teams.coaches.update', description: 'Тренеры команд (редактирование)' },
  { code: 'teams.coaches.delete', description: 'Тренеры команд (удаление)' },
  { code: 'exercises.read', description: 'Упражнения (просмотр)' },
  { code: 'exercises.create', description: 'Упражнения (создание)' },
  { code: 'exercises.update', description: 'Упражнения (редактирование)' },
  { code: 'exercises.delete', description: 'Упражнения (удаление)' },
  { code: 'trainings.read', description: 'Тренировки (просмотр)' },
  { code: 'trainings.create', description: 'Тренировки (создание)' },
  { code: 'trainings.update', description: 'Тренировки (редактирование)' },
  { code: 'trainings.delete', description: 'Тренировки (удаление)' },
  { code: 'trainings.attendance', description: 'Тренировки (посещаемость)' },
  { code: 'matches.read', description: 'Матчи (просмотр)' },
  { code: 'matches.create', description: 'Матчи (создание)' },
  { code: 'matches.update', description: 'Матчи (редактирование)' },
  { code: 'matches.delete', description: 'Матчи (удаление)' },
  { code: 'matches.players.update', description: 'Матчи (игроки - редактирование)' },
  { code: 'matches.players.delete', description: 'Матчи (игроки - удаление)' },
  { code: 'attendance.read', description: 'Посещаемость (просмотр)' },
  { code: 'attendance.update', description: 'Посещаемость (редактирование)' },
  { code: 'fitnessTests.read', description: 'Фитнес тесты (просмотр)' },
  { code: 'fitnessTests.create', description: 'Фитнес тесты (создание)' },
  { code: 'fitnessTests.update', description: 'Фитнес тесты (редактирование)' },
  { code: 'fitnessTests.delete', description: 'Фитнес тесты (удаление)' },
  { code: 'gpsReports.read', description: 'GPS отчеты (просмотр)' },
  { code: 'gpsReports.create', description: 'GPS отчеты (создание)' },
  { code: 'gpsReports.update', description: 'GPS отчеты (редактирование)' },
  { code: 'gpsReports.delete', description: 'GPS отчеты (удаление)' },
  { code: 'gpsProfiles.read', description: 'GPS профили (просмотр)' },
  { code: 'gpsProfiles.create', description: 'GPS профили (создание)' },
  { code: 'gpsProfiles.update', description: 'GPS профили (редактирование)' },
  { code: 'gpsProfiles.delete', description: 'GPS профили (удаление)' },
  { code: 'calendar.read', description: 'Календарь (просмотр)' },
  { code: 'calendar.update', description: 'Календарь (редактирование)' },
  { code: 'morningSurvey.read', description: 'Утренний опрос (просмотр)' },
  { code: 'morningSurvey.update', description: 'Утренний опрос (редактирование)' },
  { code: 'rpeSurvey.read', description: 'Оценка RPE (просмотр)' },
  { code: 'rpeSurvey.update', description: 'Оценка RPE (редактирование)' },
  { code: 'surveys.read', description: 'Опросы (просмотр)' },
  { code: 'surveys.create', description: 'Опросы (создание)' },
  { code: 'trainingCategories.read', description: 'Категории тренировок (просмотр)' },
  { code: 'trainingCategories.create', description: 'Категории тренировок (создание)' },
  { code: 'trainingCategories.update', description: 'Категории тренировок (редактирование)' },
  { code: 'trainingCategories.delete', description: 'Категории тренировок (удаление)' },
  { code: 'exerciseCategories.read', description: 'Категории упражнений (просмотр)' },
  { code: 'exerciseCategories.create', description: 'Категории упражнений (создание)' },
  { code: 'exerciseCategories.update', description: 'Категории упражнений (редактирование)' },
  { code: 'exerciseCategories.delete', description: 'Категории упражнений (удаление)' },
  { code: 'exerciseTags.read', description: 'Теги упражнений (просмотр)' },
  { code: 'exerciseTags.create', description: 'Теги упражнений (создание)' },
  { code: 'exerciseTags.update', description: 'Теги упражнений (редактирование)' },
  { code: 'exerciseTags.delete', description: 'Теги упражнений (удаление)' },
  { code: 'users.read', description: 'Пользователи (просмотр)' },
  { code: 'users.create', description: 'Пользователи (создание)' },
  { code: 'files.read', description: 'Файлы (просмотр)' },
  { code: 'muscles.read', description: 'Мышцы (просмотр)' },
  { code: 'painAreas.create', description: 'Области боли (создание)' },
  { code: 'storage.init', description: 'Хранилище (инициализация)' },
  { code: 'test.access', description: 'Тестовый доступ' },
  { code: 'clubs.read', description: 'Клубы (просмотр)' },
  { code: 'clubs.create', description: 'Клубы (создание)' },
  { code: 'clubs.update', description: 'Клубы (редактирование)' },
  { code: 'clubs.delete', description: 'Клубы (удаление)' },
  { code: 'documents.read', description: 'Документы (просмотр)' },
  { code: 'documents.create', description: 'Документы (создание)' },
  { code: 'documents.update', description: 'Документы (редактирование)' },
  { code: 'adminPanel.read', description: 'Админка (просмотр)' },
  { code: 'adminPanel.update', description: 'Админка (редактирование)' },
];

const roles = roleEnum.enumValues;

// Пример назначения прав ролям (можно скорректировать по пожеланиям)
const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions.map(p => p.code),
  ADMIN: permissions.map(p => p.code),
  COACH: [
    'teams.read', 'teams.create', 'teams.update', 'teams.delete',
    'teams.players.create', 'teams.players.update', 'teams.players.delete', 'teams.players.uploadImage',
    'teams.coaches.create', 'teams.coaches.update', 'teams.coaches.delete',
    'exercises.read', 'exercises.create', 'exercises.update', 'exercises.delete',
    'trainings.read', 'trainings.create', 'trainings.update', 'trainings.delete', 'trainings.attendance',
    'matches.read', 'matches.create', 'matches.update', 'matches.delete', 'matches.players.update', 'matches.players.delete',
    'attendance.read', 'attendance.update',
    'fitnessTests.read', 'fitnessTests.create', 'fitnessTests.update', 'fitnessTests.delete',
    'calendar.read', 'calendar.update',
    'morningSurvey.read', 'morningSurvey.update',
    'rpeSurvey.read', 'rpeSurvey.update',
    'surveys.read', 'surveys.create',
    'trainingCategories.read', 'trainingCategories.create', 'trainingCategories.update', 'trainingCategories.delete',
    'exerciseCategories.read', 'exerciseCategories.create', 'exerciseCategories.update', 'exerciseCategories.delete',
    'exerciseTags.read', 'exerciseTags.create', 'exerciseTags.update', 'exerciseTags.delete',
    'users.read', 'users.create',
    'files.read',
    'muscles.read', 'painAreas.create',
    'clubs.read',
    'documents.read', 'documents.create', 'documents.update',
    'gpsProfiles.read', 'gpsProfiles.create', 'gpsProfiles.update', 'gpsProfiles.delete',
    'gpsReports.read', 'gpsReports.create', 'gpsReports.update', 'gpsReports.delete',
  ],
  MEMBER: [
    'teams.read',
    'exercises.read',
    'trainings.read',
    'matches.read',
    'attendance.read',
    'fitnessTests.read',
    'calendar.read',
    'morningSurvey.read',
    'rpeSurvey.read',
    'documents.read',
    'gpsProfiles.read',
    'gpsReports.read',
  ],
  SCOUT: [
    'teams.read',
    'exercises.read',
    'trainings.read',
    'matches.read',
    'attendance.read',
    'fitnessTests.read',
    'calendar.read',
    'documents.read',
  ],
  DOCTOR: [
    'teams.read',
    'trainings.read',
    'attendance.read',
    'documents.read',
  ],
  DIRECTOR: [
    'teams.read',
    'exercises.read',
    'trainings.read',
    'matches.read',
    'attendance.read',
    'fitnessTests.read',
    'calendar.read',
    'documents.read',
    'adminPanel.read',
  ],
};

async function main() {
  // 0. Очистить старые права и связи
  await db.delete(rolePermission).execute();
  await db.delete(permission).execute();

  // 1. Добавить новые права
  for (const perm of permissions) {
    await db
      .insert(permission)
      .values(perm)
      .onConflictDoNothing();
  }

  // 2. Добавить связи ролей и прав
  const allPerms = await db.select().from(permission);

  for (const role of roles) {
    const allowedCodes = rolePermissions[role] || [];
    for (const perm of allPerms) {
      await db
        .insert(rolePermission)
        .values({
          role: role as typeof roleEnum.enumValues[number],
          permissionId: perm.id,
          allowed: allowedCodes.includes(perm.code),
        })
        .onConflictDoNothing();
    }
  }
}

main().then(() => {
  console.log('Permissions seeded');
  process.exit(0);
}); 