// Тестовый файл для проверки доступа к базе данных через API-маршрут
const fetch = require('node-fetch');

async function testPrismaApi() {
  try {
    console.log('Проверка доступа к таблицам через API-маршрут...');
    
    // Запускаем тесты на получение данных из разных таблиц
    const tables = ['team', 'player', 'training'];
    
    for (const table of tables) {
      console.log(`\nПроверка таблицы: ${table}`);
      
      // Запрос на получение первых 10 записей из таблицы
      const result = await fetch('http://localhost:3000/api/prisma-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: table,
          action: 'findMany',
          take: 10,
        }),
      });
      
      if (!result.ok) {
        console.error(`Ошибка запроса для таблицы ${table}: ${result.status} ${result.statusText}`);
        continue;
      }
      
      const data = await result.json();
      
      if (Array.isArray(data)) {
        console.log(`Количество записей: ${data.length}`);
        if (data.length > 0) {
          console.log('Пример данных:', data[0]);
        }
      } else {
        console.log('Ответ:', data);
      }
    }
    
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

testPrismaApi(); 