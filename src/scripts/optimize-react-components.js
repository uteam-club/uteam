// Скрипт для оптимизации React-компонентов
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Путь к директории проекта
const projectPath = path.resolve(__dirname, '../../');
const srcPath = path.join(projectPath, 'src');

// Конфигурация
const CONFIG = {
  // Автоматически применять изменения
  autoFix: true,
  
  // Компоненты, исключенные из автоматической оптимизации (например, страницы Next.js)
  excludedComponents: [
    'layout.tsx',
    'page.tsx',
    'template.tsx',
    'loading.tsx',
    'not-found.tsx',
    'error.tsx',
    'route.tsx'
  ],
  
  // Оптимизации для применения
  optimizations: {
    // Добавление React.memo для компонентов
    memoize: true,
    
    // Добавление useCallback для обработчиков событий
    useCallback: true,
    
    // Добавление useMemo для вычисляемых значений
    useMemo: true
  }
};

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

// Функция для определения, нуждается ли файл в оптимизации
function needsOptimization(filePath) {
  // Исключаем файлы из списка исключений
  const fileName = path.basename(filePath);
  
  if (CONFIG.excludedComponents.some(excluded => fileName.endsWith(excluded))) {
    return false;
  }
  
  return true;
}

// Функция для применения мемоизации к компоненту
function applyMemoization(content) {
  // Проверяем, нужна ли мемоизация (не применена ли уже)
  if (content.includes('export default memo(') || content.includes('memo(') && content.includes('export default')) {
    return { content, applied: false };
  }
  
  // Находим экспорт по умолчанию функционального компонента
  const exportDefaultRegex = /export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/;
  const exportDefaultMatch = content.match(exportDefaultRegex);
  
  // Находим именованный функциональный компонент с последующим экспортом
  const namedComponentRegex = /function\s+([A-Z][A-Za-z0-9_]*)[^{]*{[\s\S]*?}\s*export\s+default\s+\1/;
  const namedComponentMatch = content.match(namedComponentRegex);
  
  // Находим компонент-стрелочную функцию
  const arrowComponentRegex = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(\([^)]*\)|[^=]*)\s*=>\s*{[\s\S]*?}\s*export\s+default\s+\1/;
  const arrowComponentMatch = content.match(arrowComponentRegex);
  
  let modified = content;
  let applied = false;
  
  // Добавляем импорт memo, если его нет
  if (!content.includes('import { memo }') && !content.includes('import {memo}') && !content.includes('import memo')) {
    // Находим последний импорт из react
    const reactImportRegex = /import\s+.*?\s+from\s+['"]react['"];?/g;
    const reactImports = [...content.matchAll(reactImportRegex)];
    
    if (reactImports.length > 0) {
      const lastReactImport = reactImports[reactImports.length - 1][0];
      const lastReactImportIndex = content.lastIndexOf(lastReactImport);
      
      // Если импорт из React уже содержит фигурные скобки, добавляем memo внутрь
      if (lastReactImport.includes('{') && lastReactImport.includes('}')) {
        modified = modified.replace(
          lastReactImport,
          lastReactImport.replace(/}/, ', memo }')
        );
      } else {
        // Иначе добавляем новый импорт после существующего
        modified = modified.slice(0, lastReactImportIndex + lastReactImport.length) +
                  '\nimport { memo } from "react";' +
                  modified.slice(lastReactImportIndex + lastReactImport.length);
      }
    } else {
      // Если нет импортов из react, добавляем в начало файла
      modified = 'import { memo } from "react";\n' + modified;
    }
  }
  
  // Применяем мемоизацию в зависимости от стиля компонента
  if (exportDefaultMatch) {
    const componentName = exportDefaultMatch[1];
    modified = modified.replace(
      exportDefaultRegex,
      `function ${componentName}`
    );
    modified = modified.replace(
      new RegExp(`function\\s+${componentName}`),
      `function ${componentName}`
    );
    
    // Добавляем export default memo(ComponentName) в конец файла
    if (!modified.includes(`export default memo(${componentName})`)) {
      modified = modified + `\n\nexport default memo(${componentName});\n`;
      applied = true;
    }
  } else if (namedComponentMatch) {
    const componentName = namedComponentMatch[1];
    modified = modified.replace(
      new RegExp(`export\\s+default\\s+${componentName}`),
      `export default memo(${componentName})`
    );
    applied = true;
  } else if (arrowComponentMatch) {
    const componentName = arrowComponentMatch[1];
    modified = modified.replace(
      new RegExp(`export\\s+default\\s+${componentName}`),
      `export default memo(${componentName})`
    );
    applied = true;
  }
  
  return { content: modified, applied };
}

// Основная функция для оптимизации компонентов
async function optimizeComponents() {
  console.log('Начинаем оптимизацию React-компонентов...\n');
  
  // Поиск React компонентов
  const componentExtensions = ['.tsx', '.jsx'];
  let allComponents = [];
  
  for (const ext of componentExtensions) {
    allComponents = allComponents.concat(findFilesRecursively(srcPath, ext));
  }
  
  console.log(`Найдено ${allComponents.length} React компонентов для анализа`);
  
  // Фильтруем компоненты, которые нуждаются в оптимизации
  const components = allComponents.filter(needsOptimization);
  console.log(`Из них ${components.length} компонентов будут проанализированы на предмет оптимизации\n`);
  
  let optimizedCount = 0;
  const optimizedComponents = [];
  
  // Применяем оптимизации
  for (const component of components) {
    const relativePath = path.relative(projectPath, component);
    const content = fs.readFileSync(component, 'utf8');
    
    let modifications = 0;
    let modifiedContent = content;
    
    // Применяем мемоизацию компонента, если она включена
    if (CONFIG.optimizations.memoize) {
      const { content: memoizedContent, applied } = applyMemoization(modifiedContent);
      modifiedContent = memoizedContent;
      if (applied) {
        modifications++;
        console.log(`✅ Применена мемоизация к компоненту: ${relativePath}`);
      }
    }
    
    // Сохраняем изменения, если они были внесены
    if (modifications > 0) {
      optimizedComponents.push(relativePath);
      
      if (CONFIG.autoFix) {
        fs.writeFileSync(component, modifiedContent, 'utf8');
        optimizedCount++;
      } else {
        console.log(`   Изменения НЕ применены. Установите CONFIG.autoFix = true для автоматического применения`);
      }
    }
  }
  
  // Выводим итоговую статистику
  console.log('\n=== Итоговая статистика ===');
  console.log(`Проанализировано компонентов: ${components.length}`);
  console.log(`Компонентов, требующих оптимизации: ${optimizedComponents.length}`);
  
  if (CONFIG.autoFix) {
    console.log(`Автоматически оптимизировано: ${optimizedCount}`);
  } else {
    console.log('Изменения не были применены. Установите CONFIG.autoFix = true для автоматического применения');
  }
  
  console.log('\nСписок компонентов, требующих оптимизации:');
  optimizedComponents.forEach((comp, index) => {
    console.log(`${index + 1}. ${comp}`);
  });
  
  console.log('\nРекомендации по дальнейшей оптимизации:');
  console.log('1. Используйте useCallback для обработчиков событий');
  console.log('2. Используйте useMemo для кэширования вычисляемых значений');
  console.log('3. Разделите большие компоненты на более мелкие');
  console.log('4. Используйте React.memo для мемоизации компонентов');
  console.log('5. Оптимизируйте зависимости хуков useEffect и useMemo');
}

// Запуск функции оптимизации
optimizeComponents(); 