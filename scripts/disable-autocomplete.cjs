#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для рекурсивного поиска файлов
function findFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Пропускаем служебные папки
        if (!['node_modules', 'dist', 'build', '.next', 'coverage', '__pycache__'].includes(item)) {
          files = files.concat(findFiles(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Не удалось прочитать директорию ${dir}: ${error.message}`);
  }
  
  return files;
}

// Функция для обработки одного файла
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    // Регулярное выражение для поиска Input компонентов без autoComplete
    const inputRegex = /<Input\s+([^>]*?)(?<!autoComplete\s*=\s*["'][^"']*["'])([^>]*?)>/g;
    
    // Более простое решение - ищем все <Input и проверяем каждый
    const inputMatches = content.match(/<Input[^>]*>/g);
    
    if (inputMatches) {
      for (const inputMatch of inputMatches) {
        // Проверяем, есть ли уже autoComplete
        if (!inputMatch.includes('autoComplete') && !inputMatch.includes('autoComplete=')) {
          // Заменяем > на autoComplete="off" >
          const newInput = inputMatch.replace(/>$/, ' autoComplete="off">');
          newContent = newContent.replace(inputMatch, newInput);
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Обновлен файл: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Ошибка при обработке файла ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция
function main() {
  console.log('🔍 Поиск файлов с Input компонентами...');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log(`📁 Найдено файлов: ${files.length}`);
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  files.forEach(file => {
    processedCount++;
    if (processFile(file)) {
      modifiedCount++;
    }
  });
  
  console.log('\n📊 Результаты:');
  console.log(`   Обработано файлов: ${processedCount}`);
  console.log(`   Изменено файлов: ${modifiedCount}`);
  console.log(`   Пропущено файлов: ${processedCount - modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log('\n✨ Автодополнение отключено для всех Input компонентов!');
  } else {
    console.log('\n💡 Изменений не требуется - все Input компоненты уже имеют autoComplete или не найдены.');
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { processFile };