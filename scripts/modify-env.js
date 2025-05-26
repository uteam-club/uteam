// Скрипт для модификации .env файла
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function backupEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const backupPath = path.join(process.cwd(), '.env.backup');
  
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log(`Создана резервная копия .env → .env.backup`);
    return true;
  } else {
    console.error('Файл .env не найден!');
    return false;
  }
}

function updateEnvFileWithIPv4() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('Файл .env не найден!');
    return false;
  }
  
  // Делаем резервную копию перед изменением
  backupEnvFile();
  
  // Читаем содержимое .env файла
  const content = fs.readFileSync(envPath, 'utf-8');
  
  // Заменяем строку подключения, используя прямой IPv4 вместо доменного имени
  const updatedContent = content.replace(
    /DATABASE_URL="postgresql:\/\/postgres:(.+?)@db\.eprnjqohtlxxqufvofbr\.supabase\.co:5432\/postgres"/,
    'DATABASE_URL="postgresql://postgres:$1@56.228.58.37:5432/postgres"'
  );
  
  // Записываем обновленное содержимое обратно в файл
  fs.writeFileSync(envPath, updatedContent, 'utf-8');
  
  console.log('Файл .env обновлен с использованием прямого IPv4-адреса');
  return true;
}

// Интерактивное меню
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Меню настройки IPv4 для Supabase:');
console.log('1. Создать резервную копию .env файла');
console.log('2. Обновить .env для использования прямого IPv4-адреса');
console.log('3. Ввести пользовательский пароль для Supabase');
console.log('4. Восстановить .env из резервной копии');
console.log('5. Выход');

rl.question('Выберите действие (1-5): ', (answer) => {
  switch (answer) {
    case '1':
      backupEnvFile();
      break;
    case '2':
      updateEnvFileWithIPv4();
      break;
    case '3':
      rl.question('Введите пароль для пользователя postgres: ', (password) => {
        const envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
          console.error('Файл .env не найден!');
          rl.close();
          return;
        }
        
        // Делаем резервную копию перед изменением
        backupEnvFile();
        
        // Читаем содержимое .env файла
        const content = fs.readFileSync(envPath, 'utf-8');
        
        // Заменяем строку подключения с новым паролем
        const updatedContent = content.replace(
          /DATABASE_URL="postgresql:\/\/postgres:(.+?)@([^:]+):5432\/postgres"/,
          `DATABASE_URL="postgresql://postgres:${password}@56.228.58.37:5432/postgres"`
        );
        
        // Записываем обновленное содержимое обратно в файл
        fs.writeFileSync(envPath, updatedContent, 'utf-8');
        
        console.log('Файл .env обновлен с новым паролем и прямым IPv4-адресом');
        rl.close();
      });
      return;
    case '4':
      const backupPath = path.join(process.cwd(), '.env.backup');
      const envPath = path.join(process.cwd(), '.env');
      
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, envPath);
        console.log('Файл .env восстановлен из резервной копии');
      } else {
        console.error('Резервная копия .env.backup не найдена!');
      }
      break;
    case '5':
      console.log('Выход');
      break;
    default:
      console.log('Неверный выбор. Выход.');
  }
  
  rl.close();
});

rl.on('close', () => {
  console.log('Скрипт завершен.');
  process.exit(0);
}); 