const fs = require('fs');
const path = require('path');

// Функция для замены console.log/error/warn в файле
function fixConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Добавляем импорт gpsLogger если его нет
  if (content.includes('console.') && !content.includes('gpsLogger')) {
    const importMatch = content.match(/import.*from ['"]@\/lib\/.*['"];?\s*\n/);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      content = content.slice(0, insertIndex) + 
                "import { gpsLogger } from '@/lib/logger';\n" + 
                content.slice(insertIndex);
    }
  }
  
  // Заменяем console.error на gpsLogger.error
  content = content.replace(
    /console\.error\(([^)]+)\)/g, 
    'gpsLogger.error(\'Component\', $1)'
  );
  
  // Заменяем console.warn на gpsLogger.warn
  content = content.replace(
    /console\.warn\(([^)]+)\)/g, 
    'gpsLogger.warn(\'Component\', $1)'
  );
  
  // Заменяем console.log на gpsLogger.info
  content = content.replace(
    /console\.log\(([^)]+)\)/g, 
    'gpsLogger.info(\'Component\', $1)'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed console logs in: ${filePath}`);
}

// Рекурсивно обходим папку components/gps
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixConsoleLogs(filePath);
    }
  });
}

// Запускаем исправление
walkDir('./src/components/gps');
console.log('Console logs fixed in all GPS components!');
