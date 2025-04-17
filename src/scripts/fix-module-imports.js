// Скрипт для исправления проблем с импортами модулей в Next.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Путь к директории проекта
const projectPath = path.resolve(__dirname, '../../');
const nextCachePath = path.join(projectPath, '.next');

console.log('Начинаем анализ и исправление проблем с импортами модулей...\n');

// Функция для очистки кеша Next.js
function cleanNextCache() {
  console.log('Очистка кеша Next.js...');
  try {
    execSync('rm -rf .next', { cwd: projectPath });
    console.log('✅ Кеш .next успешно очищен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при очистке кеша .next:', error.message);
    return false;
  }
}

// Функция для запуска TypeScript с проверкой типов для поиска проблем с импортами
function findTypeScriptImportIssues() {
  console.log('\nПоиск проблем с импортами в TypeScript...');
  try {
    execSync('npx tsc --noEmit', { cwd: projectPath, stdio: 'pipe' });
    console.log('✅ Проблем с импортами TypeScript не обнаружено');
    return [];
  } catch (error) {
    console.log('⚠️ Обнаружены проблемы с импортами TypeScript');
    
    // Извлекаем ошибки из вывода TypeScript
    const output = error.stdout.toString();
    const lines = output.split('\n');
    
    // Ищем строки с ошибками импорта
    const importErrors = lines.filter(line => 
      line.includes('Cannot find module') || 
      line.includes('could not be resolved') ||
      line.includes('has no exported member')
    );
    
    if (importErrors.length > 0) {
      console.log(`Найдено ${importErrors.length} проблем с импортами:`);
      importErrors.forEach((line, i) => {
        console.log(`${i + 1}. ${line}`);
      });
    } else {
      console.log('Специфических проблем с импортами не обнаружено, но есть другие ошибки TypeScript');
    }
    
    return importErrors;
  }
}

// Функция для проверки проблем с пакетами node_modules
function checkNodeModulesProblems() {
  console.log('\nПроверка проблем с node_modules...');
  
  // Проверяем наличие папки node_modules
  if (!fs.existsSync(path.join(projectPath, 'node_modules'))) {
    console.log('❌ Папка node_modules не найдена. Необходимо выполнить npm install');
    return false;
  }
  
  // Проверяем несоответствия между package.json и node_modules
  try {
    console.log('Проверка целостности зависимостей...');
    execSync('npm ls --depth=0', { cwd: projectPath, stdio: 'pipe' });
    console.log('✅ Все зависимости установлены корректно');
    return true;
  } catch (error) {
    console.log('⚠️ Обнаружены проблемы с зависимостями:');
    const output = error.stdout ? error.stdout.toString() : '';
    
    if (output.includes('missing:') || output.includes('invalid:')) {
      console.log(output);
    } else {
      console.log('Несоответствие между package.json и установленными пакетами');
    }
    
    return false;
  }
}

// Функция для проверки и обновления зависимостей Next.js
function updateNextDependencies() {
  console.log('\nПроверка зависимостей Next.js...');
  
  // Читаем package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Проверяем версию Next.js
  const nextVersion = packageJson.dependencies.next;
  console.log(`Текущая версия Next.js: ${nextVersion}`);
  
  // Проверяем согласованность версий зависимостей Next.js
  const reactVersion = packageJson.dependencies.react;
  const reactDomVersion = packageJson.dependencies['react-dom'];
  
  console.log(`React: ${reactVersion}`);
  console.log(`React DOM: ${reactDomVersion}`);
  
  // Проверяем совместимость версий
  const nextMajorVersion = parseInt(nextVersion.match(/(\d+)\./)[1], 10);
  
  if (nextMajorVersion >= 13) {
    const recommendedReactVersion = '18.2.0';
    if (reactVersion !== recommendedReactVersion || reactDomVersion !== recommendedReactVersion) {
      console.log(`⚠️ Рекомендуемая версия React для Next.js ${nextMajorVersion}.x: ${recommendedReactVersion}`);
      console.log('Рекомендуется обновить React и React DOM до совместимой версии');
    } else {
      console.log('✅ Версии React и React DOM совместимы с Next.js');
    }
  }
  
  return {
    next: nextVersion,
    react: reactVersion,
    reactDom: reactDomVersion
  };
}

// Функция для улучшения Next.js конфигурации
function improveNextConfig() {
  console.log('\nАнализ конфигурации Next.js...');
  
  const nextConfigPath = path.join(projectPath, 'next.config.js');
  
  if (!fs.existsSync(nextConfigPath)) {
    console.log('❌ Файл next.config.js не найден');
    return false;
  }
  
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Проверка на наличие важных настроек
  const checkpoints = {
    transpilePackages: nextConfig.includes('transpilePackages'),
    outputStandalone: nextConfig.includes('output: "standalone"'),
    staticPageGeneration: nextConfig.includes('output: "export"'),
    reactStrictMode: nextConfig.includes('reactStrictMode:'),
    poweredByHeader: nextConfig.includes('poweredByHeader:'),
    moduleSizeOptimization: nextConfig.includes('modularizeImports'),
    swcMinify: nextConfig.includes('swcMinify:'),
  };
  
  console.log('Анализ next.config.js:');
  console.log(`- transpilePackages: ${checkpoints.transpilePackages ? '✅' : '❌'}`);
  console.log(`- Standalone Output: ${checkpoints.outputStandalone ? '✅' : '❌'}`);
  console.log(`- Static Page Generation: ${checkpoints.staticPageGeneration ? '✅' : '❌'}`);
  console.log(`- React Strict Mode: ${checkpoints.reactStrictMode ? '✅' : '❌'}`);
  console.log(`- Powered By Header: ${checkpoints.poweredByHeader ? '✅' : '❌'}`);
  console.log(`- Module Size Optimization: ${checkpoints.moduleSizeOptimization ? '✅' : '❌'}`);
  console.log(`- SWC Minify: ${checkpoints.swcMinify ? '✅' : '❌'}`);
  
  // Даем рекомендации по улучшению конфигурации
  console.log('\nРекомендации по конфигурации Next.js:');
  
  if (!checkpoints.transpilePackages) {
    console.log('- Добавьте transpilePackages для пакетов, требующих транспиляции');
  }
  
  if (!checkpoints.reactStrictMode) {
    console.log('- Включите reactStrictMode: true для раннего обнаружения проблем');
  }
  
  if (!checkpoints.poweredByHeader) {
    console.log('- Установите poweredByHeader: false для безопасности');
  }
  
  if (!checkpoints.swcMinify) {
    console.log('- Включите swcMinify: true для более эффективной минификации');
  }
  
  if (!checkpoints.moduleSizeOptimization) {
    console.log('- Рассмотрите использование modularizeImports для оптимизации размера бандла');
  }
  
  return true;
}

// Основная функция для исправления проблем
async function fixModuleIssues() {
  console.log('=== Стратегия исправления проблем с модулями ===\n');
  
  // 1. Очистка кеша Next.js
  if (cleanNextCache()) {
    console.log('✓ Шаг 1: Кеш Next.js успешно очищен\n');
  } else {
    console.log('✗ Шаг 1: Проблемы при очистке кеша Next.js\n');
  }
  
  // 2. Проверка проблем с импортами TypeScript
  const importIssues = findTypeScriptImportIssues();
  if (importIssues.length === 0) {
    console.log('✓ Шаг 2: Проблем с импортами TypeScript не обнаружено\n');
  } else {
    console.log(`✗ Шаг 2: Обнаружено ${importIssues.length} проблем с импортами TypeScript\n`);
  }
  
  // 3. Проверка проблем с node_modules
  if (checkNodeModulesProblems()) {
    console.log('✓ Шаг 3: Проблем с node_modules не обнаружено\n');
  } else {
    console.log('✗ Шаг 3: Обнаружены проблемы с node_modules\n');
    
    // Спрашиваем пользователя, хочет ли он переустановить node_modules
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Хотите ли выполнить "npm ci" для переустановки node_modules? (y/n): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\nПереустановка node_modules...');
      try {
        execSync('npm ci', { cwd: projectPath, stdio: 'inherit' });
        console.log('✅ node_modules успешно переустановлены');
      } catch (error) {
        console.error('❌ Ошибка при переустановке node_modules:', error.message);
      }
    }
  }
  
  // 4. Проверка и обновление зависимостей Next.js
  const dependencies = updateNextDependencies();
  console.log('✓ Шаг 4: Проверка зависимостей Next.js завершена\n');
  
  // 5. Улучшение Next.js конфигурации
  improveNextConfig();
  console.log('✓ Шаг 5: Анализ конфигурации Next.js завершен\n');
  
  // Заключение
  console.log('=== Заключение ===');
  console.log('Если проблемы с импортами модулей сохраняются, попробуйте:');
  console.log('1. Перезапустить сервер разработки: npm run dev');
  console.log('2. Обновить Next.js и зависимости: npm update next react react-dom');
  console.log('3. Запустить сборку и проверить ошибки: npm run build');
  console.log('4. Проверить согласованность зависимостей: npm ls next react react-dom');
  console.log('5. Проверить настройки .babelrc или jsconfig.json на предмет проблем с путями');
}

// Запуск основной функции
fixModuleIssues(); 