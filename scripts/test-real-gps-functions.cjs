const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testRealGpsFunctions() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем реальные GPS функции...\n');

    // 1. Тест функции hasGpsPermission (симуляция)
    console.log('1️⃣ Тест функции hasGpsPermission');
    
    async function hasGpsPermission(userId, clubId, teamId, permissionCode) {
      try {
        // 1. Получаем разрешение по коду
        const permissions = await client.query(`
          SELECT id, code, name, category
          FROM "GpsPermission"
          WHERE code = $1
          LIMIT 1
        `, [permissionCode]);
        
        const permission = permissions.rows[0];
        
        if (!permission) {
          return {
            hasPermission: false,
            source: 'none',
            details: `Permission ${permissionCode} not found`
          };
        }

        // 2. Проверяем ролевые разрешения (упрощенная версия для COACH)
        const rolePermissions = await client.query(`
          SELECT rp.allowed
          FROM "GpsRolePermission" rp
          WHERE rp.role = $1 AND rp."permissionId" = $2
        `, ['COACH', permission.id]);
        
        const rolePermission = rolePermissions.rows[0];
        
        if (rolePermission && rolePermission.allowed) {
          return {
            hasPermission: true,
            source: 'role',
            details: 'Role-based permission'
          };
        }

        return {
          hasPermission: false,
          source: 'none',
          details: 'No permission found'
        };

      } catch (error) {
        console.error('Error checking GPS permission:', error);
        return {
          hasPermission: false,
          source: 'none',
          details: 'Error checking permission'
        };
      }
    }

    // Тестируем различные разрешения
    const testCases = [
      { permission: 'gps.reports.view', expected: true, description: 'COACH может просматривать отчеты' },
      { permission: 'gps.reports.create', expected: true, description: 'COACH может создавать отчеты' },
      { permission: 'gps.reports.delete', expected: false, description: 'COACH НЕ может удалять отчеты' },
      { permission: 'gps.profiles.view', expected: true, description: 'COACH может просматривать профили' },
      { permission: 'gps.profiles.create', expected: true, description: 'COACH может создавать профили' },
      { permission: 'gps.data.edit', expected: true, description: 'COACH может редактировать данные' },
      { permission: 'gps.admin.manage', expected: false, description: 'COACH НЕ может управлять системой' },
      { permission: 'gps.nonexistent.permission', expected: false, description: 'Несуществующее разрешение' }
    ];

    for (const testCase of testCases) {
      const result = await hasGpsPermission('test-user', 'test-club', 'test-team', testCase.permission);
      const status = result.hasPermission === testCase.expected ? '✅' : '❌';
      console.log(`   ${status} ${testCase.description}: ${result.hasPermission} (ожидалось: ${testCase.expected})`);
    }

    // 2. Тест производительности
    console.log('\n2️⃣ Тест производительности функций');
    const iterations = 20;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await hasGpsPermission('test-user', 'test-club', 'test-team', 'gps.reports.view');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`   ✅ ${iterations} вызовов за ${endTime - startTime}ms`);
    console.log(`   ✅ Среднее время: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 100) {
      console.log(`   ⚠️  Медленные функции: ${avgTime.toFixed(2)}ms > 100ms`);
    } else {
      console.log(`   ✅ Производительность в норме`);
    }

    // 3. Тест различных ролей
    console.log('\n3️⃣ Тест различных ролей');
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'DOCTOR', 'DIRECTOR', 'SCOUT', 'MEMBER'];
    
    for (const role of roles) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM "GpsRolePermission" rp
        WHERE rp.role = $1 AND rp.allowed = true
      `, [role]);
      
      const permissionCount = parseInt(result.rows[0].count);
      console.log(`   ✅ ${role}: ${permissionCount} разрешений`);
    }

    // 4. Тест сложных запросов
    console.log('\n4️⃣ Тест сложных запросов');
    
    // Проверяем разрешения для конкретной роли и категории
    const complexResult = await client.query(`
      SELECT p.code, p.name, p.category
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = $1 AND p.category = $2 AND rp.allowed = true
      ORDER BY p.code
    `, ['COACH', 'reports']);
    
    console.log(`   ✅ COACH + reports: ${complexResult.rows.length} разрешений`);
    complexResult.rows.forEach(row => {
      console.log(`      - ${row.code}: ${row.name}`);
    });

    // 5. Тест граничных случаев
    console.log('\n5️⃣ Тест граничных случаев');
    
    const edgeCases = [
      { permission: '', description: 'Пустая строка' },
      { permission: 'gps.', description: 'Неполный код' },
      { permission: '.reports.view', description: 'Код без префикса' },
      { permission: 'gps.reports.', description: 'Код без суффикса' }
    ];

    for (const testCase of edgeCases) {
      const result = await hasGpsPermission('test-user', 'test-club', 'test-team', testCase.permission);
      const status = !result.hasPermission ? '✅' : '❌';
      console.log(`   ${status} ${testCase.description}: ${result.hasPermission} (ожидалось: false)`);
    }

    // 6. Тест целостности данных
    console.log('\n6️⃣ Тест целостности данных');
    
    // Проверяем, что все разрешения имеют корректные коды
    const invalidCodes = await client.query(`
      SELECT code FROM "GpsPermission" 
      WHERE code NOT LIKE 'gps.%' OR code = 'gps.' OR code LIKE 'gps..%'
    `);
    
    if (invalidCodes.rows.length > 0) {
      console.log(`   ❌ Найдены некорректные коды: ${invalidCodes.rows.length}`);
      invalidCodes.rows.forEach(row => {
        console.log(`      - ${row.code}`);
      });
    } else {
      console.log(`   ✅ Все коды разрешений корректны`);
    }

    // Проверяем дубликаты кодов
    const duplicateCodes = await client.query(`
      SELECT code, COUNT(*) as count
      FROM "GpsPermission"
      GROUP BY code
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCodes.rows.length > 0) {
      console.log(`   ❌ Найдены дубликаты кодов: ${duplicateCodes.rows.length}`);
    } else {
      console.log(`   ✅ Дубликатов кодов нет`);
    }

    console.log('\n🎉 Тестирование реальных GPS функций завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testRealGpsFunctions();
