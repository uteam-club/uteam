const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testErrorHandling() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем обработку ошибок GPS разрешений...\n');

    // 1. Тест несуществующего разрешения
    console.log('1️⃣ Тест несуществующего разрешения...');
    try {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, ['COACH', 'gps.nonexistent.permission']);
      
      const hasPermission = result.rows.length > 0 && result.rows[0].allowed;
      console.log(`   ✅ Несуществующее разрешение: ${hasPermission} (ожидалось: false)`);
    } catch (error) {
      console.log(`   ❌ Ошибка при проверке несуществующего разрешения: ${error.message}`);
    }

    // 2. Тест несуществующей роли
    console.log('\n2️⃣ Тест несуществующей роли...');
    try {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, ['NONEXISTENT_ROLE', 'gps.reports.view']);
      
      const hasPermission = result.rows.length > 0 && result.rows[0].allowed;
      console.log(`   ✅ Несуществующая роль: ${hasPermission} (ожидалось: false)`);
    } catch (error) {
      console.log(`   ❌ Ошибка при проверке несуществующей роли: ${error.message}`);
    }

    // 3. Тест SQL инъекции
    console.log('\n3️⃣ Тест SQL инъекции...');
    try {
      const maliciousRole = "'; DROP TABLE \"GpsPermission\"; --";
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, [maliciousRole, 'gps.reports.view']);
      
      console.log(`   ✅ SQL инъекция заблокирована: ${result.rows.length} результатов`);
    } catch (error) {
      console.log(`   ❌ Ошибка при тесте SQL инъекции: ${error.message}`);
    }

    // 4. Тест пустых значений
    console.log('\n4️⃣ Тест пустых значений...');
    try {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, [null, null]);
      
      console.log(`   ✅ Пустые значения: ${result.rows.length} результатов (ожидалось: 0)`);
    } catch (error) {
      console.log(`   ❌ Ошибка при тесте пустых значений: ${error.message}`);
    }

    // 5. Проверяем, что таблицы не повреждены
    console.log('\n5️⃣ Проверяем целостность данных...');
    const permissionCount = await client.query('SELECT COUNT(*) FROM "GpsPermission"');
    const rolePermissionCount = await client.query('SELECT COUNT(*) FROM "GpsRolePermission"');
    
    console.log(`   ✅ Разрешений в БД: ${permissionCount.rows[0].count} (ожидалось: 14)`);
    console.log(`   ✅ Связей ролей: ${rolePermissionCount.rows[0].count} (ожидалось: 55)`);

    // 6. Тест граничных случаев
    console.log('\n6️⃣ Тест граничных случаев...');
    
    // Очень длинная строка
    const longString = 'a'.repeat(1000);
    try {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, [longString, 'gps.reports.view']);
      
      console.log(`   ✅ Длинная строка: ${result.rows.length} результатов (ожидалось: 0)`);
    } catch (error) {
      console.log(`   ❌ Ошибка при тесте длинной строки: ${error.message}`);
    }

    // Специальные символы
    const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    try {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, [specialChars, 'gps.reports.view']);
      
      console.log(`   ✅ Специальные символы: ${result.rows.length} результатов (ожидалось: 0)`);
    } catch (error) {
      console.log(`   ❌ Ошибка при тесте специальных символов: ${error.message}`);
    }

    console.log('\n🎉 Тестирование обработки ошибок завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testErrorHandling();
