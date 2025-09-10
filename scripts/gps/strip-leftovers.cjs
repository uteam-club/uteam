const fs = require('fs');
const path = require('path');

// Пути к файлам отчетов
const LEFT_IMPORTS = 'artifacts/purge-quarantine/leftover-imports.txt';
const LEFT_ROUTES = 'artifacts/purge-quarantine/leftover-routes.txt';
const STRIPPED_REPORT = 'artifacts/purge-quarantine/STRIPPED.json';
const LEFTOVER_AFTER_STRIP = 'artifacts/purge-quarantine/LEFTOVER_AFTER_STRIP.txt';

// Создаем папку для отчетов
const reportDir = 'artifacts/purge-quarantine';
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Читаем файлы с остатками
function readLeftoverFiles() {
  const files = new Set();
  
  // Читаем импорты
  if (fs.existsSync(LEFT_IMPORTS)) {
    const content = fs.readFileSync(LEFT_IMPORTS, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      const match = line.match(/^(\d+):(.+)$/);
      if (match) {
        files.add(match[2]);
      }
    });
  }
  
  // Читаем роуты
  if (fs.existsSync(LEFT_ROUTES)) {
    const content = fs.readFileSync(LEFT_ROUTES, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      const match = line.match(/^(\d+):(.+)$/);
      if (match) {
        files.add(match[2]);
      }
    });
  }
  
  return Array.from(files);
}

// Правила патчинга
const PATCH_RULES = [
  {
    name: 'GPS imports',
    regex: /^\s*import[^;]+from\s*['"]([^'"]*\bgps[-/].*|@\/components\/gps.*|@\/services\/gps.*|@\/app\/api\/gps.*)['"];?\s*$/gm,
    action: 'remove'
  },
  {
    name: 'GPS exports',
    regex: /^\s*export\s+(\*|\{[^}]+\})\s+from\s+['"][^'"]*\bgps[-/].*['"];?\s*$/gm,
    action: 'remove'
  },
  {
    name: 'JSX GPS links',
    regex: /<Link[^>]*href=['"][^'"]*\/gps[^'"]*['"][^>]*>[\s\S]*?<\/Link>|<a[^>]*href=['"][^'"]*\/gps[^'"]*['"][^>]*>[\s\S]*?<\/a>/g,
    action: 'remove'
  },
  {
    name: 'Navigation GPS items',
    regex: /\{[^{}]*?(href|to)\s*:\s*['"][^'"]*\/gps[^'"]*['"][^{}]*?\}/g,
    action: 'remove'
  }
];

// Проверяем, используется ли импорт в коде
function isImportUsed(content, importName) {
  // Простая эвристика - ищем использование имени в коде
  const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
  return usageRegex.test(content);
}

// Очищаем неиспользуемые импорты
function cleanUnusedImports(content) {
  const importRegex = /import\s+(\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  let cleaned = content;
  
  while ((match = importRegex.exec(content)) !== null) {
    const [fullMatch, imports, modulePath] = match;
    
    // Если это GPS модуль - пропускаем (уже удален)
    if (modulePath.includes('gps') || modulePath.includes('canon')) {
      continue;
    }
    
    // Извлекаем имена импортов
    const importNames = imports.match(/\w+/g) || [];
    
    // Проверяем использование каждого импорта
    const unusedImports = importNames.filter(name => !isImportUsed(cleaned, name));
    
    if (unusedImports.length === importNames.length) {
      // Все импорты не используются - удаляем строку
      cleaned = cleaned.replace(fullMatch, '');
    } else if (unusedImports.length > 0) {
      // Некоторые импорты не используются - обновляем строку
      const usedImports = importNames.filter(name => !unusedImports.includes(name));
      const newImport = `import { ${usedImports.join(', ')} } from '${modulePath}';`;
      cleaned = cleaned.replace(fullMatch, newImport);
    }
  }
  
  return cleaned;
}

// Применяем патчинг к файлу
function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { actions: ['file not found'], success: false };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const actions = [];
  
  // Применяем правила патчинга
  PATCH_RULES.forEach(rule => {
    const matches = content.match(rule.regex);
    if (matches) {
      content = content.replace(rule.regex, '');
      actions.push(`${rule.name}: removed ${matches.length} matches`);
    }
  });
  
  // Очищаем неиспользуемые импорты
  const beforeClean = content;
  content = cleanUnusedImports(content);
  if (content !== beforeClean) {
    actions.push('cleaned unused imports');
  }
  
  // Удаляем пустые строки и лишние пробелы
  content = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Проверяем, стал ли файл пустым или содержит только импорты/экспорты
  const nonImportExportLines = content
    .split('\n')
    .filter(line => !line.match(/^\s*(import|export)\s/));
  
  if (nonImportExportLines.length === 0) {
    // Файл содержит только импорты/экспорты - удаляем
    fs.unlinkSync(filePath);
    actions.push('file deleted (only imports/exports)');
    return { actions, success: true, deleted: true };
  }
  
  // Если файл изменился - сохраняем
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    actions.push('file patched');
  } else {
    actions.push('no changes needed');
  }
  
  return { actions, success: true, deleted: false };
}

// Перемещаем GPS тесты в legacy
function moveGpsTests(filePath) {
  if (!filePath.includes('__tests__') && !filePath.includes('.test.')) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('gps') || content.includes('GPS')) {
    const targetPath = filePath.replace('src/', 'legacy/gps-v1/');
    const targetDir = path.dirname(targetPath);
    
    fs.mkdirSync(targetDir, { recursive: true });
    fs.renameSync(filePath, targetPath);
    return true;
  }
  
  return false;
}

// Основная функция
function main() {
  console.log('🔍 Scanning for GPS leftovers...');
  
  const files = readLeftoverFiles();
  console.log(`📋 Found ${files.length} files with GPS references`);
  
  const stripped = [];
  let processed = 0;
  let deleted = 0;
  let moved = 0;
  
  files.forEach(filePath => {
    if (!filePath || filePath.includes('legacy/')) {
      return;
    }
    
    console.log(`🔧 Processing: ${filePath}`);
    
    // Сначала проверяем, не тест ли это
    if (moveGpsTests(filePath)) {
      stripped.push({
        path: filePath,
        actions: ['moved to legacy/gps-v1/'],
        success: true
      });
      moved++;
      return;
    }
    
    // Применяем патчинг
    const result = patchFile(filePath);
    stripped.push({
      path: filePath,
      actions: result.actions,
      success: result.success
    });
    
    if (result.deleted) {
      deleted++;
    }
    
    processed++;
  });
  
  // Сохраняем отчет
  fs.writeFileSync(STRIPPED_REPORT, JSON.stringify(stripped, null, 2));
  
  // Повторный поиск остатков
  console.log('🔍 Running final scan for remaining GPS references...');
  
  const finalScan = [];
  
  // Поиск импортов
  try {
    const { execSync } = require('child_process');
    const importResult = execSync('git ls-files | grep -n "from [\'\\"]@\\?/\\(src/\\)\\?\\(components\\|app\\|lib\\|services\\).*/gps" || true', { encoding: 'utf8' });
    if (importResult.trim()) {
      finalScan.push(...importResult.trim().split('\n'));
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  
  // Поиск роутов
  try {
    const { execSync } = require('child_process');
    const routeResult = execSync('git ls-files | grep -n "[\'\\"]/gps\\|/api/gps" || true', { encoding: 'utf8' });
    if (routeResult.trim()) {
      finalScan.push(...routeResult.trim().split('\n'));
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  
  fs.writeFileSync(LEFTOVER_AFTER_STRIP, finalScan.join('\n'));
  
  console.log('\n📊 Strip Summary:');
  console.log(`✅ Files processed: ${processed}`);
  console.log(`🗑️  Files deleted: ${deleted}`);
  console.log(`📦 Files moved to legacy: ${moved}`);
  console.log(`🔍 Remaining GPS references: ${finalScan.length}`);
  console.log(`📁 Reports saved to: ${reportDir}/`);
}

main();
