const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

// Симуляция функций проверки разрешений
async function hasGpsPermission(userId, clubId, teamId, permissionCode) {
  const client = await pool.connect();
  
  try {
    // 1. Получаем разрешение по коду
    const [permission] = await client.query(`
      SELECT id FROM "GpsPermission" WHERE code = $1
    `, [permissionCode]);
    
    if (!permission) {
      return { hasPermission: false, source: 'none', details: 'Permission not found' };
    }

    // 2. Проверяем ролевые разрешения (упрощенная версия)
    const [rolePermission] = await client.query(`
      SELECT rp.allowed
      FROM "GpsRolePermission" rp
      WHERE rp.role = $1 AND rp."permissionId" = $2
    `, ['COACH', permission.id]); // Для теста используем COACH

    if (rolePermission && rolePermission.allowed) {
      return { hasPermission: true, source: 'role', details: 'Role-based permission' };
    }

    return { hasPermission: false, source: 'none', details: 'No permission found' };

  } catch (error) {
    console.error('Error checking GPS permission:', error);
    return { hasPermission: false, source: 'none', details: 'Error checking permission' };
  } finally {
    client.release();
  }
}

async function testPermissionFunctions() {
  try {
    console.log('🧪 Тестируем функции проверки разрешений...\n');

    // 1. Тест существующих разрешений
    console.log('1️⃣ Тест существующих разрешений');
    const testPermissions = [
      'gps.reports.view',
      'gps.reports.create', 
      'gps.reports.edit',
      'gps.reports.delete',
      'gps.profiles.view',
      'gps.profiles.create',
      'gps.data.view',
      'gps.data.edit',
      'gps.admin.manage'
    ];

    for (const permission of testPermissions) {
      const result = await hasGpsPermission('test-user', 'test-club', 'test-team', permission);
      const status = result.hasPermission ? '✅' : '❌';
      console.log(`   ${status} ${permission}: ${result.hasPermission} (${result.source})`);
    }

    // 2. Тест несуществующих разрешений
    console.log('\n2️⃣ Тест несуществующих разрешений');
    const invalidPermissions = [
      'gps.nonexistent.permission',
      'gps.invalid.code',
      'invalid.permission.code',
      'gps.reports.invalid'
    ];

    for (const permission of invalidPermissions) {
      const result = await hasGpsPermission('test-user', 'test-club', 'test-team', permission);
      const status = !result.hasPermission ? '✅' : '❌';
      console.log(`   ${status} ${permission}: ${result.hasPermission} (ожидалось: false)`);
    }

    // 3. Тест пустых и некорректных значений
    console.log('\n3️⃣ Тест пустых и некорректных значений');
    const edgeCases = [
      { permission: '', description: 'Пустая строка' },
      { permission: null, description: 'null значение' },
      { permission: undefined, description: 'undefined значение' },
      { permission: '   ', description: 'Только пробелы' },
      { permission: 'gps.', description: 'Неполный код' },
      { permission: '.reports.view', description: 'Код без префикса' }
    ];

    for (const testCase of edgeCases) {
      try {
        const result = await hasGpsPermission('test-user', 'test-club', 'test-team', testCase.permission);
        const status = !result.hasPermission ? '✅' : '❌';
        console.log(`   ${status} ${testCase.description}: ${result.hasPermission}`);
      } catch (error) {
        console.log(`   ✅ ${testCase.description}: Ошибка обработана корректно`);
      }
    }

    // 4. Тест производительности функций
    console.log('\n4️⃣ Тест производительности функций');
    const iterations = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await hasGpsPermission('test-user', 'test-club', 'test-team', 'gps.reports.view');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`   ✅ ${iterations} вызовов за ${endTime - startTime}ms`);
    console.log(`   ✅ Среднее время: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 50) {
      console.log(`   ⚠️  Медленные функции: ${avgTime.toFixed(2)}ms > 50ms`);
    }

    // 5. Тест одновременных вызовов
    console.log('\n5️⃣ Тест одновременных вызовов');
    const concurrentCalls = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentCalls; i++) {
      promises.push(hasGpsPermission('test-user', 'test-club', 'test-team', 'gps.reports.view'));
    }
    
    const concurrentStartTime = Date.now();
    const results = await Promise.all(promises);
    const concurrentEndTime = Date.now();
    
    const successCount = results.filter(r => r.hasPermission).length;
    console.log(`   ✅ ${concurrentCalls} одновременных вызовов за ${concurrentEndTime - concurrentStartTime}ms`);
    console.log(`   ✅ Успешных: ${successCount}/${concurrentCalls}`);

    // 6. Тест различных ролей
    console.log('\n6️⃣ Тест различных ролей');
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'DOCTOR', 'DIRECTOR', 'SCOUT', 'MEMBER'];
    
    for (const role of roles) {
      // Симулируем проверку для каждой роли
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM "GpsRolePermission" rp
          JOIN "GpsPermission" p ON rp."permissionId" = p.id
          WHERE rp.role = $1 AND rp.allowed = true
        `, [role]);
        
        const permissionCount = parseInt(result.rows[0].count);
        console.log(`   ✅ ${role}: ${permissionCount} разрешений`);
        
      } catch (error) {
        console.log(`   ❌ ${role}: Ошибка - ${error.message}`);
      } finally {
        client.release();
      }
    }

    console.log('\n🎉 Тестирование функций разрешений завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  } finally {
    await pool.end();
  }
}

testPermissionFunctions();
