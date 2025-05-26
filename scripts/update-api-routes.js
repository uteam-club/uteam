const fs = require('fs');
const path = require('path');

// Конфигурация для добавления в начало каждого файла роута
const routeConfig = `export const dynamic = 'force-dynamic';
export const revalidate = 0;

`;

// Функция для рекурсивного поиска файлов route.ts
function findRouteFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findRouteFiles(filePath));
    } else if (file === 'route.ts' || file === 'route.tsx') {
      results.push(filePath);
    }
  }
  
  return results;
}

// Функция для обновления файла роута
function updateRouteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Проверяем, есть ли уже конфигурация
  if (!content.includes("export const dynamic = 'force-dynamic'")) {
    // Находим первую пустую строку после импортов
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && !lines[i + 1]?.includes('import')) {
        insertIndex = i;
        break;
      }
    }
    
    // Вставляем конфигурацию
    lines.splice(insertIndex, 0, routeConfig);
    content = lines.join('\n');
    
    // Сохраняем обновленный файл
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

// Основная функция
function main() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const routeFiles = findRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files`);
  
  for (const file of routeFiles) {
    updateRouteFile(file);
  }
  
  console.log('All route files have been updated');
}

main(); 