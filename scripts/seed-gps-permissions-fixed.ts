import { db } from '../src/lib/db';
import { gpsPermission, gpsRolePermission, gpsUserPermission } from '../src/db/schema/gpsPermissions';

// GPS разрешения по категориям
const gpsPermissions = [
  // Reports (Отчеты)
  { code: 'gps.reports.view', name: 'Просмотр GPS отчетов', description: 'Просмотр GPS отчетов и данных', category: 'reports' },
  { code: 'gps.reports.create', name: 'Создание GPS отчетов', description: 'Загрузка и создание GPS отчетов', category: 'reports' },
  { code: 'gps.reports.edit', name: 'Редактирование GPS отчетов', description: 'Редактирование GPS отчетов и данных', category: 'reports' },
  { code: 'gps.reports.delete', name: 'Удаление GPS отчетов', description: 'Удаление GPS отчетов', category: 'reports' },
  { code: 'gps.reports.export', name: 'Экспорт GPS данных', description: 'Экспорт GPS данных в различные форматы', category: 'reports' },

  // Profiles (Профили)
  { code: 'gps.profiles.view', name: 'Просмотр GPS профилей', description: 'Просмотр профилей визуализации GPS данных', category: 'profiles' },
  { code: 'gps.profiles.create', name: 'Создание GPS профилей', description: 'Создание новых профилей визуализации', category: 'profiles' },
  { code: 'gps.profiles.edit', name: 'Редактирование GPS профилей', description: 'Редактирование профилей визуализации', category: 'profiles' },
  { code: 'gps.profiles.delete', name: 'Удаление GPS профилей', description: 'Удаление профилей визуализации', category: 'profiles' },

  // Data (Данные)
  { code: 'gps.data.view', name: 'Просмотр GPS данных', description: 'Просмотр GPS данных игроков', category: 'data' },
  { code: 'gps.data.edit', name: 'Редактирование GPS данных', description: 'Редактирование GPS данных игроков', category: 'data' },
  { code: 'gps.data.export', name: 'Экспорт GPS данных', description: 'Экспорт GPS данных игроков', category: 'data' },

  // Admin (Администрирование)
  { code: 'gps.admin.manage', name: 'Управление GPS системой', description: 'Полное управление GPS системой', category: 'admin' },
  { code: 'gps.admin.permissions', name: 'Управление GPS разрешениями', description: 'Управление разрешениями GPS системы', category: 'admin' },
];

// Разрешения по ролям
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
  try {
    console.log('🌱 Начинаем заполнение GPS разрешений...');

    // 1. Создаем GPS разрешения
    console.log('📝 Создаем GPS разрешения...');
    const createdPermissions = [];
    
    for (const permission of gpsPermissions) {
      try {
        const [created] = await db
          .insert(gpsPermission)
          .values(permission)
          .onConflictDoNothing()
          .returning();
        
        if (created) {
          createdPermissions.push(created);
          console.log(`✅ Создано разрешение: ${permission.name}`);
        } else {
          console.log(`⚠️  Разрешение уже существует: ${permission.name}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка создания разрешения ${permission.name}:`, error);
      }
    }

    // 2. Получаем все разрешения из БД для маппинга
    const allPermissions = await db.select().from(gpsPermission);
    const permissionMap = new Map(allPermissions.map(p => [p.code, p.id]));

    // 3. Создаем связи ролей с разрешениями
    console.log('🔗 Создаем связи ролей с разрешениями...');
    
    for (const [role, permissionCodes] of Object.entries(rolePermissions)) {
      console.log(`📋 Обрабатываем роль: ${role}`);
      
      for (const permissionCode of permissionCodes) {
        const permissionId = permissionMap.get(permissionCode);
        
        if (!permissionId) {
          console.warn(`⚠️  Разрешение не найдено: ${permissionCode}`);
          continue;
        }

        try {
          await db
            .insert(gpsRolePermission)
            .values({
              role,
              permissionId,
              allowed: true
            })
            .onConflictDoNothing();
          
          console.log(`  ✅ Назначено разрешение: ${permissionCode}`);
        } catch (error) {
          console.error(`  ❌ Ошибка назначения разрешения ${permissionCode}:`, error);
        }
      }
    }

    console.log('🎉 GPS разрешения успешно заполнены!');
    console.log(`📊 Статистика:`);
    console.log(`  - Разрешений создано: ${createdPermissions.length}`);
    console.log(`  - Ролей обработано: ${Object.keys(rolePermissions).length}`);
    
    // Выводим итоговую статистику
    const totalRolePermissions = await db.select().from(gpsRolePermission);
    console.log(`  - Связей ролей с разрешениями: ${totalRolePermissions.length}`);

  } catch (error) {
    console.error('❌ Ошибка заполнения GPS разрешений:', error);
    throw error;
  }
}

// Запускаем скрипт
seedGpsPermissions()
  .then(() => {
    console.log('✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });

export { seedGpsPermissions };
