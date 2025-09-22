const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testGpsApiEndpoints() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем все GPS API эндпоинты...\n');

    // 1. Тестируем API получения разрешений
    console.log('1️⃣ Тест GET /api/gps/permissions');
    try {
      const result = await client.query(`
        SELECT p.code, p.name, p.category, p.description
        FROM "GpsPermission" p
        ORDER BY p.category, p.code
      `);
      
      console.log(`   ✅ Разрешений получено: ${result.rows.length}`);
      
      // Проверяем группировку по категориям
      const categories = [...new Set(result.rows.map(r => r.category))];
      console.log(`   ✅ Категорий: ${categories.length} (${categories.join(', ')})`);
      
      // Проверяем уникальность кодов
      const codes = result.rows.map(r => r.code);
      const uniqueCodes = [...new Set(codes)];
      console.log(`   ✅ Уникальных кодов: ${uniqueCodes.length}/${codes.length}`);
      
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }

    // 2. Тестируем API ролевых разрешений для каждой роли
    console.log('\n2️⃣ Тест GET /api/gps/roles/[role]/permissions');
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'DOCTOR', 'DIRECTOR', 'SCOUT', 'MEMBER'];
    
    for (const role of roles) {
      try {
        const result = await client.query(`
          SELECT rp.role, p.code, p.name, p.category, rp.allowed
          FROM "GpsRolePermission" rp
          JOIN "GpsPermission" p ON rp."permissionId" = p.id
          WHERE rp.role = $1
          ORDER BY p.category, p.code
        `, [role]);
        
        const allowedCount = result.rows.filter(r => r.allowed).length;
        console.log(`   ✅ ${role}: ${allowedCount} разрешений`);
        
        // Проверяем, что все разрешения allowed = true
        const notAllowed = result.rows.filter(r => !r.allowed);
        if (notAllowed.length > 0) {
          console.log(`   ⚠️  ${role}: ${notAllowed.length} разрешений с allowed = false`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${role}: Ошибка - ${error.message}`);
      }
    }

    // 3. Тестируем сложные запросы разрешений
    console.log('\n3️⃣ Тест сложных запросов разрешений');
    
    // Проверяем разрешения для конкретной роли и категории
    try {
      const result = await client.query(`
        SELECT p.code, p.name
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.category = $2 AND rp.allowed = true
        ORDER BY p.code
      `, ['COACH', 'reports']);
      
      console.log(`   ✅ COACH + reports: ${result.rows.length} разрешений`);
      result.rows.forEach(row => {
        console.log(`      - ${row.code}: ${row.name}`);
      });
      
    } catch (error) {
      console.log(`   ❌ Ошибка сложного запроса: ${error.message}`);
    }

    // 4. Тестируем производительность запросов
    console.log('\n4️⃣ Тест производительности запросов');
    
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, ['COACH', 'gps.reports.create']);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`   ✅ ${iterations} запросов за ${endTime - startTime}ms`);
    console.log(`   ✅ Среднее время: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 10) {
      console.log(`   ⚠️  Медленные запросы: ${avgTime.toFixed(2)}ms > 10ms`);
    }

    // 5. Тестируем индексы
    console.log('\n5️⃣ Тест использования индексов');
    
    try {
      const explainResult = await client.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, ['COACH', 'gps.reports.create']);
      
      const plan = explainResult.rows[0]['QUERY PLAN'];
      console.log(`   ✅ План запроса: ${plan}`);
      
      if (plan.includes('Index Scan')) {
        console.log(`   ✅ Индексы используются`);
      } else {
        console.log(`   ⚠️  Индексы не используются`);
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка EXPLAIN: ${error.message}`);
    }

    // 6. Тестируем целостность данных
    console.log('\n6️⃣ Тест целостности данных');
    
    // Проверяем, что все роли имеют разрешения
    const roleCounts = await client.query(`
      SELECT role, COUNT(*) as count
      FROM "GpsRolePermission"
      WHERE allowed = true
      GROUP BY role
      ORDER BY role
    `);
    
    console.log(`   ✅ Разрешения по ролям:`);
    roleCounts.rows.forEach(row => {
      console.log(`      ${row.role}: ${row.count} разрешений`);
    });
    
    // Проверяем, что нет "висячих" ссылок
    const orphanedPermissions = await client.query(`
      SELECT rp.id, rp.role, rp."permissionId"
      FROM "GpsRolePermission" rp
      LEFT JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE p.id IS NULL
    `);
    
    if (orphanedPermissions.rows.length > 0) {
      console.log(`   ❌ Найдены висячие ссылки: ${orphanedPermissions.rows.length}`);
    } else {
      console.log(`   ✅ Висячих ссылок нет`);
    }

    console.log('\n🎉 Тестирование API эндпоинтов завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testGpsApiEndpoints();
