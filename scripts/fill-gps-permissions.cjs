const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

// GPS разрешения
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

async function fillGpsPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Начинаем заполнение GPS разрешений...');

    // 1. Создаем GPS разрешения
    console.log('📝 Создаем GPS разрешения...');
    const permissionIds = {};
    
    for (const permission of gpsPermissions) {
      const result = await client.query(`
        INSERT INTO "GpsPermission" (code, name, description, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
        RETURNING id, code
      `, [permission.code, permission.name, permission.description, permission.category]);
      
      if (result.rows.length > 0) {
        permissionIds[permission.code] = result.rows[0].id;
        console.log(`  ✅ Создано разрешение: ${permission.name}`);
      } else {
        // Получаем существующий ID
        const existing = await client.query('SELECT id FROM "GpsPermission" WHERE code = $1', [permission.code]);
        permissionIds[permission.code] = existing.rows[0].id;
        console.log(`  ⚠️  Разрешение уже существует: ${permission.name}`);
      }
    }

    // 2. Создаем связи ролей с разрешениями
    console.log('🔗 Создаем связи ролей с разрешениями...');
    
    for (const [role, permissionCodes] of Object.entries(rolePermissions)) {
      console.log(`📋 Обрабатываем роль: ${role}`);
      
      for (const permissionCode of permissionCodes) {
        const permissionId = permissionIds[permissionCode];
        
        if (!permissionId) {
          console.warn(`  ⚠️  Разрешение не найдено: ${permissionCode}`);
          continue;
        }

        await client.query(`
          INSERT INTO "GpsRolePermission" (role, "permissionId", allowed)
          VALUES ($1, $2, true)
        `, [role, permissionId]);
        
        console.log(`  ✅ Назначено разрешение: ${permissionCode}`);
      }
    }

    // 3. Проверяем результат
    const permissionCount = await client.query('SELECT COUNT(*) FROM "GpsPermission"');
    const rolePermissionCount = await client.query('SELECT COUNT(*) FROM "GpsRolePermission"');
    
    console.log('\n🎉 GPS разрешения успешно заполнены!');
    console.log(`📊 Статистика:`);
    console.log(`  - Разрешений создано: ${permissionCount.rows[0].count}`);
    console.log(`  - Связей ролей с разрешениями: ${rolePermissionCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Ошибка заполнения GPS разрешений:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fillGpsPermissions()
  .then(() => {
    console.log('✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });
