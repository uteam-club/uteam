#!/usr/bin/env node

// Скрипт для полной оптимизации проекта
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Путь к директории проекта
const projectPath = path.resolve(__dirname, '../../');

// Функция для выполнения команды
function executeCommand(command, options = {}) {
  console.log(`\nВыполнение: ${command}`);
  try {
    const output = execSync(command, {
      cwd: projectPath,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options
    });
    if (options.silent) {
      return { success: true, output };
    }
    return { success: true };
  } catch (error) {
    console.error(`❌ Ошибка при выполнении команды: ${command}`);
    if (options.silent) {
      return { success: false, error: error.message, output: error.stdout };
    }
    return { success: false, error: error.message };
  }
}

// Функция для запроса подтверждения от пользователя
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/n): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Основная функция оптимизации
async function optimizeProject() {
  console.log('=== 🚀 Начинаем полную оптимизацию проекта UTEAM ===\n');
  
  // Подготовка окружения
  console.log('1. Подготовка окружения');
  
  // Очистка кеша
  console.log('Очистка кеша Next.js...');
  executeCommand('rm -rf .next');
  
  // Проверка зависимостей
  console.log('Проверка зависимостей...');
  const depsResult = executeCommand('npm ls --depth=0', { silent: true });
  
  if (!depsResult.success && depsResult.output && depsResult.output.includes('missing:')) {
    console.log('⚠️ Обнаружены отсутствующие зависимости');
    
    const shouldInstall = await confirm('Установить отсутствующие зависимости?');
    
    if (shouldInstall) {
      console.log('Установка зависимостей...');
      executeCommand('npm install');
    }
  }
  
  // Исправление проблем с модулями
  console.log('\n2. Исправление проблем с модулями');
  executeCommand('node src/scripts/fix-module-imports.js');
  
  // Оптимизация React-компонентов
  console.log('\n3. Оптимизация React-компонентов');
  
  // Поиск и исправление дублирующихся ключей
  console.log('Анализ и исправление дублирующихся ключей...');
  
  // Редактируем файл fix-duplicate-keys.js для включения автоматического исправления
  const fixKeysPath = path.join(projectPath, 'src/scripts/fix-duplicate-keys.js');
  if (fs.existsSync(fixKeysPath)) {
    let content = fs.readFileSync(fixKeysPath, 'utf8');
    content = content.replace('autoFix: false', 'autoFix: true');
    fs.writeFileSync(fixKeysPath, content, 'utf8');
  }
  
  executeCommand('node src/scripts/fix-duplicate-keys.js');
  
  // Оптимизация React-компонентов
  console.log('Применение мемоизации и других оптимизаций...');
  executeCommand('node src/scripts/optimize-react-components.js');
  
  // Проверка оптимизаций
  console.log('\n4. Проверка результатов оптимизации');
  executeCommand('node src/scripts/check-react-optimizations.js');
  
  // Сборка проекта для проверки ошибок
  console.log('\n5. Сборка проекта для проверки ошибок');
  
  const shouldBuild = await confirm('Запустить процесс сборки для проверки ошибок?');
  
  if (shouldBuild) {
    console.log('Запуск сборки...');
    executeCommand('npm run build');
  }
  
  // Запуск проекта
  console.log('\n6. Запуск проекта');
  
  const shouldStart = await confirm('Запустить проект для проверки оптимизаций?');
  
  if (shouldStart) {
    console.log('Запуск проекта...');
    executeCommand('npm run dev');
  } else {
    console.log('\n✨ Оптимизация завершена!');
    console.log('Для запуска проекта выполните команду: npm run dev');
    console.log('Для получения дополнительной информации см. OPTIMIZATION.md');
  }
}

// Запуск функции оптимизации
optimizeProject().catch(error => {
  console.error('Ошибка при оптимизации проекта:', error);
  process.exit(1);
}); 