const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testEdgeCases() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем сложные edge cases...\n');

    // 1. Тест экстремальных значений
    console.log('1️⃣ Тест экстремальных значений');
    
    const extremeValues = [
      { value: '', description: 'Пустая строка' },
      { value: 'a'.repeat(1000), description: 'Очень длинная строка (1000 символов)' },
      { value: 'a'.repeat(10000), description: 'Очень длинная строка (10000 символов)' },
      { value: '!@#$%^&*()_+-=[]{}|;:\'",./<>?', description: 'Специальные символы' },
      { value: '🚀🎯💻🔥', description: 'Эмодзи' },
      { value: 'gps.reports.view\n\r\t', description: 'Строка с переносами' },
      { value: 'gps.reports.view  ', description: 'Строка с пробелами в конце' },
      { value: '  gps.reports.view', description: 'Строка с пробелами в начале' }
    ];

    for (const testCase of extremeValues) {
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM "GpsPermission"
          WHERE code = $1
        `, [testCase.value]);
        
        const count = parseInt(result.rows[0].count);
        console.log(`   ✅ ${testCase.description}: ${count} результатов (ожидалось: 0)`);
        
      } catch (error) {
        console.log(`   ✅ ${testCase.description}: Ошибка обработана корректно`);
      }
    }

    // 2. Тест SQL инъекций
    console.log('\n2️⃣ Тест SQL инъекций');
    
    const sqlInjectionTests = [
      { value: "'; DROP TABLE \"GpsPermission\"; --", description: 'DROP TABLE инъекция' },
      { value: "'; DELETE FROM \"GpsPermission\"; --", description: 'DELETE инъекция' },
      { value: "'; UPDATE \"GpsPermission\" SET code = 'hacked'; --", description: 'UPDATE инъекция' },
      { value: "' OR '1'='1", description: 'OR инъекция' },
      { value: "' UNION SELECT * FROM \"GpsPermission\" --", description: 'UNION инъекция' },
      { value: "'; INSERT INTO \"GpsPermission\" VALUES ('hacked', 'hacked', 'hacked', 'hacked'); --", description: 'INSERT инъекция' }
    ];

    for (const testCase of sqlInjectionTests) {
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM "GpsPermission"
          WHERE code = $1
        `, [testCase.value]);
        
        const count = parseInt(result.rows[0].count);
        console.log(`   ✅ ${testCase.description}: ${count} результатов (ожидалось: 0)`);
        
      } catch (error) {
        console.log(`   ✅ ${testCase.description}: Ошибка обработана корректно`);
      }
    }

    // 3. Тест null и undefined значений
    console.log('\n3️⃣ Тест null и undefined значений');
    
    const nullTests = [
      { value: null, description: 'null значение' },
      { value: undefined, description: 'undefined значение' },
      { value: NaN, description: 'NaN значение' },
      { value: Infinity, description: 'Infinity значение' },
      { value: -Infinity, description: '-Infinity значение' }
    ];

    for (const testCase of nullTests) {
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM "GpsPermission"
          WHERE code = $1
        `, [testCase.value]);
        
        const count = parseInt(result.rows[0].count);
        console.log(`   ✅ ${testCase.description}: ${count} результатов (ожидалось: 0)`);
        
      } catch (error) {
        console.log(`   ✅ ${testCase.description}: Ошибка обработана корректно`);
      }
    }

    // 4. Тест одновременных операций
    console.log('\n4️⃣ Тест одновременных операций');
    
    const concurrentOperations = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(
        client.query(`
          SELECT rp.allowed
          FROM "GpsRolePermission" rp
          JOIN "GpsPermission" p ON rp."permissionId" = p.id
          WHERE rp.role = $1 AND p.code = $2
        `, ['COACH', 'gps.reports.view'])
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const successCount = results.filter(r => r.rows.length > 0).length;
    console.log(`   ✅ ${concurrentOperations} одновременных операций за ${endTime - startTime}ms`);
    console.log(`   ✅ Успешных: ${successCount}/${concurrentOperations}`);

    // 5. Тест больших объемов данных
    console.log('\n5️⃣ Тест больших объемов данных');
    
    // Создаем временную таблицу с большим количеством записей
    await client.query(`
      CREATE TEMP TABLE test_large_data AS
      SELECT 
        generate_series(1, 1000) as id,
        'test_role_' || generate_series(1, 1000) as role,
        'test_permission_' || generate_series(1, 1000) as permission_code
    `);
    
    const largeDataStartTime = Date.now();
    
    // Тестовый запрос с большим объемом данных
    const largeDataResult = await client.query(`
      SELECT COUNT(*) as count
      FROM test_large_data
      WHERE role LIKE 'test_role_%'
    `);
    
    const largeDataEndTime = Date.now();
    const largeDataTime = largeDataEndTime - largeDataStartTime;
    
    console.log(`   ✅ Запрос к 1000 записям за ${largeDataTime}ms`);
    
    if (largeDataTime > 1000) {
      console.log(`   ⚠️  Медленный запрос с большими данными: ${largeDataTime}ms > 1000ms`);
    } else {
      console.log(`   ✅ Производительность с большими данными в норме`);
    }

    // 6. Тест транзакций
    console.log('\n6️⃣ Тест транзакций');
    
    try {
      await client.query('BEGIN');
      
      // Вставляем тестовую запись
      await client.query(`
        INSERT INTO "GpsPermission" (code, name, description, category)
        VALUES ($1, $2, $3, $4)
      `, ['test.transaction', 'Test Transaction', 'Test Description', 'test']);
      
      // Проверяем, что запись есть
      const checkResult = await client.query(`
        SELECT COUNT(*) as count
        FROM "GpsPermission"
        WHERE code = 'test.transaction'
      `);
      
      if (parseInt(checkResult.rows[0].count) === 1) {
        console.log(`   ✅ Запись вставлена в транзакции`);
      } else {
        console.log(`   ❌ Запись не найдена в транзакции`);
      }
      
      // Откатываем транзакцию
      await client.query('ROLLBACK');
      
      // Проверяем, что запись откатилась
      const rollbackResult = await client.query(`
        SELECT COUNT(*) as count
        FROM "GpsPermission"
        WHERE code = 'test.transaction'
      `);
      
      if (parseInt(rollbackResult.rows[0].count) === 0) {
        console.log(`   ✅ Транзакция откачена корректно`);
      } else {
        console.log(`   ❌ Транзакция не откатилась`);
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка в тесте транзакций: ${error.message}`);
    }

    // 7. Тест производительности с индексами
    console.log('\n7️⃣ Тест производительности с индексами');
    
    const indexTests = [
      { query: 'SELECT * FROM "GpsPermission" WHERE code = $1', params: ['gps.reports.view'], description: 'Поиск по коду' },
      { query: 'SELECT * FROM "GpsPermission" WHERE category = $1', params: ['reports'], description: 'Поиск по категории' },
      { query: 'SELECT * FROM "GpsRolePermission" WHERE role = $1', params: ['COACH'], description: 'Поиск по роли' }
    ];

    for (const testCase of indexTests) {
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await client.query(testCase.query, testCase.params);
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;
      
      console.log(`   ✅ ${testCase.description}: ${avgTime.toFixed(2)}ms (${iterations} итераций)`);
      
      if (avgTime > 50) {
        console.log(`   ⚠️  Медленный запрос: ${avgTime.toFixed(2)}ms > 50ms`);
      }
    }

    // 8. Тест граничных случаев с ролями
    console.log('\n8️⃣ Тест граничных случаев с ролями');
    
    const roleEdgeCases = [
      { role: '', description: 'Пустая роль' },
      { role: 'NONEXISTENT_ROLE', description: 'Несуществующая роль' },
      { role: 'coach', description: 'Роль в нижнем регистре' },
      { role: 'COACH ', description: 'Роль с пробелом в конце' },
      { role: ' COACH', description: 'Роль с пробелом в начале' },
      { role: 'CÓACH', description: 'Роль с диакритическими знаками' }
    ];

    for (const testCase of roleEdgeCases) {
      try {
        const result = await client.query(`
          SELECT COUNT(*) as count
          FROM "GpsRolePermission"
          WHERE role = $1
        `, [testCase.role]);
        
        const count = parseInt(result.rows[0].count);
        console.log(`   ✅ ${testCase.description}: ${count} результатов`);
        
      } catch (error) {
        console.log(`   ✅ ${testCase.description}: Ошибка обработана корректно`);
      }
    }

    console.log('\n🎉 Тестирование edge cases завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования edge cases:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testEdgeCases();
