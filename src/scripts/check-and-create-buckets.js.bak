// Скрипт для проверки и создания бакетов Supabase при запуске приложения
console.log('Запуск скрипта проверки бакетов Supabase...');

async function runBucketCheck() {
  try {
    // Используем fetch для выполнения запроса к API
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/check-buckets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('Ошибка при проверке бакетов:', response.statusText);
      const errorData = await response.json().catch(() => ({}));
      console.error('Детали ошибки:', errorData);
      return;
    }
    
    const result = await response.json();
    console.log('Результат проверки бакетов:', result);
    console.log('Проверка бакетов Supabase успешно завершена');
  } catch (error) {
    console.error('Ошибка при выполнении скрипта проверки бакетов:', error);
  }
}

// Выполняем проверку
runBucketCheck(); 