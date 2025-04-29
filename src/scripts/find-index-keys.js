// Скрипт для поиска компонентов, использующих индексы массивов как ключи
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Путь к директории проекта, которую нужно сканировать
const projectPath = path.resolve(__dirname, '../../');
const srcPath = path.join(projectPath, 'src');

// Паттерны для поиска проблемных мест
const patterns = [
  // Поиск key={index}
  'map\\(\\s*\\(\\s*[^)]*\\s*,\\s*index\\s*\\)\\s*=>.*key\\s*=\\s*{\\s*index\\s*}',
  
  // Поиск key={`string-${index}`}
  'map\\(\\s*\\(\\s*[^)]*\\s*,\\s*index\\s*\\)\\s*=>.*key\\s*=\\s*{\\s*`[^`]*\\$\\{\\s*index\\s*\\}[^`]*`\\s*}',
  
  // Поиск key={i}
  'map\\(\\s*\\([^,]*,\\s*i\\s*\\)\\s*=>.*key\\s*=\\s*{\\s*i\\s*}',
  
  // Поиск key={idx}
  'map\\(\\s*\\([^,]*,\\s*idx\\s*\\)\\s*=>.*key\\s*=\\s*{\\s*idx\\s*}'
];

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

// Ищем все файлы React компонентов
const fileExtensions = ['.tsx', '.jsx'];
let allFiles = [];

for (const ext of fileExtensions) {
  allFiles = allFiles.concat(findFilesRecursively(srcPath, ext));
}

console.log(`\nНайдено ${allFiles.length} файлов React компонентов для анализа`);

// Проверяем каждый файл на наличие проблемных паттернов
let problemsFound = 0;

console.log('\n--- Компоненты, использующие индексы массивов в качестве ключей ---\n');

for (const file of allFiles) {
  const relativePath = path.relative(projectPath, file);
  const content = fs.readFileSync(file, 'utf8');
  
  let fileHasProblems = false;
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'g');
    const matches = content.match(regex);
    
    if (matches && matches.length > 0) {
      if (!fileHasProblems) {
        console.log(`Файл: ${relativePath}`);
        fileHasProblems = true;
      }
      
      problemsFound += matches.length;
      console.log(`  - Найдено ${matches.length} проблемных мест с паттерном: ${pattern}`);
      
      // Найдем строки с проблемами, используя grep
      try {
        const grepCommand = `grep -n "${pattern}" "${file}"`;
        const grepOutput = execSync(grepCommand, { encoding: 'utf8' });
        
        // Вывод результатов grep
        const lines = grepOutput.split('\n').filter(Boolean);
        lines.forEach(line => {
          const lineNumber = line.split(':')[0];
          console.log(`    Строка ${lineNumber}: ${line.substring(line.indexOf(':') + 1)}`);
        });
      } catch (e) {
        // grep не нашел совпадений или произошла ошибка
      }
    }
  }
  
  if (fileHasProblems) {
    console.log(''); // Пустая строка для разделения
  }
}

console.log(`\nИтого: найдено ${problemsFound} потенциальных проблемных мест в коде\n`);

console.log('Рекомендации:');
console.log('1. Замените key={index} на key с уникальным идентификатором, например key={item.id}');
console.log('2. Если нет уникального ID, используйте комбинацию: key={`${someUniquePrefix}-${index}`}');
console.log('3. Для статических списков (которые не меняются) использование индекса допустимо\n'); 