// Скрипт для проверки проблем с импортами и модулями
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Путь к директории проекта
const projectPath = path.resolve(__dirname, '../../');
const srcPath = path.join(projectPath, 'src');

console.log('Начинаем анализ проблем с импортами и модулями...\n');

// 1. Проверка на круговые зависимости
console.log('=== Проверка на круговые зависимости ===');
try {
  // Необходимо установить madge: npm install -g madge
  const output = execSync('npx madge --circular --extensions ts,tsx,js,jsx src', {
    cwd: projectPath,
    encoding: 'utf8'
  });

  if (output.trim()) {
    console.log('⚠️ Обнаружены круговые зависимости:');
    console.log(output);
  } else {
    console.log('✅ Круговых зависимостей не обнаружено');
  }
} catch (error) {
  if (error.stdout && error.stdout.includes('Found')) {
    console.log('⚠️ Обнаружены круговые зависимости:');
    console.log(error.stdout);
  } else {
    console.log('❌ Ошибка при проверке круговых зависимостей:');
    console.log(error.message);
    console.log('Убедитесь, что установлен пакет madge: npm install -g madge');
  }
}

// 2. Проверка корректности импортов TypeScript
console.log('\n=== Проверка корректности импортов TypeScript ===');
try {
  const output = execSync('npx tsc --noEmit', {
    cwd: projectPath,
    encoding: 'utf8'
  });
  console.log('✅ Ошибок компиляции TypeScript не обнаружено');
} catch (error) {
  console.log('⚠️ Обнаружены ошибки TypeScript:');
  // Извлекаем только ошибки, связанные с импортами
  const errorLines = error.stdout.split('\n');
  const importErrors = errorLines.filter(line => 
    line.includes('Cannot find module') || 
    line.includes('could not be resolved') ||
    line.includes('has no exported member')
  );
  
  if (importErrors.length > 0) {
    console.log('Ошибки импортов:');
    importErrors.forEach(line => console.log(line));
  } else {
    console.log('Ошибок импортов не обнаружено, но есть другие ошибки TypeScript');
  }
}

// 3. Поиск неиспользуемых файлов и компонентов
console.log('\n=== Поиск неиспользуемых файлов и компонентов ===');
try {
  // Получаем список всех файлов компонентов
  const findComponentsCmd = `find ${srcPath} -type f -name "*.tsx" -o -name "*.jsx"`;
  const componentFiles = execSync(findComponentsCmd, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
    
  console.log(`Всего найдено ${componentFiles.length} компонентов`);
  
  let unusedComponents = 0;
  
  for (const file of componentFiles) {
    const componentName = path.basename(file, path.extname(file));
    // Пропускаем файлы страниц и маршрутов Next.js
    if (file.includes('/pages/') || file.includes('/app/') || 
        file.includes('/page.tsx') || file.includes('/route.tsx')) {
      continue;
    }
    
    // Поиск импортов компонента в других файлах
    const grepCmd = `grep -r --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" "import.*${componentName}" ${srcPath}`;
    try {
      const grepResult = execSync(grepCmd, { encoding: 'utf8' });
      // Исключаем результаты из самого файла
      const otherFileImports = grepResult
        .split('\n')
        .filter(line => !line.includes(file) && line.trim());
      
      if (otherFileImports.length === 0) {
        console.log(`Потенциально неиспользуемый компонент: ${componentName} (${file})`);
        unusedComponents++;
      }
    } catch (e) {
      // grep не находит ничего - компонент не импортируется
      console.log(`Потенциально неиспользуемый компонент: ${componentName} (${file})`);
      unusedComponents++;
    }
  }
  
  if (unusedComponents === 0) {
    console.log('✅ Неиспользуемых компонентов не обнаружено');
  } else {
    console.log(`⚠️ Обнаружено ${unusedComponents} потенциально неиспользуемых компонентов`);
  }
} catch (error) {
  console.log('❌ Ошибка при поиске неиспользуемых компонентов:');
  console.log(error.message);
}

// 4. Проверка согласованности имен файлов и экспортируемых компонентов
console.log('\n=== Проверка согласованности имен файлов и компонентов ===');
try {
  const componentFiles = execSync(`find ${srcPath} -type f -name "*.tsx" -o -name "*.jsx"`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  
  let inconsistentNames = 0;
  
  for (const file of componentFiles) {
    const fileName = path.basename(file, path.extname(file));
    const content = fs.readFileSync(file, 'utf8');
    
    // Поиск определения компонента
    const componentDefRegex = /export\s+(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*)/g;
    const matches = [...content.matchAll(componentDefRegex)];
    
    if (matches.length > 0) {
      const componentNames = matches.map(match => match[1]);
      
      // Проверяем, соответствует ли хотя бы одно имя компонента имени файла
      const isConsistent = componentNames.some(name => 
        name.toLowerCase() === fileName.toLowerCase() ||
        name.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1) === fileName.toLowerCase()
      );
      
      if (!isConsistent) {
        console.log(`Несоответствие имени: файл ${fileName}, компонент(ы) ${componentNames.join(', ')}`);
        inconsistentNames++;
      }
    }
  }
  
  if (inconsistentNames === 0) {
    console.log('✅ Все имена файлов соответствуют именам компонентов');
  } else {
    console.log(`⚠️ Обнаружено ${inconsistentNames} несоответствий имен файлов и компонентов`);
  }
} catch (error) {
  console.log('❌ Ошибка при проверке согласованности имен:');
  console.log(error.message);
}

console.log('\nАнализ завершен. Рекомендации:');
console.log('1. Устраните круговые зависимости, реорганизовав структуру импортов');
console.log('2. Исправьте ошибки импортов, убедившись, что все модули доступны');
console.log('3. Удалите или обновите неиспользуемые компоненты');
console.log('4. Убедитесь, что имена файлов соответствуют экспортируемым компонентам'); 