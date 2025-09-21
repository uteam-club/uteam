import { db } from '../src/lib/db';
import { gpsPermission, gpsRolePermission } from '../src/db/schema/gpsPermissions';

// GPS разрешения
const gpsPermissions = [
  // Reports permissions
  { code: 'gps.reports.view', name: 'Просмотр GPS отчетов', description: 'Просмотр GPS отчетов и данных', category: 'reports' },
  { code: 'gps.reports.create', name: 'Создание GPS отчетов', description: 'Загрузка и создание GPS отчетов', category: 'reports' },
  { code: 'gps.reports.edit', name: 'Редактирование GPS отчетов', description: 'Редактирование GPS данных в отчетах', category: 'reports' },
  { code: 'gps.reports.delete', name: 'Удаление GPS отчетов', description: 'Удаление GPS отчетов', category: 'reports' },
  { code: 'gps.reports.export', name: 'Экспорт GPS данных', description: 'Экспорт GPS данных в различные форматы', category: 'reports' },
  
  // Profiles permissions
  { code: 'gps.profiles.view', name: 'Просмотр GPS профилей', description: 'Просмотр профилей визуализации GPS данных', category: 'profiles' },
  { code: 'gps.profiles.create', name: 'Создание GPS профилей', description: 'Создание профилей визуализации GPS данных', category: 'profiles' },
  { code: 'gps.profiles.edit', name: 'Редактирование GPS профилей', description: 'Редактирование профилей визуализации GPS данных', category: 'profiles' },
  { code: 'gps.profiles.delete', name: 'Удаление GPS профилей', description: 'Удаление профилей визуализации GPS данных', category: 'profiles' },
  
  // Data permissions
  { code: 'gps.data.view', name: 'Просмотр GPS данных', description: 'Просмотр детальных GPS данных игроков', category: 'data' },
  { code: 'gps.data.edit', name: 'Редактирование GPS данных', description: 'Редактирование GPS данных игроков', category: 'data' },
  { code: 'gps.data.export', name: 'Экспорт GPS данных', description: 'Экспорт GPS данных игроков', category: 'data' },
  
  // Admin permissions
  { code: 'gps.admin.manage', name: 'Управление GPS системой', description: 'Полное управление GPS системой', category: 'admin' },
  { code: 'gps.admin.permissions', name: 'Управление GPS разрешениями', description: 'Управление разрешениями GPS системы', category: 'admin' }
];

// Роли и их разрешения по умолчанию
const rolePermissions = {
  'SUPER_ADMIN': [
    'gps.reports.view', 'gps.reports.create', 'gps.reports.edit', 'gps.reports.delete', 'gps.reports.export',
    'gps.profiles.view', 'gps.profiles.create', 'gps.profiles.edit', 'gps.profiles.delete',
    'gps.data.view', 'gps.data.edit', 'gps.data.export',
    'gps.admin.manage', 'gps.admin.permissions'
  ],
  'ADMIN': [
    'gps.reports.view', 'gps.reports.create', 'gps.reports.edit', 'gps.reports.delete', 'gps.reports.export',
    'gps.profiles.view', 'gps.profiles.create', 'gps.profiles.edit', 'gps.profiles.delete',
    'gps.data.view', 'gps.data.edit', 'gps.data.export',
    'gps.admin.permissions'
  ],
  'COACH': [
    'gps.reports.view', 'gps.reports.create', 'gps.reports.edit', 'gps.reports.export',
    'gps.profiles.view', 'gps.profiles.create', 'gps.profiles.edit',
    'gps.data.view', 'gps.data.edit', 'gps.data.export'
  ],
  'DOCTOR': [
    'gps.reports.view', 'gps.reports.export',
    'gps.profiles.view',
    'gps.data.view', 'gps.data.export'
  ],
  'DIRECTOR': [
    'gps.reports.view', 'gps.reports.export',
    'gps.profiles.view',
    'gps.data.view', 'gps.data.export'
  ],
  'SCOUT': [
    'gps.reports.view', 'gps.reports.export',
    'gps.profiles.view',
    'gps.data.view', 'gps.data.export'
  ],
  'MEMBER': [
    'gps.reports.view',
    'gps.profiles.view',
    'gps.data.view'
  ]
};

async function seedGpsPermissions() {
  console.log('🌱 Начало заполнения GPS разрешений...');

  try {
    // Добавляем разрешения
    console.log('🔐 Добавление GPS разрешений...');
    const permissionMap = new Map();
    
    for (const permission of gpsPermissions) {
      const [inserted] = await db.insert(gpsPermission).values(permission).returning();
      permissionMap.set(permission.code, inserted.id);
      console.log(`✅ Добавлено разрешение: ${permission.name}`);
    }

    // Добавляем роли и разрешения
    console.log('👥 Назначение разрешений ролям...');
    for (const [role, permissionCodes] of Object.entries(rolePermissions)) {
      for (const permissionCode of permissionCodes) {
        const permissionId = permissionMap.get(permissionCode);
        if (permissionId) {
          await db.insert(gpsRolePermission).values({
            role,
            permissionId,
            allowed: true
          }).onConflictDoNothing();
          console.log(`✅ Назначено разрешение ${permissionCode} для роли ${role}`);
        }
      }
    }

    console.log('🎉 Заполнение GPS разрешений завершено!');
  } catch (error) {
    console.error('❌ Ошибка при заполнении GPS разрешений:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  seedGpsPermissions()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { seedGpsPermissions };
