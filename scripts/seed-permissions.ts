import { db } from '@/lib/db';
import { permission, rolePermission } from '@/db/schema';
import { roleEnum } from '@/db/schema/user';

// Новый полный список permissions (синхронизирован с кодом)
const permissions = [
  { code: 'clubs.read', description: 'Просмотр клубов' },
  { code: 'clubs.create', description: 'Создание клуба' },
  { code: 'clubs.update', description: 'Редактирование клуба' },
  { code: 'clubs.delete', description: 'Удаление клуба' },
  { code: 'trainings.read', description: 'Просмотр тренировок' },
  { code: 'trainings.create', description: 'Создание тренировки' },
  { code: 'trainings.update', description: 'Редактирование тренировки' },
  { code: 'trainings.delete', description: 'Удаление тренировки' },
  { code: 'trainings.attendance', description: 'Отметка посещаемости' },
  { code: 'exercises.read', description: 'Просмотр упражнений' },
  { code: 'exercises.create', description: 'Создание упражнения' },
  { code: 'exercises.update', description: 'Редактирование упражнения' },
  { code: 'exercises.delete', description: 'Удаление упражнения' },
  { code: 'files.read', description: 'Доступ к файлам' },
  { code: 'surveys.morning.read', description: 'Просмотр утренних опросов' },
  { code: 'surveys.morning.create', description: 'Создание утреннего опроса' },
  { code: 'surveys.rpe.read', description: 'Просмотр RPE опросов' },
  { code: 'surveys.rpe.create', description: 'Создание RPE опроса' },
  { code: 'trainingCategories.read', description: 'Просмотр категорий тренировок' },
  { code: 'trainingCategories.create', description: 'Создание категории тренировок' },
  { code: 'trainingCategories.update', description: 'Редактирование категории тренировок' },
  { code: 'trainingCategories.delete', description: 'Удаление категории тренировок' },
  { code: 'fitnessTests.read', description: 'Просмотр фитнес-тестов' },
  { code: 'fitnessTests.create', description: 'Создание фитнес-теста' },
  { code: 'fitnessTests.update', description: 'Редактирование фитнес-теста' },
  { code: 'fitnessTests.delete', description: 'Удаление фитнес-теста' },
  { code: 'exerciseTags.read', description: 'Просмотр тегов упражнений' },
  { code: 'exerciseTags.create', description: 'Создание тега упражнения' },
  { code: 'exerciseTags.update', description: 'Редактирование тега упражнения' },
  { code: 'exerciseTags.delete', description: 'Удаление тега упражнения' },
  { code: 'exerciseCategories.read', description: 'Просмотр категорий упражнений' },
  { code: 'exerciseCategories.create', description: 'Создание категории упражнений' },
  { code: 'exerciseCategories.update', description: 'Редактирование категории упражнений' },
  { code: 'exerciseCategories.delete', description: 'Удаление категории упражнений' },
  { code: 'documents.read', description: 'Просмотр документов' },
  { code: 'teams.read', description: 'Просмотр команд' },
  { code: 'teams.create', description: 'Создание команды' },
  { code: 'teams.update', description: 'Редактирование команды' },
  { code: 'teams.delete', description: 'Удаление команды' },
  { code: 'teams.players.create', description: 'Добавление игрока в команду' },
  { code: 'teams.players.update', description: 'Редактирование игрока команды' },
  { code: 'teams.players.delete', description: 'Удаление игрока из команды' },
  { code: 'teams.players.uploadImage', description: 'Загрузка фото игрока' },
  { code: 'teams.coaches.create', description: 'Добавление тренера в команду' },
  { code: 'teams.coaches.delete', description: 'Удаление тренера из команды' },
  { code: 'matches.read', description: 'Просмотр матчей' },
  { code: 'matches.create', description: 'Создание матча' },
  { code: 'matches.update', description: 'Редактирование матча' },
  { code: 'matches.delete', description: 'Удаление матча' },
  { code: 'matches.players.read', description: 'Просмотр состава на матч' },
  { code: 'matches.players.update', description: 'Редактирование состава на матч' },
  { code: 'matches.players.delete', description: 'Удаление игрока из матча' },
  { code: 'users.read', description: 'Просмотр пользователей' },
  { code: 'users.create', description: 'Создание пользователя' },
  { code: 'users.delete', description: 'Удаление пользователя' },
  { code: 'painAreas.create', description: 'Добавление зоны боли' },
  { code: 'storage.init', description: 'Инициализация хранилища' },
  { code: 'telegram.broadcastTime.read', description: 'Просмотр времени рассылки Telegram' },
  { code: 'telegram.broadcastTime.update', description: 'Изменение времени рассылки Telegram' },
  { code: 'telegram.testBroadcast', description: 'Тестовая рассылка Telegram' }
];

// Используем тип ролей из enum
const roles = roleEnum.enumValues;

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions.map(p => p.code),
  // Остальные роли можно заполнить по необходимости, например:
  ADMIN: permissions.map(p => p.code),
  COACH: [
    'teams.read', 'teams.players.create', 'teams.players.update', 'teams.players.delete',
    'trainings.read', 'trainings.create', 'trainings.update',
    'exercises.read', 'exercises.create',
    'documents.read',
  ],
  MEMBER: [
    'teams.read', 'trainings.read', 'exercises.read', 'documents.read'
  ],
  SCOUT: [
    'teams.read', 'trainings.read', 'exercises.read'
  ],
  DOCTOR: [
    'teams.read', 'trainings.read', 'documents.read'
  ],
  DIRECTOR: [
    'teams.read', 'trainings.read', 'matches.read', 'documents.read'
  ],
};

async function main() {
  // 1. Добавить права
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
  console.log('Seed complete');
  process.exit(0);
}); 