// Скрипт для проверки оптимизации React-компонентов
const fs = require('fs');
const path = require('path');

// Путь к директории проекта
const projectPath = path.resolve(__dirname, '../../');
const srcPath = path.join(projectPath, 'src');

// Функция для поиска файлов в директории рекурсивно
function findFilesRecursively(dir, ext) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.')) {
      results = results.concat(findFilesRecursively(filePath, ext));
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  }
  
  return results;
}

console.log('Начинаем анализ оптимизации React-компонентов...\n');

// Поиск компонентов по расширениям файлов
const componentExtensions = ['.tsx', '.jsx'];
let componentFiles = [];

for (const ext of componentExtensions) {
  componentFiles = componentFiles.concat(findFilesRecursively(srcPath, ext));
}

console.log(`Найдено ${componentFiles.length} компонентов для анализа\n`);

// Счетчики для статистики
let issues = {
  inlineObjectCreation: 0,
  missingMemo: 0,
  inlineEventHandlers: 0,
  stateDependencies: 0,
  unnecessaryRerender: 0,
  heavyRender: 0
};

console.log('=== Анализ потенциальных проблем с производительностью ===\n');

// Проходим по каждому компоненту
for (const file of componentFiles) {
  const relativePath = path.relative(projectPath, file);
  const content = fs.readFileSync(file, 'utf8');
  
  let fileIssues = {};
  
  // 1. Проверка на создание объектов и функций внутри рендера
  const inlineObjectsRegex = /return\s*\([\s\S]*?{\s*.*?:\s*.*?\s*}/g;
  const inlineObjectMatches = content.match(inlineObjectsRegex);
  
  if (inlineObjectMatches && inlineObjectMatches.length > 0) {
    fileIssues.inlineObjectCreation = inlineObjectMatches.length;
    issues.inlineObjectCreation += inlineObjectMatches.length;
  }
  
  // 2. Проверка на отсутствие мемоизации компонентов
  const exportDefaultRegex = /export\s+default\s+function\s+([A-Z][A-Za-z0-9]*)/g;
  const memoRegex = /export\s+default\s+memo\(/g;
  
  if (exportDefaultRegex.test(content) && !memoRegex.test(content) && !content.includes('next/dynamic')) {
    fileIssues.missingMemo = 1;
    issues.missingMemo++;
  }
  
  // 3. Проверка на инлайн-обработчики событий
  const inlineHandlersRegex = /(onClick|onChange|onSubmit|onBlur|onFocus)\s*=\s*\{\s*\(\)\s*=>/g;
  const inlineHandlerMatches = content.match(inlineHandlersRegex);
  
  if (inlineHandlerMatches && inlineHandlerMatches.length > 0) {
    fileIssues.inlineEventHandlers = inlineHandlerMatches.length;
    issues.inlineEventHandlers += inlineHandlerMatches.length;
  }
  
  // 4. Проверка на зависимости состояния
  const useEffectRegex = /useEffect\(\s*\(\)\s*=>\s*{\s*[\s\S]*?\s*}\s*,\s*\[\s*([^\]]*)\s*\]\s*\)/g;
  const effectMatches = [...content.matchAll(useEffectRegex)];
  
  if (effectMatches.length > 0) {
    // Проверяем зависимости
    let stateDepIssues = 0;
    
    for (const match of effectMatches) {
      const dependencies = match[1];
      
      if (dependencies && dependencies.includes('setState')) {
        stateDepIssues++;
      }
    }
    
    if (stateDepIssues > 0) {
      fileIssues.stateDependencies = stateDepIssues;
      issues.stateDependencies += stateDepIssues;
    }
  }
  
  // 5. Проверка на ненужные ререндеры (большие компоненты без разделения)
  const renderContentSize = content.length;
  if (renderContentSize > 5000 && !content.includes('useMemo') && !content.includes('useCallback')) {
    fileIssues.heavyRender = 1;
    issues.heavyRender++;
  }
  
  // Выводим проблемы файла, если они есть
  const hasIssues = Object.values(fileIssues).some(count => count > 0);
  
  if (hasIssues) {
    console.log(`\nФайл: ${relativePath}`);
    
    if (fileIssues.inlineObjectCreation) {
      console.log(`  - Создание объектов внутри рендера: ${fileIssues.inlineObjectCreation}`);
    }
    
    if (fileIssues.missingMemo) {
      console.log(`  - Отсутствует мемоизация компонента`);
    }
    
    if (fileIssues.inlineEventHandlers) {
      console.log(`  - Инлайн-обработчики событий: ${fileIssues.inlineEventHandlers}`);
    }
    
    if (fileIssues.stateDependencies) {
      console.log(`  - Проблемы с зависимостями состояния: ${fileIssues.stateDependencies}`);
    }
    
    if (fileIssues.heavyRender) {
      console.log(`  - Тяжелый рендеринг без оптимизации (большой компонент)`);
    }
  }
}

// Выводим общую статистику
console.log('\n=== Итоговая статистика ===');
console.log(`- Создание объектов внутри рендера: ${issues.inlineObjectCreation}`);
console.log(`- Компоненты без мемоизации: ${issues.missingMemo}`);
console.log(`- Инлайн-обработчики событий: ${issues.inlineEventHandlers}`);
console.log(`- Проблемы с зависимостями состояния: ${issues.stateDependencies}`);
console.log(`- Тяжелые компоненты без оптимизации: ${issues.heavyRender}`);

console.log('\nРекомендации по оптимизации:');
console.log('1. Выносите создание объектов и функций за пределы рендер-функции с помощью useMemo и useCallback');
console.log('2. Используйте React.memo для мемоизации компонентов, чтобы предотвратить лишние ререндеры');
console.log('3. Выносите обработчики событий в отдельные функции с useCallback');
console.log('4. Избегайте использования setState в зависимостях useEffect');
console.log('5. Разделяйте большие компоненты на более мелкие и используйте мемоизацию'); 