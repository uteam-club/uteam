const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testDatabaseIntegrity() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Проверяем целостность базы данных GPS разрешений...\n');

    // 1. Проверка структуры таблиц
    console.log('1️⃣ Проверка структуры таблиц');
    
    const tables = ['GpsPermission', 'GpsRolePermission', 'GpsUserPermission'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`   ✅ ${table}: ${result.rows.length} колонок`);
      
      // Проверяем обязательные поля
      const requiredFields = {
        'GpsPermission': ['id', 'code', 'name', 'category'],
        'GpsRolePermission': ['id', 'role', 'permissionId', 'allowed'],
        'GpsUserPermission': ['id', 'userId', 'clubId', 'canView', 'canEdit', 'canDelete', 'canExport', 'canManageProfiles']
      };
      
      const fieldNames = result.rows.map(row => row.column_name);
      const missingFields = requiredFields[table].filter(field => !fieldNames.includes(field));
      
      if (missingFields.length > 0) {
        console.log(`   ❌ ${table}: Отсутствуют поля: ${missingFields.join(', ')}`);
      } else {
        console.log(`   ✅ ${table}: Все обязательные поля присутствуют`);
      }
    }

    // 2. Проверка индексов
    console.log('\n2️⃣ Проверка индексов');
    
    const indexes = await client.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE tablename LIKE 'Gps%Permission%'
      ORDER BY tablename, indexname
    `);
    
    console.log(`   ✅ Найдено индексов: ${indexes.rows.length}`);
    indexes.rows.forEach(row => {
      console.log(`      - ${row.tablename}.${row.indexname}`);
    });

    // 3. Проверка внешних ключей
    console.log('\n3️⃣ Проверка внешних ключей');
    
    const foreignKeys = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name LIKE 'Gps%Permission%'
    `);
    
    console.log(`   ✅ Найдено внешних ключей: ${foreignKeys.rows.length}`);
    foreignKeys.rows.forEach(row => {
      console.log(`      - ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });

    // 4. Проверка данных
    console.log('\n4️⃣ Проверка данных');
    
    // Количество записей
    const permissionCount = await client.query('SELECT COUNT(*) FROM "GpsPermission"');
    const rolePermissionCount = await client.query('SELECT COUNT(*) FROM "GpsRolePermission"');
    const userPermissionCount = await client.query('SELECT COUNT(*) FROM "GpsUserPermission"');
    
    console.log(`   ✅ Разрешений: ${permissionCount.rows[0].count}`);
    console.log(`   ✅ Связей ролей: ${rolePermissionCount.rows[0].count}`);
    console.log(`   ✅ Пользовательских разрешений: ${userPermissionCount.rows[0].count}`);

    // 5. Проверка уникальности
    console.log('\n5️⃣ Проверка уникальности');
    
    // Уникальные коды разрешений
    const duplicateCodes = await client.query(`
      SELECT code, COUNT(*) as count
      FROM "GpsPermission"
      GROUP BY code
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCodes.rows.length > 0) {
      console.log(`   ❌ Дубликаты кодов разрешений: ${duplicateCodes.rows.length}`);
    } else {
      console.log(`   ✅ Коды разрешений уникальны`);
    }

    // 6. Проверка ссылочной целостности
    console.log('\n6️⃣ Проверка ссылочной целостности');
    
    // Висячие ссылки в GpsRolePermission
    const orphanedRolePermissions = await client.query(`
      SELECT rp.id, rp.role, rp."permissionId"
      FROM "GpsRolePermission" rp
      LEFT JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE p.id IS NULL
    `);
    
    if (orphanedRolePermissions.rows.length > 0) {
      console.log(`   ❌ Висячие ссылки в GpsRolePermission: ${orphanedRolePermissions.rows.length}`);
    } else {
      console.log(`   ✅ Ссылочная целостность GpsRolePermission в порядке`);
    }

    // 7. Проверка ограничений
    console.log('\n7️⃣ Проверка ограничений');
    
    // Проверяем, что все разрешения имеют корректные коды
    const invalidCodes = await client.query(`
      SELECT code FROM "GpsPermission" 
      WHERE code NOT LIKE 'gps.%' OR code = 'gps.' OR code LIKE 'gps..%'
    `);
    
    if (invalidCodes.rows.length > 0) {
      console.log(`   ❌ Некорректные коды: ${invalidCodes.rows.length}`);
      invalidCodes.rows.forEach(row => {
        console.log(`      - ${row.code}`);
      });
    } else {
      console.log(`   ✅ Все коды разрешений корректны`);
    }

    // 8. Проверка производительности
    console.log('\n8️⃣ Проверка производительности');
    
    const startTime = Date.now();
    
    // Тестовый запрос
    await client.query(`
      SELECT rp.allowed
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = $1 AND p.code = $2
    `, ['COACH', 'gps.reports.view']);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    console.log(`   ✅ Время тестового запроса: ${queryTime}ms`);
    
    if (queryTime > 100) {
      console.log(`   ⚠️  Медленный запрос: ${queryTime}ms > 100ms`);
    } else {
      console.log(`   ✅ Производительность в норме`);
    }

    // 9. Проверка статистики
    console.log('\n9️⃣ Проверка статистики');
    
    // Статистика по ролям
    const roleStats = await client.query(`
      SELECT role, COUNT(*) as count
      FROM "GpsRolePermission"
      WHERE allowed = true
      GROUP BY role
      ORDER BY count DESC
    `);
    
    console.log(`   ✅ Статистика разрешений по ролям:`);
    roleStats.rows.forEach(row => {
      console.log(`      ${row.role}: ${row.count} разрешений`);
    });

    // Статистика по категориям
    const categoryStats = await client.query(`
      SELECT category, COUNT(*) as count
      FROM "GpsPermission"
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log(`   ✅ Статистика разрешений по категориям:`);
    categoryStats.rows.forEach(row => {
      console.log(`      ${row.category}: ${row.count} разрешений`);
    });

    console.log('\n🎉 Проверка целостности базы данных завершена!');

  } catch (error) {
    console.error('❌ Критическая ошибка проверки целостности:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabaseIntegrity();
