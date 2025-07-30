import { db } from '../src/lib/db.esm.ts';
import { permission } from '../src/db/schema/permission.ts';
import { rolePermission } from '../src/db/schema/rolePermission.ts';
import { roleEnum } from '../src/db/schema/user.ts';

// Новый минимальный список прав по разделам
const permissions = [
  { code: 'teams.read', description: 'Команды (просмотр)' },
  { code: 'teams.update', description: 'Команды (редактирование)' },
  { code: 'exercises.read', description: 'Упражнения (просмотр)' },
  { code: 'exercises.update', description: 'Упражнения (редактирование)' },
  { code: 'trainings.read', description: 'Тренировки (просмотр)' },
  { code: 'trainings.update', description: 'Тренировки (редактирование)' },
  { code: 'matches.read', description: 'Матчи (просмотр)' },
  { code: 'matches.update', description: 'Матчи (редактирование)' },
  { code: 'attendance.read', description: 'Посещаемость (просмотр)' },
  { code: 'attendance.update', description: 'Посещаемость (редактирование)' },
  { code: 'fitnessTests.read', description: 'Фитнес тесты (просмотр)' },
  { code: 'fitnessTests.update', description: 'Фитнес тесты (редактирование)' },
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
  { code: 'documents.read', description: 'Документы (просмотр)' },
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
    'teams.read', 'teams.update',
    'exercises.read', 'exercises.update',
    'trainings.read', 'trainings.update',
    'matches.read', 'matches.update',
    'attendance.read', 'attendance.update',
    'fitnessTests.read', 'fitnessTests.update',
    'calendar.read', 'calendar.update',
    'morningSurvey.read', 'morningSurvey.update',
    'rpeSurvey.read', 'rpeSurvey.update',
    'documents.read', 'documents.update',
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