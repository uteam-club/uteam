const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testConcurrentAccess() {
  try {
    console.log('🧪 Тестируем одновременный доступ к GPS разрешениям...\n');

    // 1. Тест множественных подключений
    console.log('1️⃣ Тест множественных подключений');
    
    const connectionCount = 10;
    const connections = [];
    
    // Создаем несколько подключений
    for (let i = 0; i < connectionCount; i++) {
      const client = await pool.connect();
      connections.push(client);
    }
    
    console.log(`   ✅ Создано ${connectionCount} подключений`);

    // 2. Тест одновременных чтений
    console.log('\n2️⃣ Тест одновременных чтений');
    
    const readPromises = connections.map(async (client, index) => {
      const startTime = Date.now();
      
      try {
        const result = await client.query(`
          SELECT rp.role, p.code, p.name, p.category
          FROM "GpsRolePermission" rp
          JOIN "GpsPermission" p ON rp."permissionId" = p.id
          WHERE rp.role = $1
          ORDER BY p.category, p.code
        `, ['COACH']);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: true,
          rowCount: result.rows.length
        };
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: false,
          error: error.message
        };
      }
    });
    
    const readResults = await Promise.all(readPromises);
    const successfulReads = readResults.filter(r => r.success).length;
    const avgReadTime = readResults.reduce((sum, r) => sum + r.duration, 0) / readResults.length;
    
    console.log(`   ✅ Успешных чтений: ${successfulReads}/${connectionCount}`);
    console.log(`   ✅ Среднее время чтения: ${avgReadTime.toFixed(2)}ms`);
    
    if (avgReadTime > 100) {
      console.log(`   ⚠️  Медленные чтения: ${avgReadTime.toFixed(2)}ms > 100ms`);
    }

    // 3. Тест одновременных записей
    console.log('\n3️⃣ Тест одновременных записей');
    
    const writePromises = connections.map(async (client, index) => {
      const startTime = Date.now();
      
      try {
        // Создаем временную запись для теста
        const testCode = `test.concurrent.${index}.${Date.now()}`;
        
        await client.query(`
          INSERT INTO "GpsPermission" (code, name, description, category)
          VALUES ($1, $2, $3, $4)
        `, [testCode, `Test ${index}`, `Test Description ${index}`, 'test']);
        
        // Удаляем тестовую запись
        await client.query(`
          DELETE FROM "GpsPermission" WHERE code = $1
        `, [testCode]);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: true
        };
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: false,
          error: error.message
        };
      }
    });
    
    const writeResults = await Promise.all(writePromises);
    const successfulWrites = writeResults.filter(r => r.success).length;
    const avgWriteTime = writeResults.reduce((sum, r) => sum + r.duration, 0) / writeResults.length;
    
    console.log(`   ✅ Успешных записей: ${successfulWrites}/${connectionCount}`);
    console.log(`   ✅ Среднее время записи: ${avgWriteTime.toFixed(2)}ms`);
    
    if (avgWriteTime > 200) {
      console.log(`   ⚠️  Медленные записи: ${avgWriteTime.toFixed(2)}ms > 200ms`);
    }

    // 4. Тест блокировок
    console.log('\n4️⃣ Тест блокировок');
    
    const lockTestPromises = connections.map(async (client, index) => {
      const startTime = Date.now();
      
      try {
        await client.query('BEGIN');
        
        // Блокируем таблицу для чтения
        await client.query('LOCK TABLE "GpsPermission" IN SHARE MODE');
        
        // Выполняем запрос
        const result = await client.query('SELECT COUNT(*) FROM "GpsPermission"');
        
        await client.query('COMMIT');
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: true,
          rowCount: result.rows[0].count
        };
        
      } catch (error) {
        await client.query('ROLLBACK');
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: false,
          error: error.message
        };
      }
    });
    
    const lockResults = await Promise.all(lockTestPromises);
    const successfulLocks = lockResults.filter(r => r.success).length;
    const avgLockTime = lockResults.reduce((sum, r) => sum + r.duration, 0) / lockResults.length;
    
    console.log(`   ✅ Успешных блокировок: ${successfulLocks}/${connectionCount}`);
    console.log(`   ✅ Среднее время блокировки: ${avgLockTime.toFixed(2)}ms`);

    // 5. Тест транзакций
    console.log('\n5️⃣ Тест транзакций');
    
    const transactionPromises = connections.map(async (client, index) => {
      const startTime = Date.now();
      
      try {
        await client.query('BEGIN');
        
        // Вставляем тестовую запись
        const testCode = `test.transaction.${index}.${Date.now()}`;
        await client.query(`
          INSERT INTO "GpsPermission" (code, name, description, category)
          VALUES ($1, $2, $3, $4)
        `, [testCode, `Transaction Test ${index}`, `Transaction Description ${index}`, 'test']);
        
        // Небольшая задержка для имитации работы
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Откатываем транзакцию
        await client.query('ROLLBACK');
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: true
        };
        
      } catch (error) {
        await client.query('ROLLBACK');
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: false,
          error: error.message
        };
      }
    });
    
    const transactionResults = await Promise.all(transactionPromises);
    const successfulTransactions = transactionResults.filter(r => r.success).length;
    const avgTransactionTime = transactionResults.reduce((sum, r) => sum + r.duration, 0) / transactionResults.length;
    
    console.log(`   ✅ Успешных транзакций: ${successfulTransactions}/${connectionCount}`);
    console.log(`   ✅ Среднее время транзакции: ${avgTransactionTime.toFixed(2)}ms`);

    // 6. Тест нагрузки
    console.log('\n6️⃣ Тест нагрузки');
    
    const loadTestConnections = 20;
    const loadTestIterations = 50;
    
    const loadTestPromises = Array.from({ length: loadTestConnections }, async (_, index) => {
      const client = await pool.connect();
      
      try {
        const startTime = Date.now();
        
        for (let i = 0; i < loadTestIterations; i++) {
          await client.query(`
            SELECT rp.allowed
            FROM "GpsRolePermission" rp
            JOIN "GpsPermission" p ON rp."permissionId" = p.id
            WHERE rp.role = $1 AND p.code = $2
          `, ['COACH', 'gps.reports.view']);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: true,
          iterations: loadTestIterations
        };
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          connection: index,
          duration,
          success: false,
          error: error.message,
          iterations: loadTestIterations
        };
      } finally {
        client.release();
      }
    });
    
    const loadResults = await Promise.all(loadTestPromises);
    const successfulLoads = loadResults.filter(r => r.success).length;
    const totalIterations = loadResults.reduce((sum, r) => sum + (r.iterations || 0), 0);
    const avgLoadTime = loadResults.reduce((sum, r) => sum + r.duration, 0) / loadResults.length;
    
    console.log(`   ✅ Успешных подключений: ${successfulLoads}/${loadTestConnections}`);
    console.log(`   ✅ Общее количество итераций: ${totalIterations}`);
    console.log(`   ✅ Среднее время: ${avgLoadTime.toFixed(2)}ms`);

    // 7. Тест ошибок подключения
    console.log('\n7️⃣ Тест ошибок подключения');
    
    const errorTestPromises = connections.map(async (client, index) => {
      try {
        // Попытка выполнить некорректный запрос
        await client.query('SELECT * FROM nonexistent_table');
        
        return {
          connection: index,
          success: false,
          error: 'Expected error not thrown'
        };
        
      } catch (error) {
        return {
          connection: index,
          success: true,
          error: error.message
        };
      }
    });
    
    const errorResults = await Promise.all(errorTestPromises);
    const successfulErrors = errorResults.filter(r => r.success).length;
    
    console.log(`   ✅ Корректно обработанных ошибок: ${successfulErrors}/${connectionCount}`);

    // 8. Очистка подключений
    console.log('\n8️⃣ Очистка подключений');
    
    for (const client of connections) {
      client.release();
    }
    
    console.log(`   ✅ Освобождено ${connections.length} подключений`);

    // 9. Итоговая статистика
    console.log('\n9️⃣ Итоговая статистика');
    
    const totalTests = readResults.length + writeResults.length + lockResults.length + transactionResults.length;
    const totalSuccessful = successfulReads + successfulWrites + successfulLocks + successfulTransactions;
    const successRate = (totalSuccessful / totalTests) * 100;
    
    console.log(`   📊 Общий успех: ${totalSuccessful}/${totalTests} (${successRate.toFixed(1)}%)`);
    console.log(`   📊 Чтения: ${successfulReads}/${readResults.length} (${(successfulReads/readResults.length*100).toFixed(1)}%)`);
    console.log(`   📊 Записи: ${successfulWrites}/${writeResults.length} (${(successfulWrites/writeResults.length*100).toFixed(1)}%)`);
    console.log(`   📊 Блокировки: ${successfulLocks}/${lockResults.length} (${(successfulLocks/lockResults.length*100).toFixed(1)}%)`);
    console.log(`   📊 Транзакции: ${successfulTransactions}/${transactionResults.length} (${(successfulTransactions/transactionResults.length*100).toFixed(1)}%)`);

    console.log('\n🎉 Тестирование одновременного доступа завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования одновременного доступа:', error);
  } finally {
    await pool.end();
  }
}

testConcurrentAccess();
