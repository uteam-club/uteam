const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testPerformance() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем производительность GPS разрешений...\n');

    // 1. Тест базовых запросов
    console.log('1️⃣ Тест базовых запросов');
    
    const basicQueries = [
      {
        name: 'Получение всех разрешений',
        query: 'SELECT * FROM "GpsPermission" ORDER BY category, code',
        iterations: 10
      },
      {
        name: 'Получение разрешений роли',
        query: 'SELECT * FROM "GpsRolePermission" WHERE role = $1',
        params: ['COACH'],
        iterations: 50
      },
      {
        name: 'Проверка конкретного разрешения',
        query: 'SELECT rp.allowed FROM "GpsRolePermission" rp JOIN "GpsPermission" p ON rp."permissionId" = p.id WHERE rp.role = $1 AND p.code = $2',
        params: ['COACH', 'gps.reports.view'],
        iterations: 100
      },
      {
        name: 'Получение разрешений по категории',
        query: 'SELECT * FROM "GpsPermission" WHERE category = $1',
        params: ['reports'],
        iterations: 50
      }
    ];

    for (const test of basicQueries) {
      const startTime = Date.now();
      
      for (let i = 0; i < test.iterations; i++) {
        await client.query(test.query, test.params || []);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / test.iterations;
      
      console.log(`   ✅ ${test.name}: ${avgTime.toFixed(2)}ms (${test.iterations} итераций)`);
      
      if (avgTime > 100) {
        console.log(`   ⚠️  Медленный запрос: ${avgTime.toFixed(2)}ms > 100ms`);
      }
    }

    // 2. Тест сложных запросов
    console.log('\n2️⃣ Тест сложных запросов');
    
    const complexQueries = [
      {
        name: 'Разрешения роли с деталями',
        query: `
          SELECT rp.role, p.code, p.name, p.category, rp.allowed
          FROM "GpsRolePermission" rp
          JOIN "GpsPermission" p ON rp."permissionId" = p.id
          WHERE rp.role = $1
          ORDER BY p.category, p.code
        `,
        params: ['COACH'],
        iterations: 20
      },
      {
        name: 'Статистика по ролям',
        query: `
          SELECT role, COUNT(*) as count
          FROM "GpsRolePermission"
          WHERE allowed = true
          GROUP BY role
          ORDER BY count DESC
        `,
        iterations: 10
      },
      {
        name: 'Статистика по категориям',
        query: `
          SELECT category, COUNT(*) as count
          FROM "GpsPermission"
          GROUP BY category
          ORDER BY count DESC
        `,
        iterations: 10
      }
    ];

    for (const test of complexQueries) {
      const startTime = Date.now();
      
      for (let i = 0; i < test.iterations; i++) {
        await client.query(test.query, test.params || []);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / test.iterations;
      
      console.log(`   ✅ ${test.name}: ${avgTime.toFixed(2)}ms (${test.iterations} итераций)`);
      
      if (avgTime > 200) {
        console.log(`   ⚠️  Медленный сложный запрос: ${avgTime.toFixed(2)}ms > 200ms`);
      }
    }

    // 3. Тест производительности с EXPLAIN
    console.log('\n3️⃣ Анализ планов выполнения');
    
    const explainQueries = [
      {
        name: 'Проверка разрешения',
        query: 'SELECT rp.allowed FROM "GpsRolePermission" rp JOIN "GpsPermission" p ON rp."permissionId" = p.id WHERE rp.role = $1 AND p.code = $2',
        params: ['COACH', 'gps.reports.view']
      },
      {
        name: 'Получение разрешений роли',
        query: 'SELECT * FROM "GpsRolePermission" WHERE role = $1',
        params: ['COACH']
      },
      {
        name: 'Поиск по коду разрешения',
        query: 'SELECT * FROM "GpsPermission" WHERE code = $1',
        params: ['gps.reports.view']
      }
    ];

    for (const test of explainQueries) {
      try {
        const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS) ${test.query}`, test.params);
        const plan = result.rows[0]['QUERY PLAN'];
        
        console.log(`   📊 ${test.name}:`);
        console.log(`      ${plan}`);
        
        if (plan.includes('Index Scan')) {
          console.log(`      ✅ Используется индекс`);
        } else if (plan.includes('Seq Scan')) {
          console.log(`      ⚠️  Последовательное сканирование`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${test.name}: Ошибка EXPLAIN - ${error.message}`);
      }
    }

    // 4. Тест нагрузки
    console.log('\n4️⃣ Тест нагрузки');
    
    const loadTests = [
      { concurrent: 5, iterations: 20, description: 'Низкая нагрузка' },
      { concurrent: 10, iterations: 50, description: 'Средняя нагрузка' },
      { concurrent: 20, iterations: 100, description: 'Высокая нагрузка' }
    ];

    for (const loadTest of loadTests) {
      console.log(`   🚀 ${loadTest.description} (${loadTest.concurrent} одновременных, ${loadTest.iterations} итераций)`);
      
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < loadTest.concurrent; i++) {
        const promise = (async () => {
          for (let j = 0; j < loadTest.iterations / loadTest.concurrent; j++) {
            await client.query(`
              SELECT rp.allowed
              FROM "GpsRolePermission" rp
              JOIN "GpsPermission" p ON rp."permissionId" = p.id
              WHERE rp.role = $1 AND p.code = $2
            `, ['COACH', 'gps.reports.view']);
          }
        })();
        promises.push(promise);
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / loadTest.iterations;
      
      console.log(`      ✅ Общее время: ${totalTime}ms, среднее: ${avgTime.toFixed(2)}ms`);
      
      if (avgTime > 50) {
        console.log(`      ⚠️  Медленная обработка: ${avgTime.toFixed(2)}ms > 50ms`);
      }
    }

    // 5. Тест памяти
    console.log('\n5️⃣ Тест использования памяти');
    
    const memoryTestIterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < memoryTestIterations; i++) {
      await client.query(`
        SELECT rp.role, p.code, p.name, p.category
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1
      `, ['COACH']);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / memoryTestIterations;
    
    console.log(`   ✅ ${memoryTestIterations} запросов за ${totalTime}ms`);
    console.log(`   ✅ Среднее время: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 100) {
      console.log(`   ⚠️  Проблемы с памятью: ${avgTime.toFixed(2)}ms > 100ms`);
    }

    // 6. Тест индексов
    console.log('\n6️⃣ Тест эффективности индексов');
    
    const indexTests = [
      {
        name: 'Поиск по коду разрешения',
        query: 'SELECT * FROM "GpsPermission" WHERE code = $1',
        params: ['gps.reports.view'],
        iterations: 100
      },
      {
        name: 'Поиск по категории',
        query: 'SELECT * FROM "GpsPermission" WHERE category = $1',
        params: ['reports'],
        iterations: 100
      },
      {
        name: 'Поиск по роли',
        query: 'SELECT * FROM "GpsRolePermission" WHERE role = $1',
        params: ['COACH'],
        iterations: 100
      }
    ];

    for (const test of indexTests) {
      const startTime = Date.now();
      
      for (let i = 0; i < test.iterations; i++) {
        await client.query(test.query, test.params);
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / test.iterations;
      
      console.log(`   ✅ ${test.name}: ${avgTime.toFixed(2)}ms`);
      
      if (avgTime > 50) {
        console.log(`   ⚠️  Медленный поиск: ${avgTime.toFixed(2)}ms > 50ms`);
      }
    }

    // 7. Рекомендации по оптимизации
    console.log('\n7️⃣ Рекомендации по оптимизации');
    
    // Проверяем статистику таблиц
    const tableStats = await client.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      WHERE tablename LIKE 'Gps%Permission%'
      ORDER BY tablename
    `);
    
    console.log(`   📊 Статистика таблиц:`);
    tableStats.rows.forEach(row => {
      console.log(`      ${row.tablename}: ${row.live_tuples} живых записей, ${row.dead_tuples} мертвых записей`);
    });

    // Проверяем размер таблиц
    const tableSizes = await client.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE tablename LIKE 'Gps%Permission%'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    console.log(`   📏 Размеры таблиц:`);
    tableSizes.rows.forEach(row => {
      console.log(`      ${row.tablename}: ${row.size}`);
    });

    console.log('\n🎉 Тестирование производительности завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования производительности:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPerformance();
